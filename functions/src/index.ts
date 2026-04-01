import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

admin.initializeApp();
const firestore = admin.firestore();

// ==================== CONTADOR DE DEVEDORES ====================
exports.onDebtorCreated = onDocumentCreated("debtors/{debtorId}", async (event) => {
  const data = event.data?.data();
  if (!data?.ownerUid) return null;

  const userRef = firestore.collection("users").doc(data.ownerUid);
  logger.info("Devedor criado para usuário: " + data.ownerUid);

  return userRef.update({ debtorsCount: admin.firestore.FieldValue.increment(1) });
});

exports.onDebtorDeleted = onDocumentDeleted("debtors/{debtorId}", async (event) => {
  const data = event.data?.data();
  if (!data?.ownerUid) return null;

  const ownerUid = data.ownerUid;
  const userRef = firestore.collection("users").doc(ownerUid);
  await userRef.update({ debtorsCount: admin.firestore.FieldValue.increment(-1) });

  logger.info("Devedor removido: " + event.params.debtorId);

  const paymentsRef = firestore.collection("debtors").doc(event.params.debtorId).collection("payments");
  await deleteCollection(paymentsRef, 500);

  return null;
});

// ==================== CRIAR PAGAMENTO PIX COM POLLING ====================
exports.createPixPayment = onCall({
  secrets: ["MERCADOPAGO_ACCESSTOKEN"],
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Você precisa estar logado.");

  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;
  if (!userEmail) throw new HttpsError("failed-precondition", "Sua conta não possui um e-mail válido.");

  const accessToken = process.env.MERCADOPAGO_ACCESSTOKEN;
  if (!accessToken) throw new HttpsError("internal", "API Key do Mercado Pago não configurada.");

  const paymentData = {
    transaction_amount: 9.90,
    description: "Assinatura Plano PRO - PagAI",
    payment_method_id: "pix",
    payer: { email: userEmail },
    external_reference: userId,
  };

  const idempotencyKey = uuidv4();

  try {
    const response = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      paymentData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        timeout: 15000,
      }
    );

    const transactionData = response.data.point_of_interaction?.transaction_data;
    if (!transactionData?.qr_code) throw new HttpsError("internal", "Resposta do Mercado Pago incompleta.");

    const paymentId = response.data.id;

    // Dispara o polling interno para atualizar o plano do usuário automaticamente
    pollPaymentStatus(paymentId, userId);

    return {
      qrCodeBase64: transactionData.qr_code_base_64,
      qrCode: transactionData.qr_code,
      paymentId,
    };

  } catch (error: any) {
    logger.error("Erro ao criar pagamento PIX", { message: error.message, response: error.response?.data });
    throw new HttpsError("internal", "Não foi possível gerar o pagamento PIX.");
  }
});

// ==================== FUNÇÃO DE POLLING ====================
async function pollPaymentStatus(paymentId: string, userId: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESSTOKEN;
  if (!accessToken) return;

  const maxAttempts = 10; // 5 minutos / 30s = 10 tentativas
  const intervalMs = 30_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const resp = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const payment = resp.data;

      if (payment.status === "approved" && payment.transaction_amount === 9.90) {
        const userRef = firestore.collection("users").doc(userId);
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);

        await userRef.set({
          plan: "pro",
          subscriptionStatus: "active",
          subscriptionExpiresAt: expirationDate.getTime(),
          mercadoPagoPaymentId: paymentId,
        }, { merge: true });

        logger.info(`Usuário ${userId} atualizado para PRO!`);
        return;
      }
    } catch (err: any) {
      logger.warn(`Polling attempt ${attempt + 1} falhou: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, intervalMs));
  }

  logger.warn(`Polling do pagamento ${paymentId} expirou sem confirmação.`);
}

// ==================== FUNÇÃO DE CHECK DE ASSINATURAS ====================
exports.checkSubscriptionExpirations = onSchedule("every 24 hours", async () => {
  logger.info("checkSubscriptionExpirations rodando...");

  const usersRef = firestore.collection("users");
  const now = Date.now();

  const snapshot = await usersRef.where("plan", "==", "pro").get();

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.subscriptionExpiresAt) continue;

    if (data.subscriptionExpiresAt <= now) {
      await doc.ref.set({
        plan: "free",
        subscriptionStatus: "inactive",
        subscriptionExpiresAt: null,
        mercadoPagoPaymentId: null,
      }, { merge: true });

      logger.info(`Usuário ${doc.id} teve a assinatura expirada e foi revertido para FREE.`);
    }
  }
});

// ==================== FUNÇÃO AUXILIAR ====================
async function deleteCollection(collectionRef: admin.firestore.CollectionReference, batchSize: number): Promise<void> {
  const query = collectionRef.orderBy("__name__").limit(batchSize);
  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: admin.firestore.Query, resolve: () => void): Promise<void> {
  const snapshot = await query.get();
  if (snapshot.size === 0) return resolve();

  const batch = firestore.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  process.nextTick(() => deleteQueryBatch(query, resolve));
}
