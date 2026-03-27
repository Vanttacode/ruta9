// src/components/caja/OrderHistory.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CalendarDays, DollarSign, Receipt } from 'lucide-react';

const FILTERS = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Últimos 7 Días' },
  { id: 'month', label: 'Último Mes' },
  { id: 'year', label: 'Último Año' },
  { id: 'all', label: 'Histórico Total' }
];

export default function OrderHistory({ locationId }: any) {
  const [filter, setFilter] = useState('today');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('ruta9_orders')
      .select('*, ruta9_staff(name), ruta9_order_items(quantity, unit_price, modifiers_snapshot, ruta9_products(name))')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false });
    
    // Lógica de cálculo de fechas seguro (sin mutar)
    if (filter === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      q = q.gte('created_at', startOfDay.toISOString());
    } else if (filter === 'week') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      q = q.gte('created_at', lastWeek.toISOString());
    } else if (filter === 'month') {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      q = q.gte('created_at', lastMonth.toISOString());
    } else if (filter === 'year') {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      q = q.gte('created_at', lastYear.toISOString());
    }
    // Si es 'all', no aplicamos .gte() y trae todo

    const { data } = await q;
    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  // Estadísticas rápidas del rango seleccionado
  const totalAmount = orders.reduce((acc, o) => acc + o.total_amount, 0);
  const totalTotem = orders.filter(o => o.origin === 'totem').length;
  const totalCaja = orders.filter(o => o.origin === 'cashier').length;

  return (
    <div className="p-6 space-y-6">
      
      {/* 1. Selector de Fechas */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button 
            key={f.id} 
            onClick={() => setFilter(f.id)} 
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === f.id ? 'bg-[#E60000] text-white shadow-[0_5px_20px_rgba(230,0,0,0.4)]' : 'bg-white/5 border border-white/10 text-slate-500 hover:bg-white/10 hover:text-white'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 2. Mini-Dashboard de Estadísticas del Rango */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center"><Receipt size={24}/></div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Pedidos</div>
            <div className="text-2xl font-black text-white">{orders.length}</div>
            <div className="text-xs text-slate-400 mt-1">Tótem: {totalTotem} | Caja: {totalCaja}</div>
          </div>
        </div>
        <div className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-xl flex items-center justify-center"><DollarSign size={24}/></div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ingresos Rango</div>
            <div className="text-2xl font-mono font-black text-white">${totalAmount.toLocaleString()}</div>
          </div>
        </div>
        <div className="bg-[#0f172a] border border-white/5 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center"><CalendarDays size={24}/></div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtro Activo</div>
            <div className="text-lg font-black text-white uppercase">{FILTERS.find(f => f.id === filter)?.label}</div>
          </div>
        </div>
      </div>

      {/* 3. Tabla de Resultados */}
      <div className="bg-[#0f172a] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
            <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">Consultando Base de Datos...</div>
        ) : (
            <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs text-left text-slate-300 relative">
                <thead className="bg-black/60 text-slate-500 font-bold uppercase tracking-widest border-b border-white/5 sticky top-0 backdrop-blur-md z-10">
                    <tr>
                        <th className="p-4">ID / Fecha</th>
                        <th className="p-4">Detalle Items</th>
                        <th className="p-4">Origen</th>
                        <th className="p-4">Pago</th>
                        <th className="p-4 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {orders.length === 0 ? (
                        <tr><td colSpan={5} className="p-10 text-center text-slate-500 italic">No hay ventas registradas en este periodo.</td></tr>
                    ) : (
                        orders.map(o => (
                        <tr key={o.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-4 align-top">
                            <div className="font-mono font-black text-[#E60000] text-sm">#{o.short_id}</div>
                            <div className="text-slate-500">{new Date(o.created_at).toLocaleString('es-CL')}</div>
                            </td>
                            <td className="p-4 align-top">
                            <ul className="space-y-1">
                                {o.ruta9_order_items.map((i:any, idx:number) => (
                                <li key={idx}><span className="text-white font-bold">{i.quantity}x</span> {i.ruta9_products.name} {i.modifiers_snapshot?.length > 0 && <span className="text-yellow-500 text-[10px] ml-1">(+{i.modifiers_snapshot.map((m:any)=>m.name).join(', ')})</span>}</li>
                                ))}
                            </ul>
                            </td>
                            <td className="p-4 align-top uppercase font-bold text-[10px]">
                                <span className={o.origin === 'totem' ? 'text-blue-400' : 'text-purple-400'}>{o.origin}</span>
                                <div className="text-white mt-1">{o.ruta9_staff?.name || 'Kiosco Automático'}</div>
                            </td>
                            <td className="p-4 align-top uppercase font-bold text-[10px] tracking-widest">{o.payment_method}</td>
                            <td className="p-4 align-top text-right font-black text-white text-sm">${o.total_amount.toLocaleString()}</td>
                        </tr>
                        ))
                    )}
                </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}