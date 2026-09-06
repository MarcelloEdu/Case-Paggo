import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { PrismaClient, Segment, PaymentMethod, InvoiceStatus } from '@prisma/client';
import { calculateInvoiceRiskScore } from '../src/services/risk-scorer';

const prisma = new PrismaClient();

// Interface que representa a linha bruta do CSV fornecido no case
interface RawCsvRow {
  invoiceId: string;
  customerId: string;
  customerName: string;
  customerSegment: string;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  amount: string;
  amountPaid: string;
  paymentMethod: string;
  attempts: string;
  previousLateInvoices: string;
  creditLimit: string;
  openBalance: string;
}

// Heurística de cálculo de Score de Risco (0 a 100) baseada nas nossas regras de negócio
function calculateRiskScore(row: RawCsvRow): number {
  let score = 0;
  
  const amount = parseFloat(row.amount);
  const attempts = parseInt(row.attempts, 10);
  const previousLate = parseInt(row.previousLateInvoices, 10);
  const limit = parseFloat(row.creditLimit);
  const balance = parseFloat(row.openBalance);

  // REGRA 1: Risco de Inadimplência Crônica (Várias tentativas falhas + estourando limite)
  if (attempts > 3) score += 30;
  if (balance >= limit) score += 25;

  // REGRA 2: Efeito Enterprise Incomum (Segmento ENT atrasando pela primeira vez)
  // Como são dados crus em atraso, se for ENT e o histórico for limpo, damos prioridade alta
  if (row.customerSegment === 'ENT' && previousLate === 0) {
    score += 40; // Alto impacto financeiro, alta probabilidade de recuperação rápida
  }

  // REGRA 3: Histórico de atrasos recorrentes no último ano
  if (previousLate > 5) {
    score += 20;
  } else if (previousLate > 0) {
    score += 10;
  }

  // Ajuste fino para valores muito altos em risco
  if (amount > 20000) score += 15;

  // Garante que o score fique no teto de 100
  return Math.min(score, 100);
}

async function main() {
  const csvFilePath = path.join(process.cwd(), 'public', 'data', 'invoices.csv');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`Erro: O arquivo CSV não foi encontrado em: ${csvFilePath}`);
    process.exit(1);
  }

  console.log('🚀 Iniciando o processamento do CSV de faturas...');

  const customersMap = new Map<string, any>();
  const invoicesData: any[] = [];

  // Configura o parser do stream do CSV
  const parser = fs.createReadStream(csvFilePath).pipe(
    parse({
      columns: true, // Usa a primeira linha como chaves do objeto
      skip_empty_lines: true,
      trim: true
    })
  );

  for await (const record of parser) {
    const row = record as RawCsvRow;

    // 1. Agrupa os clientes de forma única na memória para evitar duplicidade de PK
    if (!customersMap.has(row.customerId)) {
      customersMap.set(row.customerId, {
        id: row.customerId,
        name: row.customerName,
        segment: row.customerSegment as Segment,
        creditLimit: parseFloat(row.creditLimit),
        openBalance: parseFloat(row.openBalance)
      });
    }

    // 2. Calcula o Score de Risco da fatura
    const riskScore = calculateInvoiceRiskScore({
      daysOverdue: 0, // Você pode adicionar lógica para calcular isso com base em row.dueDate e row.paidDate
      previousLateInvoices: parseInt(row.previousLateInvoices, 10),
      attempts: parseInt(row.attempts, 10),
      customerSegment: row.customerSegment as 'SMB' | 'MID' | 'ENT' | string,
      openBalance: parseFloat(row.openBalance),
      creditLimit: parseFloat(row.creditLimit)
    });

    // 3. Define o status inicial da fatura (Se tem paidDate preenchido no CSV, já está PAID, senão OPEN)
    const initialStatus: InvoiceStatus = row.paidDate && row.paidDate !== 'null' && row.paidDate !== '' 
      ? InvoiceStatus.PAID 
      : InvoiceStatus.OPEN;

    // 4. Prepara o objeto da fatura para insert em lote
    invoicesData.push({
      id: row.invoiceId,
      customerId: row.customerId,
      issueDate: new Date(row.issueDate),
      dueDate: new Date(row.dueDate),
      paidDate: initialStatus === InvoiceStatus.PAID ? new Date(row.paidDate!) : null,
      amount: parseFloat(row.amount),
      amountPaid: parseFloat(row.amountPaid || '0'),
      paymentMethod: row.paymentMethod as PaymentMethod,
      attempts: parseInt(row.attempts, 10),
      previousLateInvoices: parseInt(row.previousLateInvoices, 10),
      status: initialStatus,
      riskScore: riskScore
    });
  }

  console.log(`📊 Total de clientes únicos identificados: ${customersMap.size}`);
  console.log(`📊 Total de faturas prontas para processamento: ${invoicesData.length}`);

  // Limpa o banco de dados antes para evitar conflitos de ID ao re-rodar o seed (Opcional)
  console.log('🧹 Limpando registros antigos do banco...');
  await prisma.invoice.deleteMany({});
  await prisma.customer.deleteMany({});

  // 5. Inserção em Lote dos Clientes
  console.log('💾 Salvando clientes no banco de dados...');
  const customersArray = Array.from(customersMap.values());
  await prisma.customer.createMany({
    data: customersArray
  });

  // 6. Inserção em Lote das Faturas (Dividido em blocos de 2000 linhas para não estourar os limites de payload do driver de banco)
  console.log('💾 Salvando faturas no banco de dados...');
  const chunkSize = 2000;
  for (let i = 0; i < invoicesData.length; i += chunkSize) {
    const chunk = invoicesData.slice(i, i + chunkSize);
    await prisma.invoice.createMany({
      data: chunk
    });
    console.log(`   └─ Bloco ${i / chunkSize + 1} gravado com sucesso.`);
  }

  console.log('✨ Banco de dados populado com sucesso e prioridades geradas!');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante a execução do seed:', e);
    process.exit(1);
  } )
  .finally(async () => {
    await prisma.$disconnect();
  });