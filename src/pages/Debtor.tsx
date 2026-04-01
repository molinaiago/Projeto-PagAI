import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, updateDoc
} from 'firebase/firestore';
import type { Debtor, Payment } from '../types';
import Footer from '../components/Footer';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import { formatMoneyBR, parseAmountBR } from '../lib/money';
import ConfirmModal from '../components/ConfirmModal';

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credito: 'Cartão de Crédito',
  debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro',
  outros: 'Outros',
};

function localDatetimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function Toast({ show, msg, color = 'emerald', onClose }: { show: boolean; msg: string; color?: 'emerald' | 'red'; onClose?: () => void }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className={`fixed z-[60] inset-x-3 bottom-4 md:inset-auto md:right-6
          md:bottom-6 transition-all duration-300
          ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        onClick={onClose}
        className={`w-full md:w-auto max-w-[680px] text-left
        ${color === 'emerald' ? 'bg-emerald-600 border-emerald-700' : 'bg-red-600 border-red-700'}
        text-white shadow-lg border
        px-4 py-3 md:px-4 md:py-2 rounded-xl
        text-[15px] md:text-sm leading-snug
        active:scale-[.99]`}
      >
        {msg}
      </button>
    </div>
  );
}

const EPS = 0.01;

export default function Debtor() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [amount, setAmount] = useState('');
  const initialLocalNowRef = useRef(localDatetimeNow());
  const [date, setDate] = useState<string>(initialLocalNowRef.current);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<Payment['paymentMethod']>('pix');
  const [otherMethod, setOtherMethod] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [toastOn, setToastOn] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<Payment | null>(null);

  function showToast(msg: string, ok = true, ms = 2000) {
    setToastMsg(msg);
    setToastOk(ok);
    setToastOn(true);
    setTimeout(() => setToastOn(false), ms);
  }

  useEffect(() => {
    if (!id) return;
    const dref = doc(db, 'debtors', id);
    const unsub1 = onSnapshot(dref, (snap) => {
      if (!snap.exists() || (snap.data() as Debtor).deleted) {
        setDebtor(null);
        nav('/');
        return;
      }
      setDebtor({ id: snap.id, ...snap.data() } as Debtor);
    });

    const pref = collection(db, 'debtors', id, 'payments');
    const qy = query(pref, orderBy('date', 'desc'));
    const unsub2 = onSnapshot(qy, (snap) => {
      const arr: Payment[] = [];
      snap.forEach((s) => {
        const p = s.data() as any;
        if (!p.deleted) arr.push({ id: s.id, ...p });
      });
      setPayments(arr);
    });

    return () => { unsub1(); unsub2(); };
  }, [id, nav]);

  const remaining = useMemo(() => {
    if (!debtor) return 0;
    const paid = payments.reduce((acc, p) => acc + ((p.paid ?? true) ? Number(p.amount) : 0), 0);
    return Math.max(0, (Number(debtor.total) || 0) - paid);
  }, [debtor, payments]);

  useEffect(() => {
    if (!debtor || debtor.archived) return;
    if (remaining <= EPS) {
      const archiveDebtor = async () => {
        try {
          await updateDoc(doc(db, 'debtors', debtor.id!), {
            archived: true,
            archivedAt: Date.now(),
          });
          showToast('Dívida quitada! Devedor arquivado.');
          setTimeout(() => nav('/quitados'), 1500);
        } catch {
          showToast("Erro ao arquivar devedor.", false);
        }
      };
      archiveDebtor();
    }
  }, [remaining, debtor, nav]);

  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [q, setQ] = useState('');

  const filteredPayments = useMemo(() => {
    return payments
      .filter(p => q ? p.note?.toLowerCase().includes(q.toLowerCase()) : true)
      .sort((a, b) => sort === 'desc' ? (b.date - a.date) : (a.date - b.date));
  }, [payments, q, sort]);

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !auth.currentUser || !debtor || debtor.archived) return;

    const amountNum = parseAmountBR(amount);
    if (isNaN(amountNum) || amountNum < 0 || (method === 'outros' && !otherMethod.trim())) {
      showToast('Dados do pagamento inválidos.', false);
      return;
    }

    setSaving(true);
    try {
      const uid = auth.currentUser.uid;
      const payload: Omit<Payment, 'id'> & { scheduled: boolean; paid: boolean } = {
        debtorId: id,
        ownerUid: uid,
        amount: Number(amountNum.toFixed(2)),
        date: new Date(date).getTime(),
        note: note?.trim() || null,
        createdAt: Date.now(),
        paymentMethod: method,
        paymentMethodOther: method === 'outros' ? otherMethod.trim() : null,
        scheduled,
        paid: !scheduled,
      };
      await addDoc(collection(db, 'debtors', id, 'payments'), payload as any);

      setAmount('');
      setNote('');
      setDate(localDatetimeNow());
      setMethod('pix');
      setOtherMethod('');
      setScheduled(false);
      showToast(scheduled ? 'Pagamento agendado!' : 'Pagamento adicionado!');
    } catch {
      showToast('Falha ao adicionar pagamento.', false);
    } finally {
      setSaving(false);
    }
  }

  async function togglePaid(p: Payment) {
    if (!id || !p.id) return;
    try {
      await updateDoc(doc(db, 'debtors', id, 'payments', p.id), { paid: !p.paid });
      showToast(`Pagamento ${!p.paid ? 'marcado como pago' : 'não pago'}.`);
    } catch {
      showToast('Falha ao atualizar pagamento.', false);
    }
  }

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        <main className="relative z-10 container-page py-8 md:py-10 flex-1">
          {!debtor ? (
            <div className="card"><div className="card-body">Carregando...</div></div>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-normal pb-0.5">
                    {debtor.name} <span className="align-middle text-sm text-slate-500 font-normal">Criado em: {new Date(debtor.createdAt).toLocaleDateString('pt-BR')}</span>
                  </h1>
                  <p className="text-sm text-slate-600 mt-3">
                    Total original: <b>R$ {formatMoneyBR(Number(debtor.total))}</b>
                    {debtor.archived && <span className="ml-2 chip bg-emerald-100 text-emerald-800 border-emerald-200">Arquivado</span>}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <a href="/#/" className="btn-soft">Voltar</a>
                  <button onClick={() => setIsDeleteModalOpen(true)} className="btn-danger">Excluir devedor</button>
                </div>
              </div>

              {/* Saldo */}
              <div className="card">
                <div className="card-body">
                  <div className="text-sm text-slate-600">Saldo atual</div>
                  <div className="text-3xl font-extrabold text-emerald-700">R$ {formatMoneyBR(remaining)}</div>
                </div>
              </div>

              {/* Form adicionar pagamento */}
              <form onSubmit={addPayment} className={`card ${debtor.archived ? 'opacity-60 pointer-events-none' : ''}`}>
                <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input className="input" type="text" inputMode="decimal" placeholder="Valor pago (ex.: 100,50)" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                  <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
                  <select className="input" value={method} onChange={(e) => setMethod(e.target.value as Payment['paymentMethod'])} required>
                    <option value="pix">PIX</option>
                    <option value="credito">Cartão de Crédito</option>
                    <option value="debito">Cartão de Débito</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="outros">Outros</option>
                  </select>
                  {method === 'outros' && <input className="input" placeholder="Especifique o método" value={otherMethod} onChange={(e) => setOtherMethod(e.target.value)} required />}
                  <input className="input md:col-span-2" placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  <label className="flex items-center gap-2 md:col-span-2">
                    <input type="checkbox" checked={scheduled} onChange={(e) => setScheduled(e.target.checked)} />
                    <span>Agendado</span>
                  </label>
                  <button type="submit" className="btn-primary md:col-span-2" disabled={saving}>
                    {saving ? 'Adicionando...' : scheduled ? 'Agendar Pagamento' : 'Adicionar Pagamento'}
                  </button>
                </div>
              </form>

              {/* Lista de pagamentos */}
              <div className="card">
                <div className="card-body">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="label">Ordenar:</span>
                      <select className="input !py-2 !px-3 !h-9" value={sort} onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}>
                        <option value="desc">Mais recentes</option>
                        <option value="asc">Mais antigos</option>
                      </select>
                    </div>
                    <input className="input md:max-w-xs" placeholder="Pesquisar observação" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>

                  <ul className="space-y-3">
                    {filteredPayments.map((p) => {
                      const isScheduled = p.scheduled ?? false;
                      const isPaid = p.paid ?? true;
                      return (
                        <li key={p.id} className={`flex flex-col border-b border-slate-200 pb-3 ${isScheduled ? 'bg-emerald-50 border-emerald-200 rounded-xl p-3' : ''}`}>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-lg">R$ {formatMoneyBR(Number(p.amount))}</div>
                              <div className="text-sm text-slate-600">{new Date(p.date).toLocaleString('pt-BR')}</div>
                              {p.paymentMethod && (
                                <div className="mt-1 text-xs inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 border border-emerald-200">
                                  {paymentMethodLabels[p.paymentMethod] || p.paymentMethod}
                                  {p.paymentMethod === 'outros' && p.paymentMethodOther && `: ${p.paymentMethodOther}`}
                                  {isScheduled && !isPaid && ' • Agendado'}
                                </div>
                              )}
                              {p.note && <div className="text-sm text-slate-700 mt-1">{p.note}</div>}
                            </div>
                            <button
                              type="button"
                              className="text-red-600 hover:text-red-700 underline shrink-0 ml-4"
                              onClick={() => { setConfirmDeletePayment(p); setIsDeleteModalOpen(true); }}
                            >
                              Excluir
                            </button>
                          </div>
                          {isScheduled && !isPaid && (
                            <button
                              type="button"
                              className="btn-primary mt-2 text-sm self-end"
                              onClick={() => togglePaid(p)}
                            >
                              Pago
                            </button>
                          )}
                        </li>
                      );
                    })}
                    {filteredPayments.length === 0 && <li className="text-sm text-slate-500">Sem pagamentos ainda.</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
        <Toast show={toastOn} msg={toastMsg} color={toastOk ? 'emerald' : 'red'} onClose={() => setToastOn(false)} />

        <ConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => { setIsDeleteModalOpen(false); setConfirmDeletePayment(null); }}
          onConfirm={async () => {
            if (!confirmDeletePayment || !debtor) return;
            try {
              await updateDoc(doc(db, 'debtors', debtor.id!, 'payments', confirmDeletePayment.id!), {
                deleted: true,
                deletedBy: auth.currentUser!.uid,
                deletedAt: Date.now(),
              });
              showToast('Pagamento excluído!');
            } catch {
              showToast('Falha ao excluir pagamento.', false);
            } finally {
              setIsDeleteModalOpen(false);
              setConfirmDeletePayment(null);
            }
          }}
          title="Excluir pagamento"
          confirmText="Sim, Excluir"
          confirmColor="danger"
        >
          <p>Você tem certeza que deseja excluir este pagamento? Esta ação não pode ser desfeita.</p>
        </ConfirmModal>
      </div>
    </AuthGuard>
  );
}
