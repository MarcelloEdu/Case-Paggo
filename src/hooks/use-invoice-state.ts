'use client';

import { useState, useMemo } from 'react';
import { InvoiceStatus } from '@prisma/client';
import { updateInvoiceStatus, addInvoiceNote } from '@/app/actions/invoice-actions';

interface UseInvoiceStateProps {
  initialInvoices: any[];
}

export function useInvoiceState({ initialInvoices }: UseInvoiceStateProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  
  // Estados para Filtro e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'OPEN' | 'IN_NEGOTIATION' | 'DISPUTED'>('ALL');

  // Filtra as faturas dinamicamente usando useMemo para performance
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // 1. Filtro por Aba/Status
      if (activeFilter === 'OPEN' && inv.status !== 'OPEN') return false;
      if (activeFilter === 'IN_NEGOTIATION' && inv.status !== 'IN_NEGOTIATION') return false;
      if (activeFilter === 'DISPUTED' && inv.status !== 'DISPUTED') return false;

      // 2. Filtro por Input de Texto (ID ou Nome do Cliente)
      const matchesId = inv.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesName = inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesId || matchesName;
    });
  }, [invoices, searchTerm, activeFilter]);

  const selectInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  const closeDrawer = () => {
    setSelectedInvoice(null);
  };

  const handleStatusUpdate = async (invoiceId: string, nextStatus: InvoiceStatus) => {
    const reason = prompt(`Por que está mudando o status da fatura ${invoiceId}?`);
    if (reason === null) return false;

    const res = await updateInvoiceStatus({
      invoiceId,
      nextStatus,
      origin: 'ANALYST',
      reason: reason || 'Alteração manual via painel do analista.'
    });

    if (res.success) {
      setInvoices(prev =>
        prev.map(inv => (inv.id === invoiceId ? { ...inv, status: nextStatus } : inv))
      );
      setSelectedInvoice(prev =>
        prev && prev.id === invoiceId ? { ...prev, status: nextStatus } : prev
      );
      return true;
    } else {
      alert(`Erro na validação do estado: ${res.error}`);
      return false;
    }
  };

  const handleAddNote = async (invoiceId: string, customerId: string, content: string) => {
    if (!content.trim()) return false;
    const res = await addInvoiceNote({ invoiceId, customerId, content, origin: 'ANALYST' });
    if (res.success) {
      alert('Nota interna registrada!');
      return true;
    }
    return false;
  };

  return {
    invoices: filteredInvoices, // Retorna a lista já filtrada para o componente!
    allInvoicesCount: invoices.length,
    selectedInvoice,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    selectInvoice,
    closeDrawer,
    handleStatusUpdate,
    handleAddNote
  };
}