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
type PaymentRow = Payment & { debtorId?: string; ownerUid?: string };

const COLORS_BY_NAME: Record<string, string> = {
  Pago: '#10b981',      // verde forte
  Pendente: '#ef4444',  // vermelho
  Devedores: '#3b82f6', // azul
};

function monthRangeNow() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();      // 00:00 local
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - 1; // 23:59:59 do último dia
  return { start, end };
}

const SEP = ';';
function q(v: unknown) {
  if (v === null || v === undefined) return '';
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

export default function Metrics() {
  const [view, setView] = useState<ViewMode>('total');
  const [allDebtors, setAllDebtors] = useState<Debtor[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRow[]>([]);

  // Devedores (em tempo real)
  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const dq = query(collection(db, 'debtors'), where('ownerUid', '==', uid));
    const unsub = onSnapshot(dq, (snap) => {
      const arr: Debtor[] = [];
      snap.forEach((d) => arr.push({ id: d.id, ...(d.data() as any) }));
      setAllDebtors(arr);
    });
    return () => unsub();
  }, []);

  // Pagamentos (em tempo real) via collectionGroup
  useEffect(() => {
    const uid = auth.currentUser!.uid;
    const pq = query(
      collectionGroup(db, 'payments'),
      where('ownerUid', '==', uid)
    );
    const unsub = onSnapshot(pq, (snap) => {
      const arr: PaymentRow[] = [];
      snap.forEach((doc) => {
        const data = doc.data() as any;
        // doc.ref.path: "debtors/{debtorId}/payments/{paymentId}"
        const pathParts = doc.ref.path.split('/');
        const debtorId = pathParts[1]; // index 0=debtors, 1={id}, 2=payments, 3={payId}
        arr.push({ id: doc.id, debtorId, ...data });
      });
      setAllPayments(arr);
    });
    return () => unsub();
  }, []);

  // Filtra itens visíveis
    const debtors = useMemo(
      () => allDebtors.filter(d => !d.deleted && !d.archived),
      [allDebtors]
    );


  const debtorById: DebtorMap = useMemo(() => {
    const map: DebtorMap = {};
    for (const d of debtors) map[d.id!] = d;
    return map;
  }, [debtors]);

  // Pagamentos visíveis (só dos devedores não deletados e não soft-deleted)
  const paymentsVisible = useMemo(() => {
    return allPayments.filter((p) => {
      if ((p as any).deleted) return false;
      const did = (p as any).debtorId;
      if (!did) return false;
      return Boolean(debtorById[did]);
    });
  }, [allPayments, debtorById]);

  // Aplica visão (total ou mensal) para os pagamentos
  const paymentsForView = useMemo(() => {
    if (view === 'total') return paymentsVisible;
    const { start, end } = monthRangeNow();
    return paymentsVisible.filter((p) => {
      const t = Number(p.date || 0);
      return t >= start && t <= end;
    });
  }, [view, paymentsVisible]);

  // Totais
  const stats = useMemo(() => {
    const totalDevedores = debtors.length;
    const totalDevido = debtors.reduce((acc, d) => acc + (Number(d.total) || 0), 0);
    const totalPago = paymentsForView.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

    // Para "total", o pendente é sobre TODOS os pagamentos feitos até agora
    // Para "mensal", o pendente ainda é melhor visto em "total"; mas aqui vamos manter a coerência:
    //   - Pago = recebido no recorte (mensal/total)
    //   - Pendente = totalDevido - pagoTotalAcumulado (mais fiel)
    // Para não confundir usuário, vamos calcular PENDENTE com *todos* pagamentos (não só do mês).
    const pagoAcumulado = paymentsVisible.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    const pendente = Math.max(0, totalDevido - pagoAcumulado);

    return { totalDevedores, totalDevido, totalPago, pendente };
  }, [debtors, paymentsForView, paymentsVisible]);

  // Dados do gráfico
  const pieData = [
    { name: 'Pago', value: stats.totalPago },
    { name: 'Pendente', value: stats.pendente },
    { name: 'Devedores', value: stats.totalDevedores },
  ];

  // Tabela "Recebido no mês por devedor" (se view = 'mensal'); se view = 'total', vira "Recebido por devedor (acumulado)"
  const receivedByDebtor = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of paymentsForView) {
      const did = (p as any).debtorId as string;
      if (!did) continue;
      map[did] = (map[did] || 0) + (Number(p.amount) || 0);
    }
    // transforma em array com nome
    const rows = Object.keys(map).map((did) => ({
      id: did,
      name: debtorById[did]?.name ?? '(Sem nome)',
      createdAt: debtorById[did]?.createdAt,
      value: map[did],
    }));
    // ordena por valor desc
    rows.sort((a, b) => b.value - a.value);
    return rows;
  }, [paymentsForView, debtorById]);

  // CSV: apenas itens visíveis (devedores + pagamentos visíveis)
  function downloadCsv() {
    const header = ['DEVEDOR', 'TOTAL DEVIDO', 'CRIADO EM', 'VALOR PAGO', 'DATA PAGAMENTO', 'OBSERVACAO'].join(SEP);
    const lines: string[] = [header];

    // Agrupa pagamentos por devedor
    const byDebtor: Record<string, PaymentRow[]> = {};
    for (const p of paymentsVisible) {
      const did = (p as any).debtorId as string;
      if (!byDebtor[did]) byDebtor[did] = [];
      byDebtor[did].push(p);
    }

    for (const d of debtors) {
      const plist = byDebtor[d.id!] || [];
      const createdBr = d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : '';
      const totalFmt = formatMoneyBR(Number(d.total));

      if (plist.length === 0) {
        lines.push([q(d.name), q(totalFmt), q(createdBr), '', '', ''].join(SEP));
      } else {
        for (const p of plist) {
          const payBr = p.date ? new Date(p.date).toLocaleString('pt-BR') : '';
          const valFmt = formatMoneyBR(Number(p.amount));
          lines.push([
            q(d.name),
            q(totalFmt),
            q(createdBr),
            q(valFmt),
            q(payBr),
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
          {/* Header + Toggle */}
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h1 className="h1">Métricas</h1>
              <p className="muted">
                {view === 'mensal'
                  ? 'Visão do mês corrente (pagamentos do 1º ao último dia).'
                  : 'Visão total acumulada.'}
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

          {/* Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="card-body">
                <div className="text-sm text-slate-600">Total de devedores</div>
                <div className="text-2xl font-extrabold" style={{ color: COLORS_BY_NAME['Devedores'] }}>
                  {stats.totalDevedores}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="text-sm text-slate-600">
                  {view === 'mensal' ? 'Total devido (acumulado)' : 'Total devido'}
                </div>
                <div className="text-2xl font-extrabold text-slate-800">
                  R$ {formatMoneyBR(stats.totalDevido)}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="text-sm text-slate-600">
                  {view === 'mensal' ? 'Pago no mês' : 'Total pago'}
                </div>
                <div className="text-2xl font-extrabold" style={{ color: COLORS_BY_NAME['Pago'] }}>
                  R$ {formatMoneyBR(stats.totalPago)}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <div className="text-sm text-slate-600">Pendente (acumulado)</div>
                <div className="text-2xl font-extrabold" style={{ color: COLORS_BY_NAME['Pendente'] }}>
                  R$ {formatMoneyBR(stats.pendente)}
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="card">
            <div className="card-body" style={{ height: 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={120} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={COLORS_BY_NAME[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any, n: any) =>
                      n === 'Devedores' ? [v, 'Devedores'] : [`R$ ${formatMoneyBR(Number(v))}`, n]
                    }
                  />
                  <Legend
                    formatter={(value) => ( <span style={{ color: COLORS_BY_NAME[value] }}>{value}</span> ) as unknown as string}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela: Recebido por devedor no recorte */}
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
                      <tr>
                        <td colSpan={3} className="py-4 text-slate-500">
                          Nenhum recebimento neste período.
                        </td>
                      </tr>
                    )}
                    {receivedByDebtor.map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="py-2 pr-4">{row.name}</td>
                        <td className="py-2 pr-4">
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleDateString('pt-BR')
                            : '-'}
                        </td>
                        <td className="py-2 text-right font-semibold text-emerald-700">
                          R$ {formatMoneyBR(row.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {receivedByDebtor.length > 0 && (
                    <tfoot>
                      <tr>
                        <td className="py-2 pr-4 font-semibold">Total</td>
                        <td />
                        <td className="py-2 text-right font-extrabold text-emerald-700">
                          R$ {formatMoneyBR(
                            receivedByDebtor.reduce((acc, r) => acc + r.value, 0)
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </AuthGuard>
  );
}
