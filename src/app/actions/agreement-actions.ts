'use server';

import { prisma } from '@/lib/db';
import { Origin, InvoiceStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { updateInvoiceStatus } from './invoice-actions';

interface CreateAgreementParams {
  invoiceId: string;
  totalAmount: number;
  installmentsCount: number;
  firstDueDate: Date;
  origin: Origin;
}

export async function createPaymentAgreement({
  invoiceId,
  totalAmount,
  installmentsCount,
  firstDueDate,
  origin,
}: CreateAgreementParams) {
  try {
    // 1. Atualiza primeiro o status da fatura original usando a nossa máquina de estados
    const statusResult = await updateInvoiceStatus({
      invoiceId,
      nextStatus: InvoiceStatus.AGREEMENT_SIGNED,
      origin,
      reason: `Acordo de parcelamento criado em ${installmentsCount}x de forma automatizada.`,
    });

    if (!statusResult.success) {
      throw new Error(statusResult.error || 'Falha ao transicionar status da fatura para acordo.');
    }

    // 2. Cria o acordo e as parcelas dentro de uma transação
    const result = await prisma.$transaction(async (tx) => {
      const agreement = await tx.paymentAgreement.create({
        data: {
          invoiceId,
          totalAmount,
          installmentsCount,
        },
      });

      const installmentValue = totalAmount / installmentsCount;
      const installmentsData = [];

      for (let i = 1; i <= installmentsCount; i++) {
        const dueDate = new Date(firstDueDate);
        dueDate.setMonth(dueDate.getMonth() + (i - 1)); // Adiciona 1 mês para cada parcela subsequente

        installmentsData.push({
          agreementId: agreement.id,
          installmentNumber: i,
          dueDate,
          amount: installmentValue,
          status: 'PENDING',
        });
      }

      await tx.installment.createMany({
        data: installmentsData,
      });

      // Log de auditoria específico do acordo
      await tx.auditLog.create({
        data: {
          invoiceId,
          action: 'AGREEMENT_CREATED',
          newValue: JSON.stringify({ agreementId: agreement.id, totalAmount, installmentsCount }),
          origin,
          reason: `Acordo de parcelamento estruturado em ${installmentsCount} parcelas de R$ ${installmentValue.toFixed(2)}.`,
        },
      });

      return agreement;
    });

    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('❌ Erro ao criar acordo:', error);
    return { success: false, error: error.message };
  }
}