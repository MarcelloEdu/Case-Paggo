'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './sidebar';
import DashboardKpis from './dashboard-kpis';
import InvoiceTable from './invoice-table';
import CreateInvoiceModal from './create-invoice-modal';

interface WorkspaceContainerProps {
  stats: any;
  invoices: any[];
  customers: any[];
}

export default function WorkspaceContainer({ stats, invoices, customers }: WorkspaceContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'invoices' | 'customers' | 'analytics'>('invoices');
  const router = useRouter();

  useEffect(() => {
    setIsModalOpen(false);
  }, [currentView]);

  return (
    <div className="flex min-h-screen w-full bg-slate-50/50 text-slate-900">
      {/* BARRA LATERAL REATIVA */}
      <Sidebar activeView={currentView} onViewChange={setCurrentView} />

      {/* CONTEÚDO DINÂMICO */}
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {currentView === 'invoices' && (
          <>
            <header className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices Workspace</h1>
                <p className="text-sm text-slate-500">Monitorize contas pendentes e coordene ações estratégicas de cobrança.</p>
              </div>
              
              {/* Botão abre o novo modal com busca */}
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                + Nova Fatura
              </button>
            </header>

            <DashboardKpis stats={stats} />
            <InvoiceTable initialInvoices={invoices} />
          </>
        )}

        {currentView === 'customers' && (
          <div className="bg-white rounded-xl border p-8 shadow-sm text-center py-20">
            <span className="text-3xl">👥</span>
            <h2 className="text-xl font-bold text-slate-900 mt-4">Customers Directory</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">Visualização consolidada de carteira por cliente corporativo.</p>
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="bg-white rounded-xl border p-8 shadow-sm text-center py-20">
            <span className="text-3xl">📈</span>
            <h2 className="text-xl font-bold text-slate-900 mt-4">Collections Analytics</h2>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">Gráficos de aging e curvas de recuperação atualizadas em tempo real.</p>
          </div>
        )}

      </main>

      {/* MODAL VISUAL COM SISTEMA DE CONSULTA POR TEXTO INTELLIGENT */}
      <CreateInvoiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => router.refresh()} 
        customers={customers}
      />
    </div>
  );
}