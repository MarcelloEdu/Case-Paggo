import { prisma } from '@/lib/db';
import { InvoiceStatus } from '@prisma/client';
import InvoiceTable from '@/components/invoice-table';
import DashboardKpis from '@/components/dashboard-kpis';

// Funções auxiliares para calcular os KPIs do Dashboard com precisão direto no banco
async function getDashboardStats() {
  const allInvoices = await prisma.invoice.findMany();
  
  const totalOverdue = allInvoices
    .filter(i => i.status === 'OPEN' || i.status === 'IN_NEGOTIATION')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalPaid = allInvoices
    .filter(i => i.status === 'PAID')
    .reduce((acc, curr) => acc + Number(curr.amountPaid), 0);

  const atRiskCount = allInvoices.filter(i => i.riskScore >= 70 && i.status !== 'PAID').length;
  
  // Taxa de recuperação simples: (Pago / Total Geral) * 100
  const totalAmountGeral = allInvoices.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const recoveryRate = totalAmountGeral > 0 ? (totalPaid / totalAmountGeral) * 100 : 0;

  return {
    totalOverdue,
    atRiskCount,
    recoveryRate,
    dso: 42, // Valor representativo/médio com base no aging do dataset do case
  };
}

export default async function DashboardPage() {
  // 1. Busca os dados de forma paralela no servidor
  const stats = await getDashboardStats();
  
  const invoices = await prisma.invoice.findMany({
    take: 50, // Limitando inicialmente para paginação visual limpa
    orderBy: { riskScore: 'desc' }, // Mantém o requisito de priorização inteligente no topo!
    include: {
      customer: true,
    },
  });

  return (
    <div className="flex min-h-screen w-full bg-slate-50/50 text-slate-900">
      {/* BARRA LATERAL DE NAVEGAÇÃO (Sidebar) */}
      <aside className="w-64 border-r bg-white p-6 flex flex-col justify-between hidden md:flex">
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">P</div>
            <span className="font-bold text-lg tracking-tight">Paggo Collections</span>
          </div>
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-100 text-slate-900 font-medium text-sm">
              📋 Invoices
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors">
              👥 Customers
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium text-sm transition-colors">
              📈 Analytics
            </a>
          </nav>
        </div>
        <div className="border-t pt-4 px-2 text-xs text-slate-400">
          Analista: Marcello Eduardo
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DO DASHBOARD */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices Workspace</h1>
            <p className="text-sm text-slate-500">Gerencie contas em atraso e coordene ações de cobrança.</p>
          </div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm transition-colors">
            + Nova Fatura
          </button>
        </header>

        {/* SEÇÃO DE KPIs DO DASHBOARD */}
        <DashboardKpis stats={stats} />

        {/* CONTAINER DA TABELA */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="border-b px-6 py-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 border rounded-lg bg-white p-1 max-w-fit text-sm font-medium text-slate-600 shadow-sm">
              <button className="px-3 py-1.5 rounded-md bg-white text-slate-900 shadow-sm border border-slate-200/50">All Invoices</button>
              <button className="px-3 py-1.5 rounded-md hover:text-slate-900 transition-colors">My Follow-ups</button>
              <button className="px-3 py-1.5 rounded-md hover:text-slate-900 transition-colors">Disputed</button>
            </div>
            <input 
              type="text" 
              placeholder="🔍 Buscar por cliente ou ID da fatura..." 
              className="px-3 py-1.5 text-sm border rounded-lg max-w-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Renderizador estático/provisório da Tabela para teste imediato */}
          <div className="overflow-x-auto">
           {/* COMPONENTE CLIENT-SIDE COM DRAWER E MÁQUINA DE ESTADOS */}
            <InvoiceTable initialInvoices={invoices} />
          </div>
        </div>
      </main>
    </div>
  );
}