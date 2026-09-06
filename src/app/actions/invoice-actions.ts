'use server';

import { prisma } from '.../lib/db';
import { InvoiceStatus, Origin, Segment } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { toPlainNumber } from '@/lib/utils';

// Mapa estrito da nossa Máquina de Estados UML
export const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  OPEN: ['IN_NEGOTIATION', 'PAID', 'DISPUTED', 'WRITTEN_OFF'],
  IN_NEGOTIATION: ['AGREEMENT_SIGNED', 'OPEN', 'DISPUTED', 'WRITTEN_OFF'],
  AGREEMENT_SIGNED: ['PAID', 'DISPUTED', 'WRITTEN_OFF'],
  PAID: [],        // Estado Terminal
  DISPUTED: [],     // Estado Terminal
  WRITTEN_OFF: [],  // Estado Terminal
};

interface UpdateStatusParams {
  invoiceId: string;
  nextStatus: InvoiceStatus;
  origin: Origin;
  reason?: string;
}

/**
 * Atualiza o status de uma fatura respeitando as regras estritas da máquina de estados
 * e grava automaticamente a alteração na trilha de auditoria (Audit Log).
 */
export async function updateInvoiceStatus({
  invoiceId,
  nextStatus,
  origin,
  reason,
}: UpdateStatusParams) {
  try {
    // 1. Busca o estado atual da fatura
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new Error(`Fatura com ID ${invoiceId} não encontrada.`);
    }

    const currentStatus = invoice.status;

    // 2. Valida se a transição de estado é permitida pela UML
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions.includes(nextStatus)) {
      throw new Error(
        `Transição inválida: Não é permitido mudar de [${currentStatus}] para [${nextStatus}].`
      );
    }

    // 3. Executa a atualização e o log de auditoria em uma transação atômica (Garantia de consistência)
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      // Se mudar para PAID, seta a data de pagamento atual
      const paidDate = nextStatus === 'PAID' ? new Date() : invoice.paidDate;

      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { 
          status: nextStatus,
          paidDate
        },
      });

      // Grava o Audit Log (Requisito de Primeira Classe do Case)
      await tx.auditLog.create({
        data: {
          invoiceId,
          customerId: invoice.customerId,
          action: 'STATUS_CHANGE',
          previousValue: JSON.stringify({ status: currentStatus }),
          newValue: JSON.stringify({ status: nextStatus }),
          origin,
          reason: reason || `Status atualizado de ${currentStatus} para ${nextStatus}.`,
        },
      });

      return updated;
    });

    // 4. Força o Next.js a atualizar os dados na tela do analista imediatamente
    revalidatePath('/');
    
    return { success: true, data: updatedInvoice };
  } catch (error: any) {
    console.error('❌ Erro ao atualizar status da fatura:', error);
    return { success: false, error: error.message || 'Erro interno no servidor.' };
  }
}

interface AddNoteParams {
  invoiceId?: string;
  customerId: string;
  content: string;
  origin: Origin;
}

/**
 * Adiciona uma nota interna a uma fatura ou cliente e registra no Audit Log.
 */
export async function addInvoiceNote({
  invoiceId,
  customerId,
  content,
  origin,
}: AddNoteParams) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Cria a nota
      const note = await tx.note.create({
        data: {
          invoiceId,
          customerId,
          content,
          createdBy: origin,
        },
      });

      // Registra a criação da nota na auditoria
      await tx.auditLog.create({
        data: {
          invoiceId,
          customerId,
          action: 'NOTE_ADDED',
          newValue: JSON.stringify({ noteId: note.id, content: content.substring(0, 60) }),
          origin,
          reason: `Nota adicionada: "${content.substring(0, 40)}..."`,
        },
      });

      return note;
    });

    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// LEITURAS — usadas pelo dashboard, tabela e drawer
// ==========================================

const OUTSTANDING_STATUSES: InvoiceStatus[] = [
  'OPEN',
  'IN_NEGOTIATION',
  'AGREEMENT_SIGNED',
  'DISPUTED',
];

export interface InvoiceFilters {
  status?: InvoiceStatus;
  segment?: Segment;
  search?: string;
  minRisk?: number;
  sortBy?: 'dueDate' | 'amount' | 'riskScore';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Lista faturas com filtros/ordenação/paginação para a tabela do painel.
 * Os campos Decimal do Prisma são convertidos para number antes de retornar,
 * já que não podem atravessar o limite Server -> Client em RSC.
 */
export async function getInvoices(filters: InvoiceFilters = {}) {
  const {
    status,
    segment,
    search,
    minRisk,
    sortBy = 'dueDate',
    sortDir = 'asc',
    page = 1,
    pageSize = 25,
  } = filters;

  const where: any = {};
  if (status) where.status = status;
  if (typeof minRisk === 'number') where.riskScore = { gte: minRisk };
  if (segment || search) {
    where.customer = {
      ...(segment ? { segment } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { customer: { select: { name: true, segment: true } } },
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  const invoices = rows.map((inv) => ({
    id: inv.id,
    customerId: inv.customerId,
    customerName: inv.customer.name,
    customerSegment: inv.customer.segment,
    issueDate: inv.issueDate,
    dueDate: inv.dueDate,
    paidDate: inv.paidDate,
    amount: toPlainNumber(inv.amount),
    amountPaid: toPlainNumber(inv.amountPaid),
    paymentMethod: inv.paymentMethod,
    attempts: inv.attempts,
    previousLateInvoices: inv.previousLateInvoices,
    status: inv.status,
    riskScore: inv.riskScore,
  }));

  return { invoices, total, page, pageSize };
}

export type InvoiceListItem = Awaited<ReturnType<typeof getInvoices>>['invoices'][number];

/**
 * Detalhe completo de uma fatura para o drawer: cliente, notas, follow-ups
 * e o acordo de parcelamento (se existir).
 */
export async function getInvoiceDetail(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      notes: { orderBy: { createdAt: 'desc' } },
      followUps: { orderBy: { scheduledFor: 'asc' } },
      paymentAgreement: {
        include: { installments: { orderBy: { installmentNumber: 'asc' } } },
      },
    },
  });

  if (!invoice) return null;

  return {
    ...invoice,
    amount: toPlainNumber(invoice.amount),
    amountPaid: toPlainNumber(invoice.amountPaid),
    customer: {
      ...invoice.customer,
      creditLimit: toPlainNumber(invoice.customer.creditLimit),
      openBalance: toPlainNumber(invoice.customer.openBalance),
    },
    paymentAgreement: invoice.paymentAgreement
      ? {
          ...invoice.paymentAgreement,
          totalAmount: toPlainNumber(invoice.paymentAgreement.totalAmount),
          installments: invoice.paymentAgreement.installments.map((installment) => ({
            ...installment,
            amount: toPlainNumber(installment.amount),
          })),
        }
      : null,
  };
}

export type InvoiceDetail = Awaited<ReturnType<typeof getInvoiceDetail>>;

/**
 * KPIs agregados usados no topo do painel.
 */
export async function getDashboardSummary() {
  const now = new Date();

  const [outstanding, overdue, highRisk, totalCount, paidCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: { in: OUTSTANDING_STATUSES } },
      _sum: { amount: true, amountPaid: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ['OPEN', 'IN_NEGOTIATION'] }, dueDate: { lt: now } },
      _sum: { amount: true, amountPaid: true },
      _count: true,
    }),
    prisma.invoice.count({
      where: { riskScore: { gte: 70 }, status: { in: OUTSTANDING_STATUSES } },
    }),
    prisma.invoice.count(),
    prisma.invoice.count({ where: { status: 'PAID' } }),
  ]);

  const outstandingAmount =
    toPlainNumber(outstanding._sum.amount) - toPlainNumber(outstanding._sum.amountPaid);
  const overdueAmount =
    toPlainNumber(overdue._sum.amount) - toPlainNumber(overdue._sum.amountPaid);

  return {
    outstandingAmount,
    overdueAmount,
    overdueCount: overdue._count,
    highRiskCount: highRisk,
    delinquencyRate: totalCount > 0 ? overdue._count / totalCount : 0,
    totalCount,
    paidCount,
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
