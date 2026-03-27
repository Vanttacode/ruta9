// src/components/caja/CashierDashboard.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShoppingCart, History, Calculator, CheckSquare, LogOut } from 'lucide-react';
import POSSystem from './POSSystem';
import OrderHistory from './OrderHistory';
import CashControl from './CashControl';
import OrderManagement from './OrderManagement'; // NUEVO

export default function CashierDashboard({ locationId, locationName }: any) {
  const [activeTab, setActiveTab] = useState<'pos'|'manage'|'history'|'cash'>('manage');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    const { data } = await supabase.from('ruta9_cash_sessions').select('*, ruta9_staff(name, rut)').eq('location_id', locationId).eq('status', 'open').maybeSingle();
    setSession(data);
    setLoading(false);
  };

  useEffect(() => { checkSession(); }, []);

  if (loading) return <div className="p-10 animate-pulse text-white">Iniciando sistemas...</div>;

  if (!session && activeTab !== 'cash') {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="text-center space-y-6 bg-slate-900 p-12 rounded-3xl border border-white/10 shadow-2xl">
          <div className="text-8xl mb-4">🔒</div>
          <h2 className="text-3xl font-black text-white uppercase tracking-widest">Caja Cerrada</h2>
          <p className="text-slate-400">Debe realizar el arqueo inicial para operar.</p>
          <button onClick={() => setActiveTab('cash')} className="bg-[#E60000] text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform">Ir a Apertura</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0f172a] border-r border-white/5 flex flex-col z-20 print:hidden">
        <div className="p-6 border-b border-white/5">
          <img src="/images/logo-ruta9.png" className="h-10 mb-2" />
          <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">POS ERP v2.0</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <SidebarLink active={activeTab === 'manage'} onClick={() => setActiveTab('manage')} icon={<CheckSquare size={20}/>} label="Gestión Pedidos" />
          <SidebarLink active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<ShoppingCart size={20}/>} label="Venta Manual" />
          <SidebarLink active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History size={20}/>} label="Historial" />
          <SidebarLink active={activeTab === 'cash'} onClick={() => setActiveTab('cash')} icon={<Calculator size={20}/>} label="Control de Caja" />
        </nav>

        {session && (
          <div className="p-6 bg-black/40 border-t border-white/5">
            <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Cajero Activo</div>
            <div className="text-white font-bold truncate">{session.ruta9_staff.name}</div>
            <div className="text-xs text-slate-500 font-mono mb-3">{session.ruta9_staff.rut}</div>
            <div className="flex items-center gap-2 text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1.5 rounded-md w-max"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> EN TURNO</div>
          </div>
        )}
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-14 bg-[#0f172a]/80 backdrop-blur-md border-b border-white/5 px-8 flex items-center justify-between z-10 print:hidden">
          <span className="text-xs font-black uppercase tracking-widest text-[#E60000]">{locationName}</span>
          <span className="text-xs font-mono text-slate-400">{new Date().toLocaleDateString()}</span>
        </header>

        <div className="flex-1 overflow-auto bg-[#020617] relative">
          {activeTab === 'manage' && <OrderManagement locationId={locationId} />}
          {activeTab === 'pos' && <POSSystem locationId={locationId} session={session} />}
          {activeTab === 'history' && <OrderHistory locationId={locationId} />}
          {activeTab === 'cash' && <CashControl locationId={locationId} session={session} onRefresh={checkSession} />}
        </div>
      </main>
    </div>
  );
}

const SidebarLink = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-[#E60000] text-white shadow-lg shadow-red-900/20 scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
    {icon} {label}
  </button>
);