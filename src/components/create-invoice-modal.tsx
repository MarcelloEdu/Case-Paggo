'use client';

import { useState, useEffect, useRef } from 'react';
import { createInvoice } from '@/app/actions/create-invoice-action';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: any[];
}

export default function CreateInvoiceModal({ isOpen, onClose, onSuccess, customers }: CreateInvoiceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BOLETO'); // 👇 Estado inicial padrão
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !amount || !dueDate) {
      alert('Por favor, preencha todos os campos e selecione um cliente válido.');
      return;
    }

    setIsLoading(true);
    // o backend espera apenas as propriedades conhecidas por CreateInvoiceParams.
    // incluímos paymentMethod apenas se for diferente do padrão ou suportado.
    const payload: any = {
      customerId: selectedCustomer.id,
      amount: parseFloat(amount),
      dueDate,
    };

    // Se a API aceitar paymentMethod, envie-o; caso contrário, remova/comment out.
    if (paymentMethod) payload.paymentMethod = paymentMethod;

    const res = await createInvoice(payload);
    setIsLoading(false);

    if (res.success) {
      onSuccess();
      onClose();
      setSearchQuery('');
      setSelectedCustomer(null);
      setAmount('');
      setDueDate('');
      setPaymentMethod('BOLETO');
    } else {
      alert(`Erro ao emitir fatura: ${res.error}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-8 py-6 border-b bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Emitir Nova Fatura</h3>
            <p className="text-sm text-slate-500 mt-1">Configure o cliente, valores e a forma de cobrança.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          
          {/* BUSCA DE CLIENTE */}
          <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Buscar Cliente</label>
            
            {selectedCustomer ? (
              <div className="w-full h-11 px-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-sm">
                <span className="font-medium text-emerald-800">✓ {selectedCustomer.name}</span>
                <button 
                  type="button" 
                  onClick={() => { setSelectedCustomer(null); setSearchQuery(''); }}
                  className="text-emerald-600 hover:text-emerald-800 font-bold text-xs"
                >
                  Alterar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Digite o nome da empresa ou cliente..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
                />
                
                {showDropdown && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto z-[110] divide-y divide-slate-50">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">Nenhum cliente encontrado</div>
                    ) : (
                      filteredCustomers.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(c);
                            setShowDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 transition-colors flex justify-between items-center"
                        >
                          <span className="font-medium">{c.name}</span>
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{c.segment}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* VALOR ORIGINAL E VENCIMENTO */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor Original (R$)</label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm font-semibold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimento</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm"
              />
            </div>
          </div>

          {/* 👇 NOVO CAMPO: MÉTODO DE PAGAMENTO */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Cobrança</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none text-sm font-medium text-slate-700"
            >
              <option value="BOLETO">🎫 Boleto Bancário</option>
              <option value="PIX">⚡ Pix Instantâneo</option>
              <option value="CREDIT_CARD">💳 Cartão de Crédito</option>
              <option value="MANUAL">✍️ Ajuste Manual / Outros</option>
            </select>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="pt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Emitindo no Banco...' : 'Confirmar Emissão'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}