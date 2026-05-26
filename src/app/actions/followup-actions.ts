'use server';

import { prisma } from '@/lib/db';
import { Origin } from '@prisma/client';
import { revalidatePath } from 'next/cache';

interface CreateFollowUpParams {
  invoiceId: string;
  customerId: string;
  scheduledFor: Date;
  channel: string; // "Telefone", "E-mail", etc.
  origin: Origin;
}

export async function scheduleFollowUp({
  invoiceId,
  customerId,
  scheduledFor,
  channel,
  origin,
}: CreateFollowUpParams) {
  try {
    const followUp = await prisma.$transaction(async (tx) => {
      const created = await tx.followUp.create({
        data: {
          invoiceId,
          customerId,
          scheduledFor,
          channel,
          status: 'PENDING',
        },
      });

      // Registra na auditoria
      await tx.auditLog.create({
        data: {
          invoiceId,
          customerId,
          action: 'FOLLOWUP_SCHEDULED',
          newValue: JSON.stringify({ followUpId: created.id, scheduledFor, channel }),
          origin,
          reason: `Lembrete de cobrança agendado via [${channel}] para ${new Date(scheduledFor).toLocaleString('pt-BR')}.`,
        },
      });

      return created;
    });

    revalidatePath('/');
    return { success: true, data: followUp };
  } catch (error: any) {
    console.error('❌ Erro ao agendar follow-up:', error);
    return { success: false, error: error.message };
  }
}