// src/components/caja/OrderManagement.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, Play, Printer, XOctagon, Clock, ChefHat, MonitorDot } from 'lucide-react';

export default function OrderManagement({ locationId }: { locationId: string }) {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from('ruta9_orders')
      .select(`*, ruta9_order_items(quantity, unit_price, modifiers_snapshot, ruta9_products(name))`)
      .eq('location_id', locationId)
      .in('status', ['received', 'preparing', 'ready'])
      .order('created_at', { ascending: true });
    setOrders(data || []);
  }, [locationId]);

  useEffect(() => {
    fetchOrders();
    const sub = supabase.channel('caja-manage').on('postgres_changes', { event: '*', schema: 'public', table: 'ruta9_orders' }, fetchOrders).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchOrders]);

  const updateStatus = async (id: string, st: string) => {
    const { error } = await supabase.from('ruta9_orders').update({ status: st }).eq('id', id);
    if (error) {
        alert("Error de permisos en Supabase: " + error.message);
    } else {
        fetchOrders();
    }
  };

  const printTicket = (order: any) => {
    const printWindow = window.open('', '_blank');
    if(!printWindow) return alert("Permita las ventanas emergentes para imprimir.");
    
    const html = `
      <html><head><style>
        body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: black; font-size: 14px; }
        .c { text-align: center; } .r { text-align: right; } .b { font-weight: bold; }
        .line { border-bottom: 1px dashed black; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 0; vertical-align: top; }
        .text-xl { font-size: 18px; } .text-2xl { font-size: 22px; }
      </style></head><body>
        <div class="c b text-2xl">RUTA9</div>
        <div class="c text-xl">TICKET DE COMANDA</div>
        <div class="line"></div>
        <div class="c b text-2xl">PEDIDO #${order.short_id}</div>
        <div class="line"></div>
        <div>Fecha: ${new Date(order.created_at).toLocaleString('es-CL')}</div>
        <div>Origen: ${order.origin.toUpperCase()}</div>
        <div class="line"></div>
        <table>
          ${order.ruta9_order_items.map((i:any) => `
            <tr>
              <td class="b">${i.quantity}x ${i.ruta9_products.name}</td>
              <td class="r">$${(i.total_price || (i.unit_price * i.quantity)).toLocaleString('es-CL')}</td>
            </tr>
            ${i.modifiers_snapshot?.length > 0 ? `<tr><td colspan="2" style="font-size: 12px; padding-left: 15px;">+ ${i.modifiers_snapshot.map((m:any)=>m.name).join(', ')}</td></tr>` : ''}
          `).join('')}
        </table>
        <div class="line"></div>
        <table>
          <tr><td class="b text-xl">TOTAL:</td><td class="r b text-xl">$${order.total_amount.toLocaleString('es-CL')}</td></tr>
        </table>
        <div class="line"></div>
        <div class="c">COPIA CAJA / COCINA</div>
        <script>window.print(); setTimeout(()=>window.close(), 1000);</script>
      </body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const inProcess = orders.filter(o => o.status === 'received' || o.status === 'preparing');
  const ready = orders.filter(o => o.status === 'ready');

  return (
    <div className="h-full flex flex-col lg:flex-row gap-8 p-8 relative z-10">
      
      {/* ========================================= */}
      {/* COLUMNA: EN PROCESO (NUEVOS + PREPARANDO) */}
      {/* ========================================= */}
      <div className="w-full lg:w-3/5 flex flex-col bg-[#0f172a] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
        <div className="p-5 bg-black/40 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-3">
                <ChefHat className="text-[#E60000]" size={24} />
                <h3 className="font-black uppercase tracking-widest text-white">Cola de Producción</h3>
            </div>
            <span className="bg-white/10 text-white px-3 py-1 rounded-full text-xs font-bold font-mono">{inProcess.length} órdenes</span>
        </div>
        
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {inProcess.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                  <Clock size={48} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest">No hay pedidos en curso</p>
              </div>
          ) : (
            inProcess.map(o => (
              <div key={o.id} className={`rounded-2xl border transition-all shadow-lg overflow-hidden ${o.status === 'received' ? 'bg-white/5 border-white/10' : 'bg-blue-900/10 border-blue-500/30'}`}>
                
                {/* Cabecera del Ticket */}
                <div className="p-4 bg-black/40 border-b border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                      <span className="text-4xl font-black text-white tracking-tighter">#{o.short_id}</span>
                      <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{new Date(o.created_at).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mt-0.5 w-max ${o.origin === 'totem' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>{o.origin}</span>
                      </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border ${o.status === 'received' ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-blue-600 text-white border-blue-500 animate-pulse'}`}>
                      {o.status === 'received' ? 'Nuevo' : 'En Cocina'}
                  </div>
                </div>

                {/* Detalle del Pedido con Extras */}
                <div className="p-5 text-sm font-bold text-slate-300 space-y-3">
                  {o.ruta9_order_items.map((i:any) => (
                      <div key={i.id} className="pl-3 border-l-2 border-[#E60000]/50">
                          <div className="flex items-start text-white text-base">
                              <span className="text-[#E60000] mr-2">{i.quantity}x</span> 
                              <span>{i.ruta9_products.name}</span>
                          </div>
                          {i.modifiers_snapshot && i.modifiers_snapshot.length > 0 && (
                              <div className="text-yellow-500 text-xs font-bold uppercase tracking-wide mt-1 bg-yellow-500/10 inline-block px-2 py-1 rounded">
                                  + {i.modifiers_snapshot.map((m:any)=>m.name).join(', ')}
                              </div>
                          )}
                      </div>
                  ))}
                </div>

                {/* Acciones */}
                <div className="p-4 bg-black/60 border-t border-white/5 flex gap-3">
                  <button 
                      onClick={() => updateStatus(o.id, o.status === 'received' ? 'preparing' : 'ready')} 
                      className={`flex-1 font-black uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-95 ${o.status === 'received' ? 'bg-blue-600 text-white' : 'bg-[#E60000] text-white shadow-[0_0_20px_rgba(230,0,0,0.3)]'}`}
                  >
                      {o.status === 'received' ? <><Play size={18}/> Pasar a Cocina</> : <><CheckCircle2 size={18}/> Marcar Listo</>}
                  </button>
                  <button onClick={() => printTicket(o)} className="w-14 flex items-center justify-center bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-colors"><Printer size={20}/></button>
                  <button onClick={() => confirm('¿Está seguro de anular este pedido?') && updateStatus(o.id, 'cancelled')} className="w-14 flex items-center justify-center bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white border border-red-900/30 rounded-xl transition-colors"><XOctagon size={20}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* COLUMNA: PARA ENTREGAR (LISTOS) */}
      {/* ========================================= */}
      <div className="w-full lg:w-2/5 flex flex-col bg-gradient-to-b from-green-950/20 to-[#0f172a] rounded-3xl border border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.05)] overflow-hidden">
        <div className="p-5 bg-green-900/20 flex justify-between items-center border-b border-green-500/20">
            <div className="flex items-center gap-3">
                <MonitorDot className="text-green-500" size={24} />
                <h3 className="font-black uppercase tracking-widest text-green-500">Llamar Cliente</h3>
            </div>
            <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold font-mono">{ready.length} listos</span>
        </div>
        
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {ready.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-green-900/50">
                  <CheckCircle2 size={64} className="mb-4" />
                  <p className="font-bold uppercase tracking-widest text-sm">Mostrador Limpio</p>
              </div>
          ) : (
            ready.map(o => (
              <div key={o.id} className="bg-green-900/20 border border-green-500/30 rounded-2xl p-5 flex flex-col gap-5 shadow-[0_10px_30px_rgba(34,197,94,0.1)] hover:border-green-400 transition-colors">
                 <div className="flex justify-between items-start">
                     <div>
                         <div className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-1">Pedido Listo</div>
                         <div className="text-6xl font-black text-white tracking-tighter drop-shadow-lg">#{o.short_id}</div>
                     </div>
                     <button onClick={() => printTicket(o)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-green-400"><Printer size={20}/></button>
                 </div>
                 
                 <div className="bg-black/40 p-3 rounded-lg text-sm text-slate-300">
                    <span className="font-bold text-white">{o.ruta9_order_items.length}</span> items • Paga con <span className="font-bold uppercase">{o.payment_method}</span>
                 </div>

                 <button 
                    onClick={() => updateStatus(o.id, 'delivered')} 
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-xl flex items-center justify-center gap-3 text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.3)] active:scale-95 transition-all"
                 >
                    <CheckCircle2 size={24}/> Entregar
                 </button>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}