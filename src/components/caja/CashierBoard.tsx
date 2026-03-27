// src/components/caja/CashierBoard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { MonitorDot, CheckCircle2, Clock, Play, Printer, XOctagon } from 'lucide-react';

export default function CashierBoard({ locationId, locationName }: { locationId: string, locationName: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Cargar Pedidos Activos (Ignoramos los entregados y cancelados)
  const fetchActiveOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ruta9_orders')
        .select(`
          *,
          ruta9_order_items (
            id, quantity, product_id, modifiers_snapshot,
            ruta9_products (name)
          )
        `)
        .eq('location_id', locationId)
        .in('status', ['received', 'preparing', 'ready'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error en Caja:", err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // 2. Tiempo Real
  useEffect(() => {
    fetchActiveOrders();
    const channel = supabase.channel('kds-caja')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ruta9_orders', filter: `location_id=eq.${locationId}` },
        () => fetchActiveOrders()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [locationId, fetchActiveOrders]);

  // 3. Superpoderes de la Caja (Cambiar Estado)
  const updateStatus = async (orderId: string, newStatus: string) => {
    // Actualización optimista instantánea
    setOrders(prev => {
      if (newStatus === 'delivered' || newStatus === 'cancelled') return prev.filter(o => o.id !== orderId);
      return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    });
    // Impacto en Supabase
    await supabase.from('ruta9_orders').update({ status: newStatus }).eq('id', orderId);
  };

  // 4. Contingencia (Re-imprimir)
  const handleReprint = (order: any) => {
    // Aquí conectarías con el AndroidBridge si la caja usa el mismo hardware, 
    // o con una API de impresión de red térmica.
    alert(`Enviando a imprimir ticket #${order.short_id}...`);
  };

  if (loading) return <div className="h-full flex flex-col items-center justify-center text-3xl text-white/50"><div className="w-16 h-16 border-4 border-t-[#E60000] border-white/10 rounded-full animate-spin mb-4"></div>Cargando Caja...</div>;

  // Clasificación de Pedidos
  const inProcessOrders = orders.filter(o => o.status === 'received' || o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="flex flex-col h-full bg-[#050505]">
      {/* HEADER CAJA */}
      <header className="h-20 bg-[#0A0A0A] border-b border-white/5 flex justify-between items-center px-8 shadow-md z-10">
        <div className="flex items-center gap-4">
            <MonitorDot size={32} className="text-[#E60000]" />
            <h1 className="text-3xl font-black uppercase tracking-widest text-white">CAJA <span className="text-white/30">| {locationName.replace('-', ' ')}</span></h1>
        </div>
        <div className="flex gap-8">
            <div className="text-center"><div className="text-3xl font-black text-white">{inProcessOrders.length}</div><div className="text-xs font-bold text-white/40 tracking-widest uppercase">En Proceso</div></div>
            <div className="text-center"><div className="text-3xl font-black text-green-500">{readyOrders.length}</div><div className="text-xs font-bold text-white/40 tracking-widest uppercase">Por Entregar</div></div>
        </div>
      </header>

      {/* TABLERO CAJA (Split Screen) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMNA 1: EN PROCESO (Actúa como backup de la cocina) */}
        <div className="w-1/2 h-full flex flex-col border-r border-white/5 bg-[#050505]">
            <div className="p-4 bg-white/5 text-center border-b border-white/10 uppercase tracking-[0.4em] font-bold text-sm text-white/60">
                En Preparación ({inProcessOrders.length})
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {inProcessOrders.map(order => (
                    <CashierOrderCard 
                        key={order.id} 
                        order={order} 
                        onAdvance={() => updateStatus(order.id, order.status === 'received' ? 'preparing' : 'ready')}
                        onCancel={() => { if(confirm('¿Anular este pedido?')) updateStatus(order.id, 'cancelled'); }}
                        onReprint={() => handleReprint(order)}
                    />
                ))}
            </div>
        </div>

        {/* COLUMNA 2: LISTOS PARA ENTREGAR (El trabajo principal de la caja) */}
        <div className="w-1/2 h-full flex flex-col bg-gradient-to-b from-[#0A0A0A] to-[#050505] relative">
            <div className="p-4 bg-green-900/20 text-center border-b border-green-500/20 uppercase tracking-[0.4em] font-bold text-sm text-green-500">
                Listos - Llamar Cliente ({readyOrders.length})
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                {readyOrders.map(order => (
                    <CashierOrderCard 
                        key={order.id} 
                        order={order} 
                        onAdvance={() => updateStatus(order.id, 'delivered')}
                        onCancel={() => { if(confirm('¿Anular este pedido?')) updateStatus(order.id, 'cancelled'); }}
                        onReprint={() => handleReprint(order)}
                    />
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: TARJETA MULTI-ESTADO DE CAJA ---
function CashierOrderCard({ order, onAdvance, onCancel, onReprint }: any) {
    // Configuramos colores y textos según el estado exacto
    let stateConfig = { color: '', badge: '', btnText: '', btnColor: '' };
    
    if (order.status === 'received') {
        stateConfig = { color: 'border-white/10 bg-white/5', badge: 'bg-slate-700 text-white', btnText: 'Pasar a Plancha', btnColor: 'bg-blue-600 hover:bg-blue-500' };
    } else if (order.status === 'preparing') {
        stateConfig = { color: 'border-blue-500/30 bg-blue-900/10', badge: 'bg-blue-600 text-white animate-pulse', btnText: 'Marcar Listo', btnColor: 'bg-[#E60000] hover:bg-red-600' };
    } else if (order.status === 'ready') {
        stateConfig = { color: 'border-green-500/50 bg-green-900/20 shadow-[0_0_30px_rgba(34,197,94,0.1)]', badge: 'bg-green-600 text-white', btnText: 'ENTREGAR AL CLIENTE', btnColor: 'bg-green-600 hover:bg-green-500 text-5xl py-8' };
    }

    return (
        <div className={`rounded-3xl border-2 overflow-hidden flex flex-col transition-all ${stateConfig.color}`}>
            
            {/* Cabecera del Ticket */}
            <div className="p-4 flex justify-between items-center border-b border-white/5 bg-black/40">
                <div className="text-5xl font-black tracking-tighter text-white">#{order.short_id}</div>
                <div className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-widest ${stateConfig.badge}`}>
                    {order.status === 'received' ? 'Nuevo' : order.status === 'preparing' ? 'Cocinando' : 'Listo para retiro'}
                </div>
            </div>

            {/* Lista de Productos y Modificadores */}
            <div className="p-6 flex-1 text-2xl font-bold space-y-4">
                {order.ruta9_order_items.map((item: any) => (
                    <div key={item.id} className="border-l-4 border-white/20 pl-4">
                        <div className="flex gap-4 items-start text-white">
                            <span className="text-[#E60000]">{item.quantity}x</span>
                            <span>{item.ruta9_products.name}</span>
                        </div>
                        {item.modifiers_snapshot && item.modifiers_snapshot.length > 0 && (
                            <p className="text-yellow-500 text-lg font-black uppercase mt-1">
                                + {item.modifiers_snapshot.map((m:any) => m.name).join(', ')}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* Controles Operativos de Caja */}
            <div className="p-4 bg-black/60 border-t border-white/5 flex gap-4">
                {/* Botón Principal (Avanzar Flujo) */}
                <button 
                    onClick={onAdvance}
                    className={`flex-1 py-6 text-3xl font-black uppercase tracking-widest text-white rounded-xl transition-transform active:scale-95 touch-target flex items-center justify-center gap-3 ${stateConfig.btnColor}`}
                >
                    {order.status === 'ready' && <CheckCircle2 size={36} />}
                    {order.status !== 'ready' && <Play size={28} fill="currentColor" />}
                    {stateConfig.btnText}
                </button>
                
                {/* Botones Secundarios (Imprimir y Cancelar) */}
                <button onClick={onReprint} className="w-20 bg-white/5 border border-white/10 text-white/50 rounded-xl flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors touch-target">
                    <Printer size={28} />
                </button>
                <button onClick={onCancel} className="w-20 bg-red-900/20 border border-red-900/30 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors touch-target">
                    <XOctagon size={28} />
                </button>
            </div>
        </div>
    );
}