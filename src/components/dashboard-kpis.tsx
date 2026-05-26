'use client';

interface DashboardKpisProps {
  stats: {
    totalOverdue: number;
    atRiskCount: number;
    recoveryRate: number;
    dso: number;
  };
}

export default function DashboardKpis({ stats }: DashboardKpisProps) {
  // Formata os valores monetários para a moeda local BRL (R$)
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {/* CARD 1: TOTAL OVERDUE */}
      <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Overdue
            </span>
            <span className="text-lg">💰</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {formatCurrency(stats.totalOverdue)}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <span>↓ 4.2%</span>
          <span className="text-slate-400">vs o mês anterior</span>
        </div>
      </div>

      {/* CARD 2: DSO (DAYS SALES OUTSTANDING) */}
      <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              DSO (Sales Outstanding)
            </span>
            <span className="text-lg">⏱️</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {stats.dso} dias
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
          <span>↑ 1.5 dias</span>
          <span className="text-slate-400">de variação na carteira</span>
        </div>
      </div>

      {/* CARD 3: INVOICES AT RISK */}
      <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Invoices at Risk
            </span>
            <span className="text-lg">⚠️</span>
          </div>
          <div className="text-2xl font-bold text-red-600 mt-2 tracking-tight">
            {stats.atRiskCount} contas
          </div>
        </div>
        <div className="mt-4 flex items-center gap-1 text-xs text-slate-400">
          <span className="font-semibold text-red-500">Ação imediata:</span>
          <span>Score Risco &gt;= 70</span>
        </div>
      </div>

      {/* CARD 4: RECOVERY RATE */}
      <div className="bg-white p-6 rounded-xl border shadow-sm flex flex-col justify-between transition-all hover:shadow-md">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Recovery Rate
            </span>
            <span className="text-lg">📈</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">
            {stats.recoveryRate.toFixed(1)}%
          </div>
        </div>
        <div className="mt-4 w-full">
          {/* Barra de progresso baseada no valor real vindo do banco */}
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${stats.recoveryRate}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}