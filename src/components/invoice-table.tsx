'use client';

import { useState } from 'react';
import InvoiceDrawer from './invoice-drawer';
import { InvoiceStatus } from '@prisma/client';

interface InvoiceTableProps {
  initialInvoices: any[];
}

export default function InvoiceTable({ initialInvoices }: InvoiceTableProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  const handleStatusUpdated = (id: string, nextStatus: InvoiceStatus) => {
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: nextStatus } : inv));
    setSelectedInvoice(prev => prev && prev.id === id ? { ...prev, status: nextStatus } : prev);
  };

  return (
    <div className="flex w-full gap-6 items-start">
      {/* SEÇÃO DA TABELA */}
      <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b">
              <tr>
                <th className="px-6 py-3.5">Invoice ID</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Segment</th>
                <th className="px-6 py-3.5">Amount</th>
                <th className="px-6 py-3.5">Risk Score</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-white">
              {invoices.map((inv) => (
                <tr 
                  key={inv.id} 
                  onClick={() => setSelectedInvoice(inv)}
                  className={`transition-colors cursor-pointer ${
                    selectedInvoice?.id === inv.id ? 'bg-indigo-50/40 font-medium' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="px-6 py-4 font-mono text-xs font-bold text-indigo-600">{inv.id}</td>
                  <td className="px-6 py-4 text-slate-900 font-medium">{inv.customer.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 text-xs font-medium bg-slate-100 rounded-md text-slate-600 border">
                      {inv.customer.segment}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(inv.amount))}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-bold ${inv.riskScore >= 70 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {inv.riskScore}/100
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${
                      inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SEÇÃO DO DRAWER COMPACTO À DIREITA */}
      {selectedInvoice && (
        <InvoiceDrawer 
          invoice={selectedInvoice} 
          onClose={() => setSelectedInvoice(null)} 
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}