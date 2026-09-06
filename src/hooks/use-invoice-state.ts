'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { InvoiceStatus, Segment } from '@prisma/client';
import type { InvoiceListItem } from '@/app/actions/invoice-actions';

export interface InvoiceFiltersState {
  status: InvoiceStatus | 'ALL';
  segment: Segment | 'ALL';
  search: string;
  highRiskOnly: boolean;
  sortBy: 'dueDate' | 'amount' | 'riskScore';
  sortDir: 'asc' | 'desc';
  page: number;
}

const DEFAULT_FILTERS: InvoiceFiltersState = {
  status: 'ALL',
  segment: 'ALL',
  search: '',
  highRiskOnly: false,
  sortBy: 'dueDate',
  sortDir: 'asc',
  page: 1,
};

const PAGE_SIZE = 25;

interface UseInvoiceStateOptions {
  initialInvoices: InvoiceListItem[];
  initialTotal: number;
}

export function useInvoiceState({ initialInvoices, initialTotal }: UseInvoiceStateOptions) {
  const [filters, setFiltersState] = useState<InvoiceFiltersState>(DEFAULT_FILTERS);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>(initialInvoices);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const fetchInvoices = useCallback(async (nextFilters: InvoiceFiltersState) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextFilters.status !== 'ALL') params.set('status', nextFilters.status);
    if (nextFilters.segment !== 'ALL') params.set('segment', nextFilters.segment);
    if (nextFilters.search.trim()) params.set('search', nextFilters.search.trim());
    if (nextFilters.highRiskOnly) params.set('minRisk', '70');
    params.set('sortBy', nextFilters.sortBy);
    params.set('sortDir', nextFilters.sortDir);
    params.set('page', String(nextFilters.page));
    params.set('pageSize', String(PAGE_SIZE));

    try {
      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch a cada mudança de filtro (com debounce leve para o campo de busca).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = setTimeout(() => fetchInvoices(filters), filters.search ? 300 : 0);
    return () => clearTimeout(handle);
  }, [filters, fetchInvoices]);

  const updateFilters = useCallback((partial: Partial<InvoiceFiltersState>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...partial,
      // qualquer mudança de filtro (exceto paginação) volta para a página 1
      page: partial.page !== undefined ? partial.page : 1,
    }));
  }, []);

  const toggleSort = useCallback((column: InvoiceFiltersState['sortBy']) => {
    setFiltersState((prev) => ({
      ...prev,
      sortBy: column,
      sortDir: prev.sortBy === column && prev.sortDir === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  }, []);

  const refresh = useCallback(() => fetchInvoices(filters), [fetchInvoices, filters]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return {
    filters,
    updateFilters,
    toggleSort,
    invoices,
    total,
    totalPages,
    loading,
    refresh,
    selectedInvoiceId,
    openInvoice: setSelectedInvoiceId,
    closeInvoice: () => setSelectedInvoiceId(null),
  };
}
