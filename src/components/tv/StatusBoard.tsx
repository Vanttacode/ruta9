// src/components/tv/StatusBoard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { BellRing } from 'lucide-react';

export default function StatusBoard({ locationId }: { locationId: string }) {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('ruta9_orders')
      .select('short_id, status')
      .eq('location_id', locationId)
      .in('status', ['preparing', 'received', 'ready'])
      .order('created_at', { ascending: true });
    setOrders(data || []);
  }, [locationId]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel('tv-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'ruta9_orders', 
        filter: `location_id=eq.${locationId}` 
      }, (payload) => {
        // Sonido opcional si un pedido pasa a READY
        if (payload.new && (payload.new as any).status === 'ready') {
            new Audio('/sounds/ding.mp3').play().catch(() => {});
        }
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [locationId, fetchOrders]);

  const preparing = orders.filter(o => o.status === 'preparing' || o.status === 'received');
  const ready = orders.filter(o => o.status === 'ready');

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header TV */}
      <header className="h-[15vh] bg-[#0A0A0A] border-b border-white/10 flex items-center justify-between px-20">
        <img src="/images/logo-ruta9.png" className="h-24 object-contain" alt="Logo" />
        <div className="text-right">
          <h1 className="text-4xl font-black text-white/40 uppercase tracking-[0.3em]">Estado de Pedidos</h1>
          <p className="text-2xl font-bold text-[#E60000]">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </header>

      {/* Cuerpo: Columnas Gigantes */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* COLUMNA: PREPARANDO */}
        <div className="w-[40%] border-r border-white/5 flex flex-col">
          <div className="py-10 bg-white/5 text-center text-4xl font-black uppercase tracking-widest text-white/30 border-b border-white/5">
            Preparando
          </div>
          <div className="flex-1 p-12 overflow-hidden">
             <div className="grid grid-cols-2 gap-8">
               {preparing.map(o => (
                 <div key={o.short_id} className="text-center animate-pulse">
                    <span className="text-7xl font-black text-white/40 font-mono">#{o.short_id}</span>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* COLUMNA: LISTO PARA RETIRAR (La que importa) */}
        <div className="w-[60%] bg-gradient-to-br from-black to-[#0A0A0A] flex flex-col relative">
          <div className="absolute inset-0 bg-[#E60000]/5 animate-pulse pointer-events-none"></div>
          
          <div className="py-10 bg-[#E60000] text-center text-5xl font-black uppercase tracking-[0.2em] text-white shadow-[0_10px_40px_rgba(230,0,0,0.3)] relative z-10">
            Retirar Aquí
          </div>

          <div className="flex-1 p-12 overflow-hidden relative z-10">
             <div className="grid grid-cols-2 gap-12">
               {ready.map(o => (
                 <div key={o.short_id} className="bg-white/5 border-2 border-[#E60000] rounded-[2rem] py-10 text-center shadow-[0_0_50px_rgba(230,0,0,0.2)] animate-bounce-subtle">
                    <div className="text-2xl font-bold text-[#E60000] mb-2 uppercase tracking-widest">Pedido</div>
                    <div className="text-[120px] leading-none font-black text-white font-mono drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      {o.short_id}
                    </div>
                 </div>
               ))}
             </div>
             {ready.length === 0 && (
                <div className="h-full flex items-center justify-center text-white/10 italic text-4xl font-medium">
                  Esperando pedidos...
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Footer TV */}
      <footer className="h-16 border-t border-white/5 flex items-center justify-center px-20 bg-black">
         <p className="text-sm font-bold tracking-[0.5em] text-white/20 uppercase">
           Buen provecho · RUTA9 · Desarrollado por Mollycode.cl
         </p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}