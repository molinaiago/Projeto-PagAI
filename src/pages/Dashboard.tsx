// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import type { Debtor } from '../types';
import { Link } from 'react-router-dom';
import { formatMoneyBR, parseAmountBR } from '../lib/money';

type PaidMap = Record<string, number>;
const EPS = 0.01;

export default function Dashboard() {
  const [items, setItems] = useState<Debtor[]>([]);
  const [name, setName] = useState('');
  const [total, setTotal] = useState(''); // string (aceita 3.000,50, 3000.50 etc)
  const [paidByDebtor, setPaidByDebtor] = useState<PaidMap>({});
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Carrega devedores (somente visíveis: !deleted && !archived)
  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const qy = query(collection(db, 'debtors'), where('ownerUid', '==', uid));
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach((docu) => arr.push({ id: docu.id, ...(docu.data() as any) }));
      const visible = arr
        .filter((d) => !d.deleted && !d.archived)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setItems(visible);
    });
    return () => unsub();
  }, []);

  // Soma de pagamentos por devedor (tempo real)
  useEffect(() => {
    const unsubs: Array<() => void> = [];
    if (!items.length) {
      setPaidByDebtor({});
      return () => {};
    }
    items.forEach((d) => {
      const pref = collection(db, 'debtors', d.id!, 'payments');
      const unsub = onSnapshot(pref, (snap) => {
        let sum = 0;
        snap.forEach((pdoc) => {
          const p = pdoc.data() as any;
          if (!p.deleted) sum += Number(p.amount || 0);
        });
        setPaidByDebtor((prev) => ({ ...prev, [d.id!]: sum }));
      });
      unsubs.push(unsub);
    });
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [items]);

  async function createDebtor(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setMsg(null);

    const uid = auth.currentUser!.uid;

    // Parse seguro para formatos BR/EN
    const totalNum = parseAmountBR(total);
    if (isNaN(totalNum)) {
      setMsg({ kind: 'err', text: 'Informe um valor válido (ex.: 1.000,50).' });
      return;
    }
    if (totalNum < 0) {
      setMsg({ kind: 'err', text: 'O total devido não pode ser negativo.' });
      return;
    }
    if (!name.trim()) {
      setMsg({ kind: 'err', text: 'Informe o nome do devedor.' });
      return;
    }

    try {
      setSaving(true);
      const payload: Debtor = {
        ownerUid: uid,
        name: name.trim(),
        total: Number(totalNum.toFixed(2)), // ✅ guarda como número (ex.: 3000)
        createdAt: Date.now(),
        deleted: false,
        archived: false,
      };
      await addDoc(collection(db, 'debtors'), payload as any);
      setName('');
      setTotal('');
      setMsg({ kind: 'ok', text: 'Devedor adicionado!' });
      window.setTimeout(() => setMsg(null), 1200);
    } catch (err: any) {
      console.error('[createDebtor] error =>', err);
      setMsg({ kind: 'err', text: 'Falha ao adicionar. Verifique sua conexão/permissões.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* título */}
      <div>
        <h1 className="h1">
          Seus <span className="text-gradient">devedores</span>
        </h1>
        <p className="muted mt-1">
          Controle <b>simples e rápido</b>
        </p>
      </div>

      {/* aviso */}
      {msg && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            msg.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* novo devedor */}
      <form onSubmit={createDebtor} className="card">
        <div className="card-body px-7 md:px-9 grid gap-5 md:grid-cols-[1.2fr_1fr_auto]">
          <input
            className="input !px-6 md:!px-7"
            placeholder="Nome do devedor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input !px-6 md:!px-7"
            type="text"
            inputMode="decimal"
            placeholder="Total devido (ex.: 1.000,50)"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            required
          />
          <button className="btn-primary px-7" disabled={saving}>
            {saving ? 'Adicionando…' : 'Adicionar'}
          </button>
        </div>
      </form>

      {/* grid: 1 coluna no mobile, 2 colunas do md pra cima */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {items.map((d) => {
          const paid = paidByDebtor[d.id!] ?? 0;
          const remainingRaw = (d.total || 0) - paid;
          const remaining = Math.max(0, remainingRaw);
          const isSettled = remaining <= EPS;
          const progress =
            d.total > 0
              ? Math.min(100, Math.round((paid / d.total) * 100))
              : isSettled
              ? 100
              : 0;

          return (
            <Link
              key={d.id}
              to={`/debt/${d.id}`}
              className="card hover:shadow-[0_14px_35px_rgba(16,185,129,.14)] transition block"
            >
              <div className="card-body px-6 md:px-8 space-y-4 min-h-[180px]">
                <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="min-w-0 max-w-[75%]">
                    <h3 className="text-lg md:text-xl font-semibold truncate">{d.name}</h3>
                    <p className="muted truncate">
                      Criado em {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="mb-1">
                      {isSettled ? (
                        <span className="chip bg-emerald-100 text-emerald-800 border-emerald-200">
                          Quitado
                        </span>
                      ) : (
                        <span className="chip bg-emerald-50 text-emerald-700 border-emerald-200">
                          Pendente
                        </span>
                      )}
                    </div>
                    <div className="text-2xl md:text-3xl font-extrabold text-emerald-700 whitespace-nowrap">
                      R$ {formatMoneyBR(remaining)}
                    </div>
                  </div>
                </div>

                <div className="w-full h-2.5 rounded-full bg-emerald-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-lime-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs md:text-sm text-slate-600">
                  <div className="truncate">
                    Pago: <b>R$ {formatMoneyBR(paid)}</b>
                  </div>
                  <div className="text-right truncate">
                    Total: <b>R$ {formatMoneyBR(d.total)}</b>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {items.length === 0 && <div className="muted">Nenhum devedor ainda.</div>}
      </div>
    </div>
  );
}
