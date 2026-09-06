'use client';

import type { InvoiceStatus, Segment } from '@prisma/client';
import { useInvoiceState } from '@/hooks/use-invoice-state';
import type { InvoiceListItem } from '@/app/actions/invoice-actions';
import {
  STATUS_LABELS,
  STATUS_TONE,
  SEGMENT_LABELS,
  formatCurrency,
  formatDate,
  daysUntil,
  riskBand,
} from '@/lib/utils';
import { InvoiceDrawer } from './invoice-drawer';
import styles from './invoice-table.module.css';

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as InvoiceStatus[];
const SEGMENT_OPTIONS = Object.keys(SEGMENT_LABELS) as Segment[];

interface InvoiceTableProps {
  initialInvoices: InvoiceListItem[];
  initialTotal: number;
}

export function InvoiceTable({ initialInvoices, initialTotal }: InvoiceTableProps) {
  const {
    filters,
    updateFilters,
    toggleSort,
    invoices,
    total,
    totalPages,
    loading,
    refresh,
    selectedInvoiceId,
    openInvoice,
    closeInvoice,
  } = useInvoiceState({ initialInvoices, initialTotal });

  return (
    <>
      <div className={styles.panel}>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            type="text"
            placeholder="Buscar por cliente…"
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
          />

          <div className={styles.pillGroup}>
            <button
              type="button"
              className={styles.pill}
              aria-pressed={filters.status === 'ALL'}
              onClick={() => updateFilters({ status: 'ALL' })}
            >
              Todos os status
            </button>
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                className={styles.pill}
                aria-pressed={filters.status === status}
                onClick={() => updateFilters({ status })}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          <select
            className={styles.select}
            value={filters.segment}
            onChange={(e) => updateFilters({ segment: e.target.value as Segment | 'ALL' })}
          >
            <option value="ALL">Todos os segmentos</option>
            {SEGMENT_OPTIONS.map((segment) => (
              <option key={segment} value={segment}>
                {SEGMENT_LABELS[segment]}
              </option>
            ))}
          </select>

          <label className={styles.riskToggle}>
            <input
              type="checkbox"
              checked={filters.highRiskOnly}
              onChange={(e) => updateFilters({ highRiskOnly: e.target.checked })}
            />
            Somente alto risco
          </label>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Fatura</th>
                <th className={styles.sortable} onClick={() => toggleSort('amount')}>
                  Valor {filters.sortBy === 'amount' ? (filters.sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className={styles.sortable} onClick={() => toggleSort('dueDate')}>
                  Vencimento {filters.sortBy === 'dueDate' ? (filters.sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th>Status</th>
                <th className={styles.sortable} onClick={() => toggleSort('riskScore')}>
                  Risco {filters.sortBy === 'riskScore' ? (filters.sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr className={styles.loadingRow}>
                  <td colSpan={6}>Atualizando…</td>
                </tr>
              )}

              {!loading && invoices.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.empty}>
                      <strong>Nenhuma fatura encontrada</strong>
                      Ajuste os filtros ou a busca para ver outras faturas.
                    </div>
                  </td>
                </tr>
              )}

              {!loading &&
                invoices.map((invoice) => {
                  const tone = STATUS_TONE[invoice.status];
                  const risk = riskBand(invoice.riskScore);
                  const overdue = daysUntil(invoice.dueDate);
                  const isOverdue =
                    overdue !== null &&
                    overdue < 0 &&
                    (invoice.status === 'OPEN' || invoice.status === 'IN_NEGOTIATION');

                  return (
                    <tr
                      key={invoice.id}
                      className={styles.row}
                      data-selected={invoice.id === selectedInvoiceId}
                      onClick={() => openInvoice(invoice.id)}
                    >
                      <td className={styles.customerCell}>
                        <strong>{invoice.customerName}</strong>
                        <span>{SEGMENT_LABELS[invoice.customerSegment]}</span>
                      </td>
                      <td className="tabular">{invoice.id}</td>
                      <td className="tabular">{formatCurrency(invoice.amount)}</td>
                      <td>
                        <span className="tabular">{formatDate(invoice.dueDate)}</span>
                        {isOverdue && <span className={styles.overdueDays}>{Math.abs(overdue!)}d atraso</span>}
                      </td>
                      <td>
                        <span className={styles.statusCell}>
                          <span className={styles.dot} data-tone={tone} />
                          {STATUS_LABELS[invoice.status]}
                        </span>
                      </td>
                      <td>
                        <span className={styles.riskCell}>
                          <span className={styles.riskBar}>
                            <span
                              className={styles.riskBarFill}
                              data-tone={risk.tone}
                              style={{ width: `${invoice.riskScore}%` }}
                            />
                          </span>
                          <span className={styles.riskScore}>{invoice.riskScore}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          <span>{total} faturas encontradas</span>
          <div className={styles.pageButtons}>
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => updateFilters({ page: filters.page - 1 })}
            >
              Anterior
            </button>
            <span>
              Página {filters.page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => updateFilters({ page: filters.page + 1 })}
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      <InvoiceDrawer invoiceId={selectedInvoiceId} onClose={closeInvoice} onUpdated={refresh} />
    </>
  );
}
