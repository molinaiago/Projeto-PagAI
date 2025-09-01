import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, updateDoc, where, doc } from 'firebase/firestore';
import type { Debtor } from '../types';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

function formatMoneyBR(n: number): string {
  return (Number(n) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Archived() {
  const [items, setItems] = useState<Debtor[]>([]);

  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const qy = query(collection(db, 'debtors'), where('ownerUid', '==', uid));
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      const archived = arr.filter(d => !d.deleted && d.archived);
      archived.sort((a,b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
      setItems(archived);
    });
    return () => unsub();
  }, []);

  async function unarchive(d: Debtor) {
    if (!d.id) return;
    await updateDoc(doc(db, 'debtors', d.id), { archived: false, archivedAt: null } as any);
  }

  async function softDelete(d: Debtor) {
    if (!d.id) return;
    const ok = confirm('Deseja excluir este devedor?');
    if (!ok) return;
    await updateDoc(doc(db, 'debtors', d.id), { deleted: true, deletedAt: Date.now() } as any);
  }

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />

        <main className="relative z-10 container-page py-8 md:py-10 flex-1 space-y-6">
          <div>
            <h1 className="h1">Arquivados</h1>
            <p className="muted">Devedores quitados e movidos para arquivo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {items.map((d) => (
              <div key={d.id} className="card">
                <div className="card-body px-6 md:px-8 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold truncate">{d.name}</h3>
                      <p className="muted truncate">
                        Criado em {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                      <p className="text-sm text-slate-700">Total: <b>R$ {formatMoneyBR(d.total)}</b></p>
                    </div>
                    <span className="chip bg-emerald-100 text-emerald-800 border-emerald-200">Quitado</span>
                  </div>

                  <div className="flex gap-2">
                    <Link to={`/debt/${d.id}`} className="btn-soft">Ver detalhes</Link>
                    <button onClick={() => unarchive(d)} className="btn-soft">Desarquivar</button>
                    <button onClick={() => softDelete(d)} className="btn-danger">Excluir</button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="muted">Nada por aqui ainda.</div>}
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
