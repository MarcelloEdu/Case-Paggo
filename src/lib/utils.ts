import type { InvoiceStatus, PaymentMethod, Segment } from '@prisma/client';

// ==========================================
// FORMATADORES
// ==========================================

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return '—';
  return currencyFormatter.format(num);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function daysUntil(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

// Converte campos Decimal do Prisma (que não podem atravessar o limite Server -> Client)
// em number simples antes de serializar a resposta.
export function toPlainNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  // Decimal do Prisma expõe toNumber(); strings/objetos caem no parseFloat via toString()
  const maybeDecimal = value as { toNumber?: () => number };
  if (typeof maybeDecimal.toNumber === 'function') return maybeDecimal.toNumber();
  return parseFloat(String(value)) || 0;
}

// ==========================================
// RÓTULOS E CORES (mapeados para os design tokens de globals.css)
// ==========================================

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  OPEN: 'Aberta',
  IN_NEGOTIATION: 'Em negociação',
  AGREEMENT_SIGNED: 'Acordo assinado',
  PAID: 'Paga',
  DISPUTED: 'Contestada',
  WRITTEN_OFF: 'Baixada',
};

// Tom semântico usado para colorir o indicador de status e o badge de risco.
// 'critical' | 'warning' | 'positive' | 'neutral'
export const STATUS_TONE: Record<InvoiceStatus, 'critical' | 'warning' | 'positive' | 'neutral'> = {
  OPEN: 'neutral',
  IN_NEGOTIATION: 'warning',
  AGREEMENT_SIGNED: 'positive',
  PAID: 'positive',
  DISPUTED: 'critical',
  WRITTEN_OFF: 'neutral',
};

export const SEGMENT_LABELS: Record<Segment, string> = {
  SMB: 'SMB',
  MID: 'Médio porte',
  ENT: 'Enterprise',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  BOLETO: 'Boleto',
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
  BANK_TRANSFER: 'Transferência',
};

export function riskBand(score: number): { label: string; tone: 'critical' | 'warning' | 'positive' } {
  if (score >= 70) return { label: 'Alto', tone: 'critical' };
  if (score >= 40) return { label: 'Médio', tone: 'warning' };
  return { label: 'Baixo', tone: 'positive' };
}
