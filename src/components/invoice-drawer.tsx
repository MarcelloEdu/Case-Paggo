'use client';

import { useState, useEffect } from 'react';
import { InvoiceStatus } from '@prisma/client';
import { updateInvoiceStatus, addInvoiceNote } from '@/app/actions/invoice-actions';
import { createPaymentAgreement } from '@/app/actions/agreement-actions';

interface InvoiceDrawerProps {
  invoice: any;
  onClose: () => void;
  onStatusUpdated: (id: string, nextStatus: InvoiceStatus) => void;
}

export default function InvoiceDrawer({ invoice, onClose, onStatusUpdated }: InvoiceDrawerProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'ai'>('details');
  const [noteContent, setNoteContent] = useState('');
  const [installments, setInstallments] = useState(3);
  
  // Estados para o Chat de IA
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([
    { role: 'assistant', text: `Olá! Sou o assistente de cobrança da Paggo. Posso analisar o histórico da ${invoice.id}, estruturar propostas de acordo ou redigir e-mails de cobrança personalizados. Como posso ajudar?` }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Limpa os estados ao trocar de fatura selecionada
  useEffect(() => {
    setNoteContent('');
    setMessages([
      { role: 'assistant', text: `Olá! Sou o assistente de cobrança da Paggo. Posso analisar o histórico da ${invoice.id}, estruturar propostas de acordo ou redigir e-mails de cobrança personalizados. Como posso ajudar?` }
    ]);
  }, [invoice.id]);

  const handleStatusChange = async (nextStatus: InvoiceStatus) => {
    const reason = prompt(`Por que está a alterar o status para ${nextStatus}?`);
    if (reason === null) return; // Cancelou o prompt

    const res = await updateInvoiceStatus({
      invoiceId: invoice.id,
      nextStatus,
      origin: 'ANALYST',
      reason: reason || 'Alteração manual via painel.'
    });

    if (res.success) {
      alert('Status atualizado com sucesso!');
      onStatusUpdated(invoice.id, nextStatus);
    } else {
      alert(`Erro na máquina de estados: ${res.error}`);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    const res = await addInvoiceNote({
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      content: noteContent,
      origin: 'ANALYST'
    });

    if (res.success) {
      alert('Nota interna guardada!');
      setNoteContent('');
      // Aqui idealmente recarregaríamos os logs para exibir na linha do tempo
    }
  };

  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isAiLoading) return;

    const userText = inputMessage;
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInputMessage('');
    setIsAiLoading(true);

    // Mock temporário para simular a resposta antes de integrarmos a API do Gemini
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: `Compreendido! Analisando o score de risco (${invoice.riskScore}/100) da ${invoice.customer.name}, recomendo avançar com um acordo de parcelamento em até 3x, dado o limite de crédito disponível.` 
      }]);
      setIsAiLoading(false);
    }, 1200);
  };

  return (
    <div className="w-full md:w-[450px] bg-white border-l shadow-2xl flex flex-col h-[calc(100vh-110px)] sticky top-24 rounded-xl overflow-hidden animate-in slide-in-from-right duration-200">
      {/* CABEÇALHO DO DRAWER */}
      <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-indigo-600">{invoice.id}</span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md ${
              invoice.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}>{invoice.status}</span>
          </div>
          <h3 className="font-bold text-slate-900 text-lg mt-1 truncate max-w-[280px]">{invoice.customer.name}</h3>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white border p-2 rounded-lg shadow-sm transition-colors text-sm">
          ✕
        </button>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div className="flex border-b text-sm font-medium px-6 bg-white">
        <button 
          onClick={() => setActiveTab('details')}
          className={`py-3 px-2 border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500'}`}
        >
          Ações & Histórico
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`py-3 px-2 border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'ai' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500'}`}
        >
          Copilot de IA ✨
        </button>
      </div>

      {/* CORPO DO DRAWER */}
      <div className="flex-1 overflow-y-auto p-6 bg-white space-y-6">
        
        {/* ABA 1: OPERAÇÕES MANUAIS E AUDIT LOG */}
        {activeTab === 'details' && (
          <>
            {/* Bloco: Alterar Estado */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Máquina de Estados</h4>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleStatusChange('IN_NEGOTIATION')} className="px-3 py-2 border rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors">Negociar</button>
                <button onClick={() => handleStatusChange('DISPUTED')} className="px-3 py-2 border rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100 transition-colors">Contestar (Dispute)</button>
                <button onClick={() => handleStatusChange('PAID')} className="px-3 py-2 border rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">Marcar como Pago</button>
                <button onClick={() => handleStatusChange('WRITTEN_OFF')} className="px-3 py-2 border rounded-lg text-xs font-semibold bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors">Dar Baixa (Loss)</button>
              </div>
            </div>

            {/* Bloco: Notas de Cobrança */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Adicionar Anotação</h4>
              <textarea 
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ex: Cliente prometeu enviar o comprovante do PIX até sexta-feira às 14h..."
                className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 outline-none resize-none"
                rows={3}
              />
              <button onClick={handleAddNote} className="mt-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2 rounded-lg transition-colors shadow-sm">
                Guardar Nota
              </button>
            </div>

            {/* Bloco: Acordo de Parcelamento */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Gerar Acordo Comercial</h4>
              <div className="bg-slate-50 border p-4 rounded-xl flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Número de parcelas:</span>
                <input 
                  type="number" 
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-16 border rounded-lg p-1 text-center font-bold text-sm bg-white"
                  min={2} max={12}
                />
              </div>
              <button 
                onClick={async () => {
                  const res = await createPaymentAgreement({
                    invoiceId: invoice.id,
                    totalAmount: Number(invoice.amount),
                    installmentsCount: installments,
                    firstDueDate: new Date(),
                    origin: 'ANALYST'
                  });
                  if (res.success) alert('Acordo estruturado com sucesso no banco!');
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Fracionar Dívida em {installments}x
              </button>
            </div>

            {/* Linha do Tempo / Audit Log */}
            <div className="border-t pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Histórico de Auditoria</h4>
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-slate-100">
                <div className="flex gap-3 relative">
                  <div className="h-5 w-5 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white z-10 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Fatura Importada</p>
                    <p className="text-[11px] text-slate-400">Sistema • Score {invoice.riskScore}/100 gerado automaticamente</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ABA 2: CHAT INTELIGENTE COM O AGENTE */}
        {activeTab === 'ai' && (
          <div className="flex flex-col h-full min-h-[350px]">
            {/* Feed de Mensagens */}
            <div className="flex-1 space-y-3 mb-4 overflow-y-auto pr-1 text-xs">
              {messages.map((msg, idx) => (
                <div key={idx} className={`p-3 rounded-xl max-w-[85%] ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white ml-auto' 
                    : 'bg-slate-100 text-slate-800 mr-auto border'
                }`}>
                  {msg.text}
                </div>
              ))}
              {isAiLoading && (
                <div className="text-slate-400 text-[11px] font-medium animate-pulse">
                  ✨ Agente Paggo está a analisar o banco...
                </div>
              )}
            </div>

            {/* Input Form do Chat */}
            <form onSubmit={handleSendAiMessage} className="flex gap-2 border-t pt-4">
              <input 
                type="text" 
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Pergunte ou peça: 'Crie um e-mail de cobrança'..."
                className="flex-1 border rounded-lg px-3 py-2 text-xs bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2 rounded-lg transition-colors">
                Enviar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}