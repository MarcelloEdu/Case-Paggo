'use server';

import { prisma } from '@/lib/db';
import { InvoiceStatus, Origin, PaymentMethod } from '@prisma/client';
import { calculateInvoiceRiskScore } from '@/services/risk-scorer';
import { revalidatePath } from 'next/cache';

interface CreateInvoiceParams {
  customerId: string;
  amount: number;
  dueDate: string;
}

export async function createInvoice({ customerId, amount, dueDate }: CreateInvoiceParams) {
  try {
    // 1. Busca os dados do cliente e seu histórico para o motor de score de risco
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { invoices: true }
    });

    if (!customer) {
      return { success: false, error: 'Cliente não encontrado no banco de dados.' };
    }

    // Levanta o histórico de inadimplência (faturas atualmente em aberto)
    const previousLateInvoices = customer.invoices.filter(i => i.status === 'OPEN').length;
    
    // Roda a regra de negócio centralizada para definir o score da nova fatura
    const riskScore = calculateInvoiceRiskScore({
      daysOverdue: 0, // Fatura nova nasce sem atraso acumulado
      previousLateInvoices,
      attempts: 0,
      customerSegment: customer.segment,
      openBalance: Number(customer.openBalance) + amount,
      creditLimit: Number(customer.creditLimit)
    });

const newInvoice = await prisma.$transaction(async (tx) => {
      
      // Trata a string da data para garantir consistência de fuso horário
      const [year, month, day] = dueDate.split('-').map(Number);
      const parsedDueDate = new Date(year, month - 1, day, 12, 0, 0);

      // Criação da Fatura enviando todos os campos com a tipagem nativa perfeita
      const invoice = await tx.invoice.create({
        data: {
          id: `INV-${crypto.randomUUID().substring(0, 8).toUpperCase()}`,
          amount,
          amountPaid: 0,
          issueDate: new Date(), 
          dueDate: parsedDueDate,
          status: InvoiceStatus.OPEN,
          riskScore,
          paymentMethod: PaymentMethod.BOLETO, // ➔ Agora sim, passando o Enum nativo do Prisma!
          customer: {
            connect: {
              id: customerId
            }
          }
        },
      });

      // Registra a trilha de auditoria vinculando as conexões relacionais
      await tx.auditLog.create({
        data: {
          action: 'STATUS_CHANGE',
          newValue: InvoiceStatus.OPEN,
          origin: Origin.ANALYST,
          reason: `Fatura emitida manualmente pelo analista de cobrança (Método: ${PaymentMethod.BOLETO}) no valor de R$ ${amount.toFixed(2)}.`,
          invoice: {
            connect: {
              id: invoice.id,
            },
          },
          customer: {
            connect: {
              id: customerId
            }
          }
        },
      });

      return invoice;
    });

    // 3. Invalida o cache do Next.js para renderizar a nova linha instantaneamente no front-end
    revalidatePath('/');
    return { success: true, data: newInvoice };
  } catch (error: any) {
    console.error('❌ Erro na Server Action de criação de fatura:', error);
    return { success: false, error: error.message || 'Erro interno no servidor de dados.' };
  }
}