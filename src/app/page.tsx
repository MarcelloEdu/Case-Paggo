import { getDashboardSummary, getInvoices } from '@/app/actions/invoice-actions';
import { DashboardKpis } from '@/components/dashboard-kpis';
import { InvoiceTable } from '@/components/invoice-table';
import styles from './page.module.css';

// Os dados mudam a cada filtro/ação do analista — nunca deve ser pré-renderizado estaticamente.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [summary, { invoices, total }] = await Promise.all([
    getDashboardSummary(),
    getInvoices({ sortBy: 'dueDate', sortDir: 'asc', page: 1, pageSize: 25 }),
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Cobrança</p>
        <h1 className={styles.title}>Faturas em acompanhamento</h1>
        <p className={styles.subtitle}>
          Priorize pelo score de risco, negocie acordos e registre cada contato com o cliente.
        </p>
      </div>

      <DashboardKpis summary={summary} />
      <InvoiceTable initialInvoices={invoices} initialTotal={total} />
    </main>
  );
}
