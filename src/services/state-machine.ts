import { InvoiceStatus } from '@prisma/client';

/**
 * Definição estrita das transições permitidas na máquina de estados da Paggo.
 * Chave: Estado Atual -> Valor: Array de Estados Próximos Permitidos
 */
export const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  [InvoiceStatus.OPEN]: [
    InvoiceStatus.IN_NEGOTIATION,
    InvoiceStatus.DISPUTED,
    InvoiceStatus.PAID
  ],
  [InvoiceStatus.IN_NEGOTIATION]: [
    InvoiceStatus.AGREEMENT_SIGNED,
    InvoiceStatus.DISPUTED,
    InvoiceStatus.PAID
  ],
  [InvoiceStatus.AGREEMENT_SIGNED]: [
    InvoiceStatus.PAID,
    InvoiceStatus.WRITTEN_OFF // Se quebrar o acordo de forma irreversível
  ],
  [InvoiceStatus.DISPUTED]: [
    InvoiceStatus.OPEN, // Se a contestação for improcedente, volta a cobrar
    InvoiceStatus.IN_NEGOTIATION,
    InvoiceStatus.WRITTEN_OFF // Perda reconhecida na disputa
  ],
  [InvoiceStatus.PAID]: [], // Estado terminal. Uma fatura paga nunca retrocede
  [InvoiceStatus.WRITTEN_OFF]: [] // Estado terminal. Baixado como prejuízo
};

/**
 * Valida se uma transição de status é permitida pelas regras de negócio.
 * * @param currentStatus Status atual da fatura vindo do banco
 * @param nextStatus Status pretendido para a alteração
 * @returns boolean indicando se a transição é válida
 */
export function validateStatusTransition(
  currentStatus: InvoiceStatus,
  nextStatus: InvoiceStatus
): boolean {
  // Se o estado atual for igual ao próximo, a transição é considerada neutra/válida
  if (currentStatus === nextStatus) return true;

  const allowedTransitions = VALID_INVOICE_TRANSITIONS[currentStatus];
  
  if (!allowedTransitions) return false;
  
  return allowedTransitions.includes(nextStatus);
}

/**
 * Retorna uma lista de status amigáveis para exibir em badges ou seletores na UI
 */
export const STATUS_LABELS: Record<InvoiceStatus, { label: string; color: string }> = {
  [InvoiceStatus.OPEN]: { label: 'Aberta', color: 'bg-red-50 text-red-700 border-red-200' },
  [InvoiceStatus.IN_NEGOTIATION]: { label: 'Em Negociação', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  [InvoiceStatus.AGREEMENT_SIGNED]: { label: 'Acordo Assinado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  [InvoiceStatus.DISPUTED]: { label: 'Contestada (Dispute)', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  [InvoiceStatus.PAID]: { label: 'Paga', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  [InvoiceStatus.WRITTEN_OFF]: { label: 'Baixada (Loss)', color: 'bg-slate-100 text-slate-700 border-slate-300' }
};