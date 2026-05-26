'use server';

import { prisma } from '@/lib/db';
import { InvoiceStatus, Origin } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// Mapa estrito da nossa Máquina de Estados UML
const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
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