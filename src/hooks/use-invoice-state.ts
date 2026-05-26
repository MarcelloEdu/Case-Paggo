'use client';

import { useState } from 'react';
import { InvoiceStatus } from '@prisma/client';
import { updateInvoiceStatus, addInvoiceNote } from '@/app/actions/invoice-actions';

interface UseInvoiceStateProps {
  initialInvoices: any[];
}

export function useInvoiceState({ initialInvoices }: UseInvoiceStateProps) {
  const [invoices, setInvoices] = useState<any[]>(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Selecionar uma fatura para abrir o Drawer
  const selectInvoice = (invoice: any) => {
    setSelectedInvoice(invoice);
  };

  // Fechar o Drawer
  const closeDrawer = () => {
    setSelectedInvoice(null);
  };

  // Gerencia a alteração de status via máquina de estados
  const handleStatusUpdate = async (invoiceId: string, nextStatus: InvoiceStatus) => {
    // Busca a label em português ou usa o fallback
    const currentInvoice = invoices.find(inv => inv.id === invoiceId);
    
    const reason = prompt(`Por que está mudando o status da fatura ${invoiceId}?`);
    if (reason === null) return false; // Operação cancelada pelo usuário

    const res = await updateInvoiceStatus({
      invoiceId,
      nextStatus,
      origin: 'ANALYST',
      reason: reason || 'Alteração manual via painel do analista.'
    });

    if (res.success) {
      // Atualiza o estado da lista de faturas localmente
      setInvoices(prev =>
        prev.map(inv => (inv.id === invoiceId ? { ...inv, status: nextStatus } : inv))
      );
      
      // Se a fatura alterada for a que está aberta no drawer, atualiza o drawer também
      setSelectedInvoice(prev =>
        prev && prev.id === invoiceId ? { ...prev, status: nextStatus } : prev
      );
      
      return true;
    } else {
      alert(`Erro na validação do estado: ${res.error}`);
      return false;
    }
  };

  // Adiciona uma nota interna à fatura atual
  const handleAddNote = async (invoiceId: string, customerId: string, content: string) => {
    if (!content.trim()) return false;

    const res = await addInvoiceNote({
      invoiceId,
      customerId,
      content,
      origin: 'ANALYST'
    });

    if (res.success) {
      alert('Nota interna registrada na trâmite de auditoria!');
      return true;
    } else {
      alert(`Erro ao salvar nota: ${res.error}`);
      return false;
    }
  };

  return {
    invoices,
    selectedInvoice,
    selectInvoice,
    closeDrawer,
    handleStatusUpdate,
    handleAddNote
  };
}