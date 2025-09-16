// src/pages/Metrics.tsx
import { useEffect, useMemo, useState } from 'react';
import AuthGuard from '../components/AuthGuard';
import Navbar from '../components/Navbar';
import BackgroundFX from '../components/BackgroundFX';
import Footer from '../components/Footer';
import { auth, db } from '../lib/firebase';
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import type { Debtor, Payment } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatMoneyBR } from '../lib/money';

type ViewMode = 'total' | 'mensal';
type DebtorMap = Record<string, Debtor>;
type PaymentRow = Payment & { debtorId?: string };

const COLORS_BY_NAME: Record<string, string> = {
  'Pago': '#10b981',
  'Pendente': '#ef4444',
  'Devedores': '#3b82f6',
  'Recebido no mês': '#10b981',
};

const paymentMethodLabels: Record<string, string> = {
  pix: 'PIX',
  credito: 'Cartão de Crédito',
  debito: 'Cartão de Débito',
  dinheiro: 'Dinheiro',
  outros: 'Outros',
};

function monthRangeNow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

const SEP = ';';
function q(v: unknown) {
  if (v === null || v === undefined) return '""';
  return `"${String(v).replace(/"/g, '""')}"`;
}

export default function Metrics() {
  const [view, setView] = useState<ViewMode>('total');
  const [allDebtors, setAllDebtors] = useState<Debtor[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const debtorsQuery = query(collection(db, 'debtors'), where('ownerUid', '==', uid));
    const paymentsQuery = query(collectionGroup(db, 'payments'), where('ownerUid', '==', uid));

    const unsubDebtors = onSnapshot(debtorsQuery, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setAllDebtors(arr);
      setLoading(false);
    });

    const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
      const arr: PaymentRow[] = [];
      snap.forEach((doc) => {
        const pathParts = doc.ref.path.split('/');
        const debtorId = pathParts[1];
        arr.push({ id: doc.id, debtorId, ...(doc.data() as any) });
      });
      setAllPayments(arr);
    });

    return () => {
      unsubDebtors();
      unsubPayments();
    };
  }, []);

  const debtors = useMemo(() => allDebtors.filter((d) => !d.deleted && !d.archived), [allDebtors]);
  const debtorById: DebtorMap = useMemo(() => debtors.reduce((acc, d) => ({ ...acc, [d.id!]: d }), {}), [debtors]);

  const paymentsVisible = useMemo(() => {
    return allPayments.filter((p) => !p.deleted && debtorById[p.debtorId!]);
  }, [allPayments, debtorById]);

  const { start: mStart, end: mEnd } = monthRangeNow();
  
  const stats = useMemo(() => {
    const totalDevido = debtors.reduce((acc, d) => acc + Number(d.total || 0), 0);
    let pagoTotal = 0;
    let pagoMensal = 0;

    paymentsVisible.forEach(p => {
      const amount = Number(p.amount || 0);
      pagoTotal += amount;
      if (p.date >= mStart && p.date <= mEnd) {
        pagoMensal += amount;
      }
    });

    const pendente = Math.max(0, totalDevido - pagoTotal);
    return { totalDevedores: debtors.length, totalDevido, pagoTotal, pagoMensal, pendente };
  }, [debtors, paymentsVisible, mStart, mEnd]);

  const paymentsForView = useMemo(() => {
    if (view === 'total') return paymentsVisible;
    return paymentsVisible.filter((p) => p.date >= mStart && p.date <= mEnd);
  }, [view, paymentsVisible, mStart, mEnd]);

  const pieData = useMemo(() => {
    const data = view === 'total' ? [
      { name: 'Pago', value: stats.pagoTotal },
      { name: 'Pendente', value: stats.pendente },
    ] : [
      { name: 'Recebido no mês', value: stats.pagoMensal },
      { name: 'Pendente', value: stats.pendente },
    ];
    if (stats.totalDevedores > 0) {
      data.push({ name: 'Devedores', value: stats.totalDevedores });
    }
    return data;
  }, [view, stats]);
  
  const receivedByDebtor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of paymentsForView) {
      const did = p.debtorId as string;
      map[did] = (map[did] || 0) + (Number(p.amount) || 0);
    }
    const rows = Object.keys(map).map((did) => ({
      id: did,
      name: debtorById[did]?.name ?? '(Sem nome)',
      createdAt: debtorById[did]?.createdAt,
      value: map[did],
    })).sort((a, b) => b.value - a.value);
    return rows;
  }, [paymentsForView, debtorById]);

  function downloadCsv() {
    const header = ['DEVEDOR', 'TOTAL DEVIDO', 'CRIADO EM', 'VALOR PAGO', 'DATA PAGAMENTO', 'MÉTODO PAGAMENTO', 'OBSERVACAO'].join(SEP);
    const lines: string[] = [header];

    const byDebtor: Record<string, PaymentRow[]> = {};
    for (const p of paymentsVisible) {
      const did = p.debtorId as string;
      if (!byDebtor[did]) byDebtor[did] = [];
      byDebtor[did].push(p);
    }

    for (const d of debtors) {
      const plist = byDebtor[d.id!] || [];
      const createdBr = d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : '';
      const totalFmt = formatMoneyBR(Number(d.total));

      if (plist.length === 0) {
        lines.push([q(d.name), q(totalFmt), q(createdBr), '', '', '', ''].join(SEP));
      } else {
        for (const p of plist) {
          const payBr = p.date ? new Date(p.date).toLocaleString('pt-BR') : '';
          const valFmt = formatMoneyBR(Number(p.amount));
          
          let methodStr = '';
          if (p.paymentMethod) {
            methodStr = paymentMethodLabels[p.paymentMethod] || p.paymentMethod;
            if (p.paymentMethod === 'outros' && p.paymentMethodOther) {
              methodStr += `: ${p.paymentMethodOther}`;
            }
          }
          
          lines.push([
            q(d.name),
            q(totalFmt),
            q(createdBr),
            q(valFmt),
            q(payBr),
            q(methodStr),
            q(p.note ?? ''),
          ].join(SEP));
        }
      }
    }

    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planilha-devedores.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <AuthGuard>
      <div className="bg-app">
        <BackgroundFX />
        <Navbar />
        <main className="relative z-10 container-page py-8 md:py-10 flex-1 space-y-6">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="h1">Métricas</h1>
              <p className="muted">
                Visão {view === 'total' ? 'consolidada' : 'do mês atual'}.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-emerald-200 bg-white p-1">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    view === 'total' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-slate-700'
                  }`}
                  onClick={() => setView('total')}
                >
                  TOTAL
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-sm rounded-lg transition ${
                    view === 'mensal' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'text-slate-700'
                  }`}
                  onClick={() => setView('mensal')}
                >
                  MENSAL
                </button>
              </div>
              <button onClick={downloadCsv} className="btn-soft whitespace-nowrap">
                BAIXAR EM PLANILHA
              </button>
            </div>
          </div>

          {loading && (
            <div className="card">
              <div className="card-body text-center text-slate-500">
                Calculando métricas...
              </div>
            </div>
          )}

          {!loading && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card"><div className="card-body">
                  <div className="text-sm text-slate-600">Total de devedores</div>
                  <div className="text-2xl font-extrabold" style={{ color: COLORS_BY_NAME['Devedores'] }}>{stats.totalDevedores}</div>
                </div></div>
                <div className="card"><div className="card-body">
                  <div className="text-sm text-slate-600">Total devido</div>
                  <div className="text-2xl font-extrabold text-slate-800">R$ {formatMoneyBR(stats.totalDevido)}</div>
                </div></div>
                <div className="card"><div className="card-body">
                  <div className="text-sm text-slate-600">{view === 'mensal' ? 'Pago no mês' : 'Total pago'}</div>
                  <div className="text-2xl font-extrabold" style={{ color: COLORS_BY_NAME['Pago'] }}>
                    R$ {formatMoneyBR(view === 'mensal' ? stats.pagoMensal : stats.pagoTotal)}
                  </div>
                </div></div>
                <div className="card"><div className="card-body">
                  <div className="text-sm text-slate-600">Pendente (geral)</div>
                  <div className="text-2xl font-extrabold" style={{ color: COLORS_BY_NAME['Pendente'] }}>R$ {formatMoneyBR(stats.pendente)}</div>
                </div></div>
              </div>

              <div className="card">
                <div className="card-body" style={{ height: 380 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={120} dataKey="value">
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={COLORS_BY_NAME[entry.name]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: any, n: any) => n === 'Devedores' ? [v, n] : [`R$ ${formatMoneyBR(Number(v))}`, n]} />
                      <Legend formatter={(value) => (<span style={{ color: COLORS_BY_NAME[value] }}>{value}</span>) as any} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                      {view === 'mensal' ? 'Recebido no mês por devedor' : 'Recebido (acumulado) por devedor'}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-600 border-b">
                          <th className="py-2 pr-4">Devedor</th>
                          <th className="py-2 pr-4">Criado em</th>
                          <th className="py-2 text-right">
                            {view === 'mensal' ? 'Recebido no mês' : 'Recebido (ac.)'}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {receivedByDebtor.length === 0 && (
                          <tr><td colSpan={3} className="py-4 text-slate-500">Nenhum recebimento neste período.</td></tr>
                        )}
                        {receivedByDebtor.map((row) => (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="py-2 pr-4">{row.name}</td>
                            <td className="py-2 pr-4">{row.createdAt ? new Date(row.createdAt).toLocaleString('pt-BR') : '-'}</td>
                            <td className="py-2 text-right font-semibold text-emerald-700">R$ {formatMoneyBR(row.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {receivedByDebtor.length > 0 && (
                        <tfoot>
                          <tr>
                            <td className="py-2 pr-4 font-semibold">Total</td>
                            <td />
                            <td className="py-2 text-right font-extrabold text-emerald-700">
                              R$ {formatMoneyBR(receivedByDebtor.reduce((acc, r) => acc + r.value, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </AuthGuard>
  );
}