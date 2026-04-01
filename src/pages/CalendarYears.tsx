import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Debtor } from '../types';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

export default function CalendarYears() {
  const [items, setItems] = useState<Debtor[]>([]);

  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const qy = query(collection(db, 'debtors'), where('ownerUid', '==', uid));
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
      // ❗️Oculta devedores deletados
      setItems(arr.filter(d => !d.deleted));
    });
    return () => unsub();
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const d of items) {
      if (!d.createdAt) continue;
      set.add(new Date(d.createdAt).getFullYear());
    }
    return Array.from(set).sort((a, b) => b - a); // desc
  }, [items]);

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        <main className="relative z-10 container-page py-8 md:py-10 flex-1 space-y-6">
          <div>
            <h1 className="h1">Calendário</h1>
            <p className="muted">Selecione um ano com devedores cadastrados.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {years.map((y) => (
              <Link key={y} to={`/calendar/${y}`} className="card hover:shadow-[0_14px_35px_rgba(16,185,129,.14)]">
                <div className="card-body flex items-center justify-center h-28">
                  <div className="text-3xl font-extrabold text-emerald-700">{y}</div>
                </div>
              </Link>
            ))}
            {years.length === 0 && (
              <div className="muted">Nenhum registro encontrado.</div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}
