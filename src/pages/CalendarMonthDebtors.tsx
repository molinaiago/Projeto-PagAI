import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Debtor, Payment } from '../types';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';

const EPS = 0.01;
const monthNamesFull = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function CalendarMonthDebtors() {
  const { year, month } = useParams<{ year: string; month: string }>();
  const y = Number(year);
  const mIndex = Number(month) - 1; // 0..11

  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [paidByDebtor, setPaidByDebtor] = useState<Record<string, number>>({});

  // carrega devedores do mês/ano (somente não deletados)
  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const start = new Date(y, mIndex, 1).getTime();
    const end   = new Date(y, mIndex + 1, 1).getTime() - 1;

    const qy = query(
      collection(db, 'debtors'),
      where('ownerUid', '==', uid),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end)
    );
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
      const visible = arr.filter(d => !d.deleted);
      visible.sort((a,b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setDebtors(visible);
    });
    return () => unsub();
  }, [y, mIndex]);

  // soma dos pagamentos (tempo real, ignora pagamentos deletados)
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    if (!debtors.length) {
      setPaidByDebtor({});
      return () => {};
    }
    debtors.forEach((d) => {
      const pref = collection(db, 'debtors', d.id!, 'payments');
      const unsub = onSnapshot(pref, (snap) => {
        let sum = 0;
        snap.forEach((pdoc) => {
          const p = pdoc.data() as Payment;
          if (!(p as any).deleted) sum += Number(p.amount || 0);
        });
        setPaidByDebtor((prev) => ({ ...prev, [d.id!]: sum }));
      });
      unsubs.push(unsub);
    });
    return () => { unsubs.forEach(u => u()); };
  }, [debtors]);

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />

        <main className="relative z-10 container-page py-8 md:py-10 flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="h1">
                {monthNamesFull[mIndex]} <span className="text-gradient">{y}</span>
              </h1>
              <p className="muted">Devedores cadastrados neste mês.</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/calendar/${y}`} className="btn-soft">Meses</Link>
              <Link to="/calendar" className="btn-soft">Anos</Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debtors.map((d) => {
              const paid = paidByDebtor[d.id!] ?? 0;
              const remaining = Math.max(0, (d.total || 0) - paid);
              const isSettled = remaining <= EPS;
              const progress = d.total > 0 ? Math.min(100, Math.round((paid / d.total) * 100)) : (isSettled ? 100 : 0);

              return (
                <Link key={d.id} to={`/debt/${d.id}`} className="card hover:shadow-[0_14px_35px_rgba(16,185,129,.14)] transition block">
                  <div className="card-body space-y-3 min-h-[160px]">
                    <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
                      <div className="min-w-0 max-w-[75%]">
                        <h3 className="text-lg font-semibold truncate">{d.name}</h3>
                        <p className="muted truncate">
                          Criado em {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="mb-1">
                          {isSettled ? (
                            <span className="chip bg-emerald-100 text-emerald-800 border-emerald-200">Quitado</span>
                          ) : (
                            <span className="chip bg-emerald-50 text-emerald-700 border-emerald-200">Pendente</span>
                          )}
                        </div>
                        <div className="text-2xl font-extrabold text-emerald-700 whitespace-nowrap">
                          R$ {remaining.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-emerald-100 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-lime-500" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                      <div className="truncate">Pago: <b>R$ {paid.toFixed(2)}</b></div>
                      <div className="text-right truncate">Total: <b>R$ {d.total.toFixed(2)}</b></div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {debtors.length === 0 && (
              <div className="muted">Nenhum devedor neste mês.</div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
