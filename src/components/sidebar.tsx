'use client';

interface SidebarProps {
  activeView: 'invoices' | 'customers' | 'analytics';
  onViewChange: (view: 'invoices' | 'customers' | 'analytics') => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-white p-6 flex flex-col justify-between hidden md:flex h-screen sticky top-0">
      <div>
        {/* LOGO */}
        <div className="flex items-center gap-2 mb-8 px-2">
          <div className="h-6 w-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">P</div>
          <span className="font-bold text-lg tracking-tight">Paggo Collections</span>
        </div>

        {/* LINKS DE NAVEGAÇÃO */}
        <nav className="space-y-1">
          <button
            onClick={() => onViewChange('invoices')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeView === 'invoices'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            📋 Invoices
          </button>

          <button
            onClick={() => onViewChange('customers')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeView === 'customers'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            👥 Customers
          </button>

          <button
            onClick={() => onViewChange('analytics')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeView === 'analytics'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            📈 Analytics
          </button>
        </nav>
      </div>

      <div className="border-t pt-4 px-2 text-xs text-slate-400">
        Analista: Marcello Eduardo
      </div>
    </aside>
  );
}