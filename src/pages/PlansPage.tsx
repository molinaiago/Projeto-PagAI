// PlansPage.tsx - Versão corrigida
import { useState } from 'react';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle2 } from 'lucide-react';
import { getFunctions, httpsCallable } from "firebase/functions";
import PixPaymentModal from '../components/PixPaymentModal';

const plans = [
  { 
    name: 'Grátis', 
    id: 'free', 
    price: 'R$ 0', 
    description: 'Perfeito para começar e organizar suas primeiras dívidas.', 
    features: [ 
      'Até 3 devedores ativos', 
      'Histórico de pagamentos', 
      'Visão em calendário', 
      'Exclusão para liberar espaço', 
    ], 
    cta: 'Seu plano atual', 
  },
  { 
    name: 'PRO', 
    id: 'pro', 
    price: 'R$ 9,90', 
    priceSuffix: '/mês', 
    description: 'Tudo ilimitado. Ideal para quem precisa de controle total.', 
    features: [ 
      'Devedores ativos ilimitados', 
      'Acesso completo às Métricas', 
      'Histórico de pagamentos', 
      'Visão em calendário', 
      'Exportação de dados em CSV', 
    ], 
    cta: 'Fazer Upgrade', 
  },
];

export default function PlansPage() {
  const { userProfile } = useAuth();
  const currentPlanId = userProfile?.plan || 'free';

  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeBase64: string; paymentId: string } | null>(null);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);

  async function handleUpgradeClick() {
    setIsLoadingPayment(true);
    try {
      const functions = getFunctions();
      const createPixPayment = httpsCallable(functions, 'createPixPayment');
      
      const result = await createPixPayment();
      
      const data = result.data as { qrCode: string; qrCodeBase64: string; paymentId: string };
      
      setPixData(data);
      setIsPixModalOpen(true);

    } catch (error) {
      console.error("Erro ao gerar PIX:", error);
      alert("Não foi possível gerar o PIX. Tente novamente.");
    } finally {
      setIsLoadingPayment(false);
    }
  }

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        <main className="relative z-10 container-page py-8 md:py-10 flex-1">
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="h1">Nossos Planos</h1>
            <p className="muted mt-2">
              {currentPlanId === 'pro' 
                ? 'Você já é PRO! Aproveite todos os benefícios.' 
                : 'Escolha o plano que melhor se adapta às suas necessidades. Cancele quando quiser.'
              }
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`card relative ${plan.id === 'pro' ? 'card-glow-pro' : ''} ${currentPlanId === plan.id ? 'border-2 border-emerald-500' : ''}`}
              >
                <div className="card-body flex flex-col">
                  {currentPlanId === plan.id && (
                    <div className="text-xs font-bold text-white bg-emerald-600 rounded-full px-3 py-1 self-center absolute -top-4">
                      SEU PLANO ATUAL
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-center">
                    {plan.name === 'PRO' ? <span className="text-glow-pro">PRO</span> : plan.name}
                  </h2>
                  <p className="text-center text-slate-600 h-12">{plan.description}</p>
                  <div className="my-6 text-center">
                    <span className="text-5xl font-extrabold">{plan.price}</span>
                    {plan.priceSuffix && <span className="text-slate-500">{plan.priceSuffix}</span>}
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {plan.id === 'pro' ? (
                    <button
                      onClick={handleUpgradeClick}
                      className={`btn-primary ${currentPlanId === 'pro' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={currentPlanId === 'pro' || isLoadingPayment}
                    >
                      {isLoadingPayment ? 'Gerando PIX...' : (currentPlanId === 'pro' ? 'Plano Ativo' : 'Fazer Upgrade')}
                    </button>
                  ) : (
                    <button className="btn-soft" disabled>
                      {currentPlanId === 'free' ? 'Seu plano atual' : 'Plano Básico'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Seção extra para usuários PRO */}
          {currentPlanId === 'pro' && userProfile?.subscriptionExpiresAt && (
            <div className="mt-8 text-center">
              <div className="card max-w-md mx-auto">
                <div className="card-body">
                  <h3 className="font-semibold text-emerald-700">Status da Assinatura</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Válida até: {new Date(userProfile.subscriptionExpiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>

      {pixData && (
        <PixPaymentModal
          isOpen={isPixModalOpen}
          onClose={() => setIsPixModalOpen(false)}
          qrCode={pixData.qrCode}
          qrCodeBase64={pixData.qrCodeBase64}
          paymentId={pixData.paymentId}
        />
      )}
    </AuthGuard>
  );
}