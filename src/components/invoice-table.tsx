'use client';

import { useState, useEffect } from 'react';
import InvoiceDrawer from './invoice-drawer';

interface InvoiceTableProps {
  initialInvoices: any[];
}

export default function InvoiceTable({ initialInvoices }: InvoiceTableProps) {
  // Estado local que gerencia as faturas exibidas na tabela
  const [invoices, setInvoices] = useState(initialInvoices);
  
  // Estados para controle de busca, filtros de status e abertura do Drawer lateral
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // 🔄 JOGADA DE MESTRE: Sincroniza o estado local sempre que o servidor trouxer novas faturas (após criar uma nova)
  useEffect(() => {
    setInvoices(initialInvoices);
  }, [initialInvoices]);

  // Regra de filtragem combinada (Busca por Texto + Filtro por Dropdown de Status)
  const filteredInvoices = invoices.filter((invoice) => {
    // Busca inteligente: Procura por correspondência no Nome do Cliente OU no ID da Fatura
    const matchesSearch = 
      invoice.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
      invoice.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Helper visual para colorir as badges de status das faturas
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'OPEN':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'OVERDUE':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'IN_NEGOTIATION':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Helper visual para colorir o indicador do nível de risco matemático
  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-rose-600 font-bold';
    if (score >= 40) return 'text-amber-600 font-semibold';
    return 'text-emerald-600 font-medium';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      
      {/* BARRA DE FERRAMENTAS: BUSCA E FILTROS */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Buscar por cliente ou ID (INV-...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-4 pr-10 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
          <span className="absolute right-3 top-2.5 text-slate-400 text-sm">🔍</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-700"
          >
            <option value="ALL">📋 Todos os Títulos</option>
            <option value="OPEN">🔵 Em Aberto (OPEN)</option>
            <option value="OVERDUE">🔴 Inadimplente (OVERDUE)</option>
            <option value="IN_NEGOTIATION">🟡 Em Acordo (IN_NEGOTIATION)</option>
            <option value="PAID">🟢 Liquidado (PAID)</option>
          </select>
        </div>
      </div>

      {/* TABELA DE DADOS */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
              <th className="py-4 px-6">ID Fatura</th>
              <th className="py-4 px-6">Cliente Corporativo</th>
              <th className="py-4 px-6">Valor Original</th>
              <th className="py-4 px-6">Vencimento</th>
              <th className="py-4 px-6 text-center">Status</th>
              <th className="py-4 px-6 text-center">Score de Risco</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 bg-white">
                  Nenhuma fatura encontrada com os critérios selecionados.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr 
                  key={invoice.id}
                  onClick={() => setSelectedInvoice(invoice)}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <td className="py-4 px-6 font-mono text-xs text-indigo-600 group-hover:underline">
                    {invoice.id}
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-900">
                    {invoice.customer?.name || 'Cliente Omitido'}
                  </td>
                  <td className="py-4 px-6 font-semibold">
                    R$ {Number(invoice.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className={`py-4 px-6 text-center text-sm ${getRiskColor(invoice.riskScore)}`}>
                    {invoice.riskScore}/100
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DETALHES LATERAIS (DRAWER) */}
      {selectedInvoice && (
        <InvoiceDrawer 
          invoiceId={selectedInvoice.id} 
          onClose={() => setSelectedInvoice(null)} 
        />
      )}
    </div>
  );
}