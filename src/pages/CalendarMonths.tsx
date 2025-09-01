import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import type { Debtor } from '../types';

const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

export default function CalendarMonths() {
  const { year } = useParams<{ year: string }>();
  const y = Number(year);
  const [items, setItems] = useState<Debtor[]>([]);

  useEffect(() => {
    const uid = auth.currentUser!.uid;

    // carrega todos os devedores do ano selecionado
    const start = new Date(y, 0, 1).getTime();
    const end   = new Date(y + 1, 0, 1).getTime() - 1;
    const qy = query(
      collection(db, 'debtors'),
      where('ownerUid', '==', uid),
      where('createdAt', '>=', start),
      where('createdAt', '<=', end)
    );
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
      // ❗️Oculta devedores deletados
      setItems(arr.filter(d => !d.deleted));
    });
    return () => unsub();
  }, [y]);

  const monthsPresent = useMemo(() => {
    const set = new Set<number>();
    for (const d of items) set.add(new Date(d.createdAt).getMonth()); // 0..11
    return set;
  }, [items]);

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        <main className="relative z-10 container-page py-8 md:py-10 flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="h1">Calendário {y}</h1>
              <p className="muted">Meses com devedores cadastrados.</p>
            </div>
            <Link to="/calendar" className="btn-soft">Voltar</Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-4">
            {monthNames.map((mLabel, idx) => {
              const enabled = monthsPresent.has(idx);
              const path = `/calendar/${y}/${String(idx + 1).padStart(2, '0')}`;
              return enabled ? (
                <Link key={idx} to={path} className="card hover:shadow-[0_14px_35px_rgba(16,185,129,.14)]">
                  <div className="card-body flex items-center justify-center h-24">
                    <div className="text-xl font-bold text-emerald-700">{mLabel}</div>
                  </div>
                </Link>
              ) : (
                <div key={idx} className="card opacity-60">
                  <div className="card-body flex items-center justify-center h-24">
                    <div className="text-xl font-semibold text-slate-400">{mLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
