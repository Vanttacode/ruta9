// src/components/cocina/KitchenBoard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, CheckCircle, ChefHat, AlertTriangle, Flame } from 'lucide-react';

export default function KitchenBoard({ locationId, locationName }: { locationId: string, locationName: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. Reloj interno para actualizar los cronómetros cada minuto
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000); // Re-calcula cada 10 seg
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch de los pedidos que están activos (Nuevos o En Cocina)
  const fetchActiveOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ruta9_orders')
        .select(`
          *,
          ruta9_order_items (
            id, quantity, product_id, modifiers_snapshot,
            ruta9_products (name, preparation) 
          )
        `) // <-- CRÍTICO: Agregamos 'preparation' a la consulta
        .eq('location_id', locationId)
        .in('status', ['received', 'preparing'])
        .order('created_at', { ascending: true }); // Los más viejos primero

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error cargando KDS:", err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // 3. Suscripción a Supabase Realtime
  useEffect(() => {
    fetchActiveOrders();

    const channel = supabase.channel('kds-cocina')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ruta9_orders', filter: `location_id=eq.${locationId}` },
        (payload) => {
          // Si entra un pedido nuevo, recargamos y tocamos sonido
          if (payload.eventType === 'INSERT') {
            const audio = new Audio('/sounds/alert.mp3');
            audio.play().catch(e => console.log("Audio bloqueado por navegador", e));
          }
          fetchActiveOrders();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [locationId, fetchActiveOrders]);

  // 4. Funciones de Acción
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Actualización optimista en la UI para máxima velocidad percibida
    setOrders(prev => {
        if (newStatus === 'ready') return prev.filter(o => o.id !== orderId);
        return prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    });

    // Impacto en DB
    await supabase.from('ruta9_orders').update({ status: newStatus }).eq('id', orderId);
  };

  // 5. Calculadora de Tiempo
  const getElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = currentTime.getTime();
    const diffMins = Math.floor((now - start) / 60000);
    return diffMins;
  };

  if (loading) return <div className="h-full flex items-center justify-center text-3xl font-bold animate-pulse text-slate-500 tracking-widest uppercase">Sincronizando KDS...</div>;

  const newOrders = orders.filter(o => o.status === 'received');
  const prepOrders = orders.filter(o => o.status === 'preparing');

  return (
    <div className="flex flex-col h-full bg-[#020617] selection:bg-transparent">
      {/* HEADER KDS */}
      <header className="h-24 bg-[#0A0A0A] border-b border-white/5 flex justify-between items-center px-10 shadow-2xl z-20">
        <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-red-900/20 rounded-2xl border border-red-500/30 flex items-center justify-center">
                <ChefHat size={32} className="text-[#E60000]" />
            </div>
            <div>
                <h1 className="text-3xl font-black uppercase tracking-widest text-white leading-tight">KDS COCINA</h1>
                <div className="text-sm font-bold text-slate-500 tracking-[0.3em] uppercase">{locationName.replace('-', ' ')}</div>
            </div>
        </div>
        <div className="flex gap-10">
            <div className="text-center bg-white/5 px-6 py-2 rounded-2xl border border-white/5">
                <div className="text-4xl font-black text-white">{newOrders.length}</div>
                <div className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Entrantes</div>
            </div>
            <div className="text-center bg-blue-900/20 px-6 py-2 rounded-2xl border border-blue-500/30">
                <div className="text-4xl font-black text-blue-500">{prepOrders.length}</div>
                <div className="text-[10px] font-bold text-blue-400/60 tracking-widest uppercase">En Curso</div>
            </div>
        </div>
      </header>

      {/* TABLERO KANBAN (Split Screen) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMNA 1: NUEVOS (ENTRANTES) */}
        <div className="w-1/2 h-full flex flex-col border-r border-white/5 bg-[#050505] shadow-[inset_-20px_0_50px_rgba(0,0,0,0.5)]">
            <div className="p-5 bg-black/60 text-center border-b border-white/5 uppercase tracking-[0.4em] font-black text-sm text-slate-400 shadow-md">
                Cola de Pedidos ({newOrders.length})
            </div>
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 scroll-smooth">
                {newOrders.map(order => <OrderCard key={order.id} order={order} onAction={() => updateOrderStatus(order.id, 'preparing')} actionText="Iniciar Preparación" actionColor="bg-blue-600 hover:bg-blue-500 text-white border-blue-500" time={getElapsedTime(order.created_at)} />)}
            </div>
        </div>

        {/* COLUMNA 2: EN COCINA */}
        <div className="w-1/2 h-full flex flex-col bg-[#0A0A0A] relative">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/5 to-transparent pointer-events-none"></div>
            <div className="p-5 bg-blue-900/20 text-center border-b border-blue-500/20 uppercase tracking-[0.4em] font-black text-sm text-blue-400 shadow-md flex items-center justify-center gap-3">
                <Flame size={18} className="text-blue-500" /> En Cocina ({prepOrders.length})
            </div>
            <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 relative z-10 scroll-smooth">
                {prepOrders.map(order => <OrderCard key={order.id} order={order} onAction={() => updateOrderStatus(order.id, 'ready')} actionText="Marcar como Listo" actionColor="bg-[#E60000] hover:bg-red-500 text-white border-red-500 shadow-[0_0_30px_rgba(230,0,0,0.3)]" time={getElapsedTime(order.created_at)} />)}
            </div>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTE: TARJETA DE COMANDA PRO ---
function OrderCard({ order, onAction, actionText, actionColor, time }: any) {
    const isLate = time >= 10; // Si pasa de 10 minutos, alerta roja
    const isPrep = actionText === "Marcar como Listo"; // Detectar en qué columna está
    
    return (
        <div className={`rounded-[2rem] border-2 overflow-hidden flex flex-col transition-all shadow-2xl ${isLate ? 'border-red-500/50 bg-red-950/20' : isPrep ? 'border-blue-500/30 bg-blue-950/10' : 'border-white/10 bg-[#0f172a]'}`}>
            
            {/* Cabecera del Ticket */}
            <div className={`p-6 flex justify-between items-center border-b ${isLate ? 'border-red-500/30 bg-red-900/40' : 'border-white/5 bg-black/40'}`}>
                <div className="flex items-center gap-4">
                    <span className="text-5xl font-black tracking-tighter text-white">#{order.short_id}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${order.origin === 'totem' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'bg-green-500/20 text-green-400 border border-green-500/20'}`}>
                        {order.origin}
                    </span>
                </div>
                
                <div className={`flex items-center gap-3 px-5 py-2 rounded-xl text-2xl font-black font-mono border ${isLate ? 'bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse' : 'bg-black/60 text-slate-300 border-white/10'}`}>
                    {isLate ? <AlertTriangle size={24} className="text-white" /> : <Clock size={24} className="text-slate-500" />}
                    {time} min
                </div>
            </div>

            {/* Lista de Productos, Modificadores e Instrucciones */}
            <div className="p-8 flex-1 text-2xl font-bold space-y-8">
                {order.ruta9_order_items.map((item: any) => (
                    <div key={item.id} className="border-l-[6px] border-[#E60000] pl-6 py-1 bg-gradient-to-r from-white/5 to-transparent rounded-r-2xl">
                        
                        {/* Producto Principal */}
                        <div className="flex gap-4 items-start text-white text-3xl tracking-tight">
                            <span className="text-[#E60000] font-black">{item.quantity}x</span>
                            <span>{item.ruta9_products.name}</span>
                        </div>
                        
                        {/* Modificadores (Extras) en Amarillo */}
                        {item.modifiers_snapshot && item.modifiers_snapshot.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {item.modifiers_snapshot.map((mod: any, idx: number) => (
                                    <span key={idx} className="text-yellow-400 text-lg font-black uppercase tracking-widest bg-yellow-400/10 border border-yellow-400/20 px-4 py-2 rounded-xl shadow-inner">
                                        + {mod.name}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* NUEVO: Instrucciones de Preparación (Uso Interno de Cocina) */}
                        {item.ruta9_products.preparation && (
                            <div className="mt-4 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-start gap-4 shadow-inner">
                                <ChefHat size={28} className="text-blue-400 shrink-0 mt-1" />
                                <span className="text-blue-300 text-xl font-bold uppercase tracking-wide leading-snug">
                                    {item.ruta9_products.preparation}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Botón de Acción Masivo */}
            <button 
                onClick={onAction}
                className={`w-full py-8 text-3xl font-black uppercase tracking-widest transition-all active:scale-[0.98] border-t ${actionColor}`}
            >
                {actionText}
            </button>
        </div>
    );
}