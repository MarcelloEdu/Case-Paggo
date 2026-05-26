'use server';

import { prisma } from '@/lib/db';
import { InvoiceStatus, Origin } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { validateStatusTransition } from '@/services/state-machine';

interface UpdateStatusParams {
  invoiceId: string;
  nextStatus: InvoiceStatus;
  origin: Origin;
  reason: string;
}

interface AddNoteParams {
  invoiceId: string;
  customerId: string;
  content: string;
  origin: Origin;
}

/**
 * Atualiza o status de uma fatura respeitando rigorosamente a Máquina de Estados.
 */
export async function updateInvoiceStatus({
  invoiceId,
  nextStatus,
  origin,
  reason,
}: UpdateStatusParams) {
  try {
    // 1. Procura a fatura atual no banco de dados para saber o status presente
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return { success: false, error: 'Fatura não encontrada.' };
    }

    // 2. Valida a transição utilizando o motor modularizado na camada de serviços
    const isValidTransition = validateStatusTransition(invoice.status, nextStatus);

    if (!isValidTransition) {
      return {
        success: false,
        error: `Transição inválida: Não é permitido mudar o status de [${invoice.status}] para [${nextStatus}].`,
      };
    }

    // 3. Executa a atualização e o log de auditoria de forma atómica dentro de uma transação
    const updatedInvoice = await prisma.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: nextStatus },
      });

      await tx.auditLog.create({
        data: {
          invoiceId,
          customerId: invoice.customerId,
          action: 'STATUS_CHANGE',
          oldValue: invoice.status,
          newValue: nextStatus,
          origin,
          reason,
        },
      });

      return updated;
    });

    // 4. Invalida o cache da rota para o front-end atualizar instantaneamente os dados na tela
    revalidatePath('/');
    return { success: true, data: updatedInvoice };
  } catch (error: any) {
    console.error('❌ Erro ao atualizar status da fatura:', error);
    return { success: false, error: error.message || 'Erro interno no servidor.' };
  }
}

/**
 * Adiciona uma nota/comentário interno a uma fatura e ao histórico do cliente.
 */
export async function addInvoiceNote({
  invoiceId,
  customerId,
  content,
  origin,
}: AddNoteParams) {
  try {
    if (!content.trim()) {
      return { success: false, error: 'O conteúdo da nota não pode estar vazio.' };
    }

    const log = await prisma.auditLog.create({
      data: {
        invoiceId,
        customerId,
        action: 'NOTE_ADDED',
        newValue: content,
        origin,
        reason: 'Nota de acompanhamento manual registada pelo analista de cobrança.',
      },
    });

    revalidatePath('/');
    return { success: true, data: log };
  } catch (error: any) {
    console.error('❌ Erro ao adicionar nota:', error);
    return { success: false, error: error.message || 'Erro interno ao salvar nota.' };
  }
}