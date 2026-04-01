import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, updateDoc, where, doc } from 'firebase/firestore';
import type { Debtor } from '../types';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { formatMoneyBR } from '../lib/money';
import ConfirmModal from '../components/ConfirmModal';

export default function Quitados() {
  const [items, setItems] = useState<Debtor[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);

  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const qy = query(collection(db, 'debtors'), where('ownerUid', '==', uid), where('archived', '==', true));
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      const visible = arr.filter(d => !d.deleted);
      visible.sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0));
      setItems(visible);
    });
    return () => unsub();
  }, []);

  const handleDeleteClick = (d: Debtor) => {
    setSelectedDebtor(d);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedDebtor) return;

    await updateDoc(doc(db, 'debtors', selectedDebtor.id!), { 
        deleted: true, 
        deletedAt: Date.now(),
        deletedBy: auth.currentUser!.uid 
    });

    setIsDeleteModalOpen(false);
    setSelectedDebtor(null);
  };

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        <main className="relative z-10 container-page py-8 md:py-10 flex-1 space-y-6">
          <div>
            <h1 className="h1">Devedores Quitados</h1>
            <p className="muted">Histórico de devedores que já quitaram suas dívidas.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {items.map((d) => (
              <div key={d.id} className="card">
                <div className="card-body px-6 md:px-8 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg md:text-xl font-semibold truncate">{d.name}</h3>
                      <p className="muted truncate">
                        Quitado em {d.archivedAt ? new Date(d.archivedAt).toLocaleDateString('pt-BR') : '-'}
                      </p>
                      <p className="text-sm text-slate-700">Valor Original: <b>R$ {formatMoneyBR(d.total)}</b></p>
                    </div>
                    <span className="chip bg-emerald-100 text-emerald-800 border-emerald-200">Quitado</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/debt/${d.id}`} className="btn-soft">Ver Histórico</Link>
                    <button onClick={() => handleDeleteClick(d)} className="btn-danger">Excluir</button>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="muted text-center py-8">Nenhum devedor quitado ainda.</div>}
          </div>
        </main>
        <Footer />
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title={`Excluir ${selectedDebtor?.name}`}
        confirmText="Sim, Excluir"
        confirmColor="danger"
      >
        <p>Você tem certeza que deseja excluir este devedor permanentemente? Esta ação não pode ser desfeita.</p>
      </ConfirmModal>
    </AuthGuard>
  );
}