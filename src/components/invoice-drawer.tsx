'use client';

import { useEffect, useState } from 'react';
import type { InvoiceStatus, Origin } from '@prisma/client';
import {
  getInvoiceDetail,
  updateInvoiceStatus,
  addInvoiceNote,
  VALID_TRANSITIONS,
  type InvoiceDetail,
} from '@/app/actions/invoice-actions';
import {
  STATUS_LABELS,
  SEGMENT_LABELS,
  PAYMENT_METHOD_LABELS,
  formatCurrency,
  formatDate,
  riskBand,
} from '@/lib/utils';
import styles from './invoice-drawer.module.css';

const MAIN_SEQUENCE: InvoiceStatus[] = ['OPEN', 'IN_NEGOTIATION', 'AGREEMENT_SIGNED', 'PAID'];

interface InvoiceDrawerProps {
  invoiceId: string | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function InvoiceDrawer({ invoiceId, onClose, onUpdated }: InvoiceDrawerProps) {
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getInvoiceDetail(invoiceId)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os detalhes da fatura.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  async function refetchDetail() {
    if (!invoiceId) return;
    const result = await getInvoiceDetail(invoiceId);
    setDetail(result);
  }

  async function handleStatusChange(nextStatus: InvoiceStatus) {
    if (!invoiceId) return;
    setSubmittingStatus(nextStatus);
    setError(null);
    const result = await updateInvoiceStatus({
      invoiceId,
      nextStatus,
      origin: 'ANALYST' as Origin,
    });
    setSubmittingStatus(null);
    if (result.success) {
      await refetchDetail();
      onUpdated();
    } else {
      setError(result.error || 'Não foi possível atualizar o status.');
    }
  }

  async function handleAddNote() {
    if (!invoiceId || !detail || !noteContent.trim()) return;
    setSubmittingNote(true);
    setError(null);
    const result = await addInvoiceNote({
      invoiceId,
      customerId: detail.customerId,
      content: noteContent.trim(),
      origin: 'ANALYST' as Origin,
    });
    setSubmittingNote(false);
    if (result.success) {
      setNoteContent('');
      await refetchDetail();
    } else {
      setError(result.error || 'Não foi possível salvar a nota.');
    }
  }

  if (!invoiceId) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.drawer} role="dialog" aria-label="Detalhes da fatura">
        {loading && !detail && <div className={styles.loadingState}>Carregando fatura…</div>}
        {error && !detail && <div className={styles.errorState}>{error}</div>}

        {detail && (
          <>
            <div className={styles.header}>
              <div>
                <p className={styles.headerId}>{detail.id}</p>
                <h3 className={styles.headerName}>{detail.customer.name}</h3>
              </div>
              <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Status</p>
              <div className={styles.stepper}>
                {MAIN_SEQUENCE.map((status, index) => {
                  const currentIndex = MAIN_SEQUENCE.indexOf(detail.status);
                  const reached = currentIndex >= 0 && index <= currentIndex;
                  return (
                    <div key={status} style={{ display: 'contents' }}>
                      <span className={styles.step} data-active={reached}>
                        <span className={styles.stepDot} />
                        {STATUS_LABELS[status]}
                      </span>
                      {index < MAIN_SEQUENCE.length - 1 && <span className={styles.stepLine} />}
                    </div>
                  );
                })}
              </div>

              {(detail.status === 'DISPUTED' || detail.status === 'WRITTEN_OFF') && (
                <p className={styles.exitStatuses}>
                  Encerrada fora do fluxo principal: <strong>{STATUS_LABELS[detail.status]}</strong>
                </p>
              )}

              <div className={styles.actions}>
                {VALID_TRANSITIONS[detail.status].map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    className={styles.actionButton}
                    data-critical={nextStatus === 'DISPUTED' || nextStatus === 'WRITTEN_OFF'}
                    disabled={submittingStatus !== null}
                    onClick={() => handleStatusChange(nextStatus)}
                  >
                    {submittingStatus === nextStatus ? 'Atualizando…' : `Mover para ${STATUS_LABELS[nextStatus]}`}
                  </button>
                ))}
                {VALID_TRANSITIONS[detail.status].length === 0 && (
                  <span className={styles.exitStatuses}>Esta fatura está em um estado final.</span>
                )}
              </div>

              {error && <p className={styles.exitStatuses}>{error}</p>}
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Fatura</p>
              <dl className={styles.grid}>
                <div className={styles.field}>
                  <dt>Valor</dt>
                  <dd className="tabular">{formatCurrency(detail.amount)}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Pago</dt>
                  <dd className="tabular">{formatCurrency(detail.amountPaid)}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Emissão</dt>
                  <dd className="tabular">{formatDate(detail.issueDate)}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Vencimento</dt>
                  <dd className="tabular">{formatDate(detail.dueDate)}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Forma de pagamento</dt>
                  <dd>{PAYMENT_METHOD_LABELS[detail.paymentMethod]}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Tentativas de cobrança</dt>
                  <dd className="tabular">{detail.attempts}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Atrasos anteriores</dt>
                  <dd className="tabular">{detail.previousLateInvoices}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Score de risco</dt>
                  <dd className={styles.riskLine}>
                    <span className="tabular">{detail.riskScore}</span>
                    <span>({riskBand(detail.riskScore).label})</span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Cliente</p>
              <dl className={styles.grid}>
                <div className={styles.field}>
                  <dt>Segmento</dt>
                  <dd>{SEGMENT_LABELS[detail.customer.segment]}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Limite de crédito</dt>
                  <dd className="tabular">{formatCurrency(detail.customer.creditLimit)}</dd>
                </div>
                <div className={styles.field}>
                  <dt>Saldo em aberto</dt>
                  <dd className="tabular">{formatCurrency(detail.customer.openBalance)}</dd>
                </div>
              </dl>
            </div>

            {detail.paymentAgreement && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>
                  Acordo de parcelamento · {formatCurrency(detail.paymentAgreement.totalAmount)} em{' '}
                  {detail.paymentAgreement.installmentsCount}x
                </p>
                {detail.paymentAgreement.installments.map((installment) => (
                  <div key={installment.id} className={styles.installmentRow}>
                    <span>
                      Parcela {installment.installmentNumber} · {formatDate(installment.dueDate)}
                    </span>
                    <span className="tabular">
                      {formatCurrency(installment.amount)} · {installment.status === 'PAID' ? 'Paga' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {detail.followUps.length > 0 && (
              <div className={styles.section}>
                <p className={styles.sectionTitle}>Follow-ups agendados</p>
                {detail.followUps.map((followUp) => (
                  <div key={followUp.id} className={styles.followUpRow}>
                    <span>{followUp.channel}</span>
                    <span className="tabular">{formatDate(followUp.scheduledFor)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.section}>
              <p className={styles.sectionTitle}>Notas internas</p>

              {detail.notes.length > 0 && (
                <div className={styles.noteList}>
                  {detail.notes.map((note) => (
                    <div key={note.id} className={styles.note}>
                      <p>{note.content}</p>
                      <div className={styles.noteMeta}>
                        <span>{note.createdBy === 'AI_AGENT' ? 'Agente IA' : 'Analista'}</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.noteForm}>
                <textarea
                  placeholder="Registrar uma observação sobre esta fatura…"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.noteSubmit}
                  disabled={!noteContent.trim() || submittingNote}
                  onClick={handleAddNote}
                >
                  {submittingNote ? 'Salvando…' : 'Adicionar nota'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
