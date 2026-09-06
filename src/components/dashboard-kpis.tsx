import type { DashboardSummary } from '@/app/actions/invoice-actions';
import { formatCurrency } from '@/lib/utils';
import styles from './dashboard-kpis.module.css';

export function DashboardKpis({ summary }: { summary: DashboardSummary }) {
  const delinquencyPct = (summary.delinquencyRate * 100).toFixed(1);

  return (
    <div className={styles.strip}>
      <div className={styles.segment}>
        <p className={styles.label}>Em aberto</p>
        <div className={styles.value}>{formatCurrency(summary.outstandingAmount)}</div>
        <p className={styles.subvalue}>{summary.totalCount - summary.paidCount} faturas não quitadas</p>
      </div>

      <div className={styles.segment} data-tone="critical">
        <p className={styles.label}>Vencido</p>
        <div className={styles.value}>{formatCurrency(summary.overdueAmount)}</div>
        <p className={styles.subvalue}>{summary.overdueCount} faturas passaram do vencimento</p>
      </div>

      <div className={styles.segment} data-tone="warning">
        <p className={styles.label}>Alto risco</p>
        <div className={styles.value}>{summary.highRiskCount}</div>
        <p className={styles.subvalue}>faturas com score ≥ 70 ainda em aberto</p>
      </div>

      <div className={styles.segment}>
        <p className={styles.label}>Taxa de inadimplência</p>
        <div className={styles.value}>{delinquencyPct}%</div>
        <p className={styles.subvalue}>sobre o total de {summary.totalCount} faturas</p>
      </div>
    </div>
  );
}
