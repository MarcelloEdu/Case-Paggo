import { prisma } from '@/lib/db';
import WorkspaceContainer from '@/components/workspace-container';

// Função Server-Side para calcular as métricas agregadas diretamente no banco (Neon)
async function getDashboardStats() {
  const allInvoices = await prisma.invoice.findMany();
  
  const totalOverdue = allInvoices
    .filter(i => i.status === 'OPEN' || i.status === 'IN_NEGOTIATION')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalPaid = allInvoices
    .filter(i => i.status === 'PAID')
    .reduce((acc, curr) => acc + Number(curr.amountPaid), 0);

  const atRiskCount = allInvoices.filter(i => i.riskScore >= 70 && i.status !== 'PAID').length;
  
  // Taxa de recuperação de crédito: (Total Pago / Total Emitido Geral) * 100
  const totalAmountGeral = allInvoices.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const recoveryRate = totalAmountGeral > 0 ? (totalPaid / totalAmountGeral) * 100 : 0;

  return {
    totalOverdue,
    atRiskCount,
    recoveryRate,
    dso: 42, // Aging médio padrão estipulado para o dataset do case
  };
}

export default async function DashboardPage() {
  // 1. Executa as consultas ao servidor em paralelo para otimizar o tempo de resposta (TTFB)
  const [stats, invoices, customers] = await Promise.all([
    getDashboardStats(),
    
    prisma.invoice.findMany({
      take: 100, // Limita o faturamento inicial para manter a tabela leve e responsiva
      orderBy: { riskScore: 'desc' }, // Motor de priorização: Maiores riscos no topo do funil
      include: {
        customer: true, // Acopla nativamente os dados relacionais de cada cliente
      },
    }),

    prisma.customer.findMany({
      orderBy: { name: 'asc' }, // Traz a listagem ordenada de clientes para otimizar o autocomplete
    }),
  ]);

  // 2. Injeta os dados limpos no Orquestrador Client-Side
  return (
    <WorkspaceContainer 
      stats={stats} 
      invoices={invoices} 
      customers={customers} 
    />
  );
}