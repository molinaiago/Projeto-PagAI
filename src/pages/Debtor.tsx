// src/pages/DebtorPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import {
  addDoc, collection, doc, onSnapshot, orderBy, query, runTransaction, updateDoc
} from 'firebase/firestore';
import type { Debtor, Payment } from '../types';
import Footer from '../components/Footer';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import { FirebaseError } from 'firebase/app';
import { formatMoneyBR, parseAmountBR } from '../lib/money';

// Mapeamento para exibir nomes amigáveis na UI
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

function Toast({
  show,
  msg,
  color = 'emerald',
  onClose,
}: {
  show: boolean;
  msg: string;
  color?: 'emerald' | 'red';
  onClose?: () => void;
}) {
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

export default function DebtorPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [debtor, setDebtor] = useState<Debtor | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  // States do Formulário
  const [amount, setAmount] = useState('');
  const initialLocalNowRef = useRef(localDatetimeNow());
  const [date, setDate] = useState<string>(initialLocalNowRef.current);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState<Payment['paymentMethod']>('pix');
  const [otherMethod, setOtherMethod] = useState('');

  // toasts
  const [toastMsg, setToastMsg] = useState('');
  const [toastOk, setToastOk] = useState(true);
  const [toastOn, setToastOn] = useState(false);
  function showToast(msg: string, ok = true, ms = 1400) {
    setToastMsg(msg);
    setToastOk(ok);
    setToastOn(true);
    window.setTimeout(() => setToastOn(false), ms);
  }

  // carrega devedor + pagamentos (e redireciona se estiver deletado)
  useEffect(() => {
    if (!id) return;
    const dref = doc(db, 'debtors', id);
    const unsub1 = onSnapshot(dref, (snap) => {
      if (!snap.exists()) { setDebtor(null); return; }
      const data = snap.data() as any;

      if (data.deleted) {
        showToast('Devedor deletado');
        setTimeout(() => nav('/'), 600);
        return;
      }

      setDebtor({ id: snap.id, ...data });
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
    const paid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    return Math.max(0, (Number(debtor.total) || 0) - paid);
  }, [debtor, payments]);

  const [sort, setSort] = useState<'desc' | 'asc'>('desc');
  const [q, setQ] = useState('');

  const dateMs = (p: Payment) => {
    const v: any = (p as any).date;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const filteredPayments = useMemo(() => {
    const list = payments
      .filter((p) =>
        q ? (p.note?.toLowerCase().includes(q.toLowerCase())) : true
      )
      .slice()
      .sort((a, b) => {
        const da = dateMs(a);
        const db = dateMs(b);
        return sort === 'desc' ? (db - da) : (da - db);
      });
    return list;
  }, [payments, q, sort]);

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !auth.currentUser) return;

    const amountNum = parseAmountBR(amount);
    if (isNaN(amountNum) || amountNum < 0) {
      showToast('Valor inválido.', false);
      return;
    }
    if (method === 'outros' && !otherMethod.trim()) {
      showToast('Especifique o método de pagamento.', false);
      return;
    }

    try {
      setSaving(true);
      let dateStr = date;
      if (date === initialLocalNowRef.current) {
        dateStr = localDatetimeNow();
      }
      const when = new Date(dateStr);
      if (isNaN(when.getTime())) {
        showToast('Data inválida.', false);
        setSaving(false);
        return;
      }

      const uid = auth.currentUser.uid;
      const payload: Omit<Payment, 'id'> = {
        debtorId: id,
        ownerUid: uid,
        amount: Number(amountNum.toFixed(2)),
        date: when.getTime(),
        note: note?.trim() || null,
        createdAt: Date.now(),
        paymentMethod: method,
        paymentMethodOther: method === 'outros' ? otherMethod.trim() : null,
      };

      await addDoc(collection(db, 'debtors', id, 'payments'), payload as any);

      setAmount('');
      setNote('');
      const freshNow = localDatetimeNow();
      initialLocalNowRef.current = freshNow;
      setDate(freshNow);
      setMethod('pix');
      setOtherMethod('');
      setSort('desc');
      showToast('Pagamento adicionado!');
    } catch (err: any) {
      console.error('[addPayment] error =>', err);
      const msg = err instanceof FirebaseError ? `${(err as FirebaseError).code}` : 'erro inesperado';
      showToast(`Falha ao adicionar (${msg}).`, false);
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(p: Payment) {
    if (!id || !p?.id) return;
    const ok = confirm('Excluir este pagamento?');
    if (!ok) return;

    try {
      await runTransaction(db, async (trx) => {
        const pref = doc(db, 'debtors', id, 'payments', p.id!);
        const snap = await trx.get(pref);
        if (!snap.exists()) throw new Error('Pagamento não encontrado.');
        trx.update(pref, { deleted: true, deletedBy: auth.currentUser!.uid, deletedAt: Date.now() });
      });

      try {
        const lref = collection(db, 'logs');
        await addDoc(lref, {
          type: 'payment_delete',
          debtorId: id,
          paymentId: p.id,
          actor: auth.currentUser!.uid,
          amount: p.amount,
          at: Date.now(),
        } as any);
      } catch (e) {
        console.warn('[logs] falha ao registrar, mas pagamento foi excluído.', e);
      }

      showToast('Pagamento excluído!');
    } catch (err: any) {
      console.error('[deletePayment] error =>', err);
      const msg = err instanceof FirebaseError ? `${(err as FirebaseError).code}` : 'erro inesperado';
      showToast(`Falha ao excluir (${msg}).`, false);
    }
  }

  async function softDeleteDebtor() {
    if (!id || !debtor) return;
    const ok = confirm('Tem certeza que deseja excluir (arquivar) este devedor?');
    if (!ok) return;
    try {
      const uid = auth.currentUser!.uid;
      await updateDoc(doc(db, 'debtors', id), {
        deleted: true,
        deletedAt: Date.now(),
        deletedBy: uid,
      } as any);

      try {
        const lref = collection(db, 'logs');
        await addDoc(lref, {
          type: 'debtor_delete',
          debtorId: id,
          actor: uid,
          at: Date.now(),
        } as any);
      } catch (e) {
        console.warn('[logs] falha ao registrar, mas devedor foi deletado.', e);
      }
    } catch (err: any) {
      console.error('[softDeleteDebtor] error =>', err);
      const msg = err instanceof FirebaseError ? `${(err as FirebaseError).code}` : 'erro inesperado';
      showToast(`Falha ao excluir devedor (${msg}).`, false);
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
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-normal pb-0.5">
                    <span className="whitespace-normal break-words align-middle">{debtor.name}</span>{' '}
                    <span className="align-middle text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500">• PagAÍ</span>{' '}
                    <span className="align-middle text-sm text-slate-500 font-normal">
                      Criado em: {new Date(debtor.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </h1>
                  <p className="text-sm text-slate-600 mt-3">
                    Total original: <b>R$ {formatMoneyBR(Number(debtor.total))}</b>
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <a href="/#/" className="btn-soft">Voltar</a>
                  <button onClick={softDeleteDebtor} className="btn-danger">Excluir devedor</button>
                </div>
              </div>

              <div className="card">
                <div className="card-body flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-600">Saldo atual</div>
                    <div className="text-3xl font-extrabold text-emerald-700">R$ {formatMoneyBR(remaining)}</div>
                  </div>
                </div>
              </div>

              <form onSubmit={addPayment} className="card">
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
                  
                  {method === 'outros' && (
                    <input className="input" placeholder="Especifique o método" value={otherMethod} onChange={(e) => setOtherMethod(e.target.value)} required />
                  )}

                  <input className="input md:col-span-2" placeholder="Observação (opcional)" value={note} onChange={(e) => setNote(e.target.value)} />
                  
                  <button type="submit" className="btn-primary md:col-span-2" disabled={saving}>
                    {saving ? 'Adicionando...' : 'Adicionar Pagamento'}
                  </button>
                </div>
              </form>

              <div className="card">
                <div className="card-body">
                  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="label">Ordenar:</span>
                      <select
                        className="input !py-2 !px-3 !h-9"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as 'asc' | 'desc')}
                      >
                        <option value="desc">Mais recentes</option>
                        <option value="asc">Mais antigos</option>
                      </select>
                    </div>
                    <input
                      className="input md:max-w-xs"
                      placeholder="Pesquisar observação"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                    />
                  </div>

                  <ul className="space-y-3">
                    {filteredPayments.map((p) => (
                      <li key={p.id} className="flex items-start justify-between border-b border-slate-200 pb-3">
                        <div>
                          <div className="font-semibold text-lg">R$ {formatMoneyBR(Number(p.amount))}</div>
                          <div className="text-sm text-slate-600">{new Date(dateMs(p)).toLocaleString('pt-BR')}</div>
                          
                          {p.paymentMethod && (
                            <div className="mt-1 text-xs inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-200">
                              {paymentMethodLabels[p.paymentMethod] || p.paymentMethod}
                              {p.paymentMethod === 'outros' && p.paymentMethodOther && `: ${p.paymentMethodOther}`}
                            </div>
                          )}

                          {p.note && <div className="text-sm text-slate-700 mt-1 italic">"{p.note}"</div>}
                        </div>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-700 underline shrink-0 ml-4"
                          onClick={() => deletePayment(p)}
                        >
                          Excluir
                        </button>
                      </li>
                    ))}
                    {filteredPayments.length === 0 && <li className="text-sm text-slate-500">Sem pagamentos ainda.</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer />
        <Toast
          show={toastOn}
          msg={toastMsg}
          color={toastOk ? 'emerald' : 'red'}
          onClose={() => setToastOn(false)}
        />
      </div>
    </AuthGuard>
  );
}