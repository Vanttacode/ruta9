// src/components/caja/POSSystem.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Trash2, Banknote, CreditCard, X, CheckSquare, Square, ShoppingCart } from 'lucide-react';

export default function POSSystem({ locationId, session }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Modales
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedMods, setSelectedMods] = useState<any[]>([]);
  
  // Estado del Checkout
  const [checkoutModal, setCheckoutModal] = useState<{ isOpen: boolean, method: 'efectivo' | 'tarjeta' | null }>({ isOpen: false, method: null });
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    supabase.from('ruta9_products').select('*, ruta9_product_modifiers_map(modifier_id)').eq('location_id', locationId).eq('is_active', true).then(({data}) => setProducts(data||[]));
    supabase.from('ruta9_modifiers').select('*').then(({data}) => setModifiers(data||[]));
  }, [locationId]);

  const total = cart.reduce((acc, i) => acc + (i.total_price * i.qty), 0);
  const vuelto = (typeof cashReceived === 'number' ? cashReceived : 0) - total;

  const handleProductClick = (p: any) => {
    if (p.has_modifiers && p.ruta9_product_modifiers_map && p.ruta9_product_modifiers_map.length > 0) {
      setSelectedProduct(p);
      setSelectedMods([]);
    } else {
      addToCart(p, []);
    }
  };

  const addToCart = (p: any, mods: any[]) => {
    const modsTotal = mods.reduce((sum, m) => sum + m.price, 0);
    const linePrice = p.base_price + modsTotal;
    const cartId = `${p.id}-${mods.map(m=>m.id).sort().join('-')}`;
    
    setCart(prev => {
      const exists = prev.find(i => i.cartId === cartId);
      if (exists) return prev.map(i => i.cartId === cartId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...p, cartId, qty: 1, selectedMods: mods, total_price: linePrice }];
    });
    setSelectedProduct(null);
  };

  // --- LÓGICA DE IMPRESIÓN (TICKET TÉRMICO) ---
  const printReceipt = (shortId: string, itemsToPrint: any[], finalTotal: number, method: string, received: number | '', change: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Por favor permita las ventanas emergentes (pop-ups) para imprimir el ticket.");
      return;
    }

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
        <div class="c text-xl">TICKET DE VENTA</div>
        <div class="line"></div>
        <div class="c b text-2xl">PEDIDO #${shortId}</div>
        <div class="line"></div>
        <div>Fecha: ${new Date().toLocaleString('es-CL')}</div>
        <div>Cajero: ${session?.ruta9_staff?.name || 'Caja'}</div>
        <div>Método: ${method.toUpperCase()}</div>
        <div class="line"></div>
        <table>
          ${itemsToPrint.map(i => `
            <tr>
              <td class="b">${i.qty}x ${i.name}</td>
              <td class="r">$${(i.total_price * i.qty).toLocaleString('es-CL')}</td>
            </tr>
            ${i.selectedMods?.length > 0 ? `<tr><td colspan="2" style="font-size: 12px; padding-left: 15px;">+ ${i.selectedMods.map((m:any)=>m.name).join(', ')}</td></tr>` : ''}
          `).join('')}
        </table>
        <div class="line"></div>
        <table>
          <tr><td class="b text-xl">TOTAL:</td><td class="r b text-xl">$${finalTotal.toLocaleString('es-CL')}</td></tr>
          ${method === 'efectivo' ? `
            <tr><td>Recibido:</td><td class="r">$${(received || 0).toLocaleString('es-CL')}</td></tr>
            <tr><td>Vuelto:</td><td class="r">$${change.toLocaleString('es-CL')}</td></tr>
          ` : ''}
        </table>
        <div class="line"></div>
        <div class="c">¡Gracias por su preferencia!</div>
        <div class="c">Retire su pedido en pantalla</div>
        <script>window.print(); setTimeout(()=>window.close(), 1000);</script>
      </body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const processCheckout = async () => {
    if (cart.length === 0 || !checkoutModal.method) return;
    
    if (checkoutModal.method === 'efectivo' && (typeof cashReceived !== 'number' || cashReceived < total)) {
        return alert("El monto recibido no puede ser menor al total.");
    }

    setIsProcessing(true);
    const shortId = Math.random().toString(36).substring(2, 5).toUpperCase();

    const { data: order, error } = await supabase.from('ruta9_orders').insert({
      short_id: shortId, location_id: locationId, total_amount: total,
      status: 'received', origin: 'cashier', payment_method: checkoutModal.method,
      staff_id: session.staff_id, cash_session_id: session.id
    }).select().single();

    if (error) {
        alert("Error al procesar la venta.");
        setIsProcessing(false);
        return;
    }

    if (order) {
      const items = cart.map(i => ({
        order_id: order.id, product_id: i.id, quantity: i.qty,
        unit_price: i.total_price, total_price: i.total_price * i.qty,
        modifiers_snapshot: i.selectedMods
      }));
      await supabase.from('ruta9_order_items').insert(items);
      
      // Lanzamos la impresión antes de limpiar el carrito para tener los datos
      printReceipt(shortId, cart, total, checkoutModal.method, cashReceived, vuelto);
      
      // Limpieza post-venta
      setCart([]);
      setCheckoutModal({ isOpen: false, method: null });
      setCashReceived('');
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex gap-6 h-full p-6 relative">
      
      {/* MODAL: SELECCIÓN DE EXTRAS */}
      {selectedProduct && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-up">
          <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/5 bg-black/40 flex gap-4 items-center">
              {selectedProduct.image_url ? <img src={selectedProduct.image_url} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center font-bold text-xs text-slate-500">NO PIC</div>}
              <div className="flex-1">
                  <h3 className="font-black text-2xl text-white tracking-tight">{selectedProduct.name}</h3>
                  <div className="text-[#E60000] font-bold">${selectedProduct.base_price.toLocaleString()}</div>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X/></button>
            </div>
            
            <div className="p-6 bg-[#050505]">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Seleccione Agregados (Opcional)</div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {modifiers.filter(m => (selectedProduct.ruta9_product_modifiers_map || []).some((map:any)=>map.modifier_id === m.id)).map(m => {
                    const active = selectedMods.find(sm => sm.id === m.id);
                    return (
                    <button key={m.id} onClick={() => active ? setSelectedMods(selectedMods.filter(sm=>sm.id!==m.id)) : setSelectedMods([...selectedMods, m])} className={`w-full flex justify-between items-center p-4 rounded-xl border transition-all ${active ? 'border-[#E60000] bg-[#E60000]/10 text-white' : 'border-white/5 bg-[#0f172a] hover:border-white/20 text-slate-400'}`}>
                        <div className="flex items-center gap-3">
                            {active ? <CheckSquare size={20} className="text-[#E60000]"/> : <Square size={20} className="text-slate-600"/>}
                            <span className="font-bold text-sm">{m.name}</span>
                        </div>
                        <span className={`font-mono font-bold ${active ? 'text-[#E60000]' : 'text-slate-500'}`}>+${m.price}</span>
                    </button>
                    )
                })}
                </div>
            </div>
            <div className="p-6 bg-[#0f172a] border-t border-white/5">
              <button onClick={() => addToCart(selectedProduct, selectedMods)} className="w-full bg-[#E60000] text-white font-black py-4 rounded-xl uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex justify-between px-8">
                  <span>Añadir al Pedido</span>
                  <span>${(selectedProduct.base_price + selectedMods.reduce((s,m)=>s+m.price,0)).toLocaleString()}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHECKOUT Y VUELTO */}
      {checkoutModal.isOpen && (
         <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-up">
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 bg-black/40 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        {checkoutModal.method === 'efectivo' ? <><Banknote className="text-green-500"/> Efectivo</> : <><CreditCard className="text-blue-500"/> Tarjeta</>}
                    </h2>
                    <button onClick={() => setCheckoutModal({isOpen: false, method: null})} className="text-slate-500 hover:text-white"><X/></button>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="text-center">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total a Pagar</div>
                        <div className="text-5xl font-black text-white font-mono">${total.toLocaleString()}</div>
                    </div>

                    {checkoutModal.method === 'efectivo' && (
                        <div className="space-y-4 pt-6 border-t border-white/5">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Efectivo Recibido</label>
                                <input 
                                    type="number" 
                                    autoFocus
                                    placeholder="Ingrese monto..."
                                    value={cashReceived}
                                    onChange={(e) => setCashReceived(parseInt(e.target.value) || '')}
                                    className="w-full bg-black/40 border border-white/10 text-white font-mono text-2xl p-4 rounded-xl text-center outline-none focus:border-green-500"
                                />
                            </div>
                            
                            <div className="grid grid-cols-4 gap-2">
                                {[20000, 10000, 5000, 2000].map(b => (
                                    <button key={b} onClick={() => setCashReceived(b)} className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg py-2 text-xs font-bold font-mono text-green-400">${b/1000}k</button>
                                ))}
                                <button onClick={() => setCashReceived(total)} className="col-span-4 bg-green-500/10 text-green-500 hover:bg-green-500/20 border border-green-500/20 rounded-lg py-2 text-xs font-bold uppercase tracking-widest">Monto Exacto</button>
                            </div>

                            <div className="bg-[#050505] p-4 rounded-xl border border-white/5 flex justify-between items-center">
                                <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Vuelto</span>
                                <span className={`text-2xl font-black font-mono ${vuelto < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    ${vuelto > 0 ? vuelto.toLocaleString() : '0'}
                                </span>
                            </div>
                        </div>
                    )}

                    {checkoutModal.method === 'tarjeta' && (
                        <div className="pt-6 border-t border-white/5 text-center space-y-4">
                            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <CreditCard size={40} className="text-blue-500" />
                            </div>
                            <p className="text-slate-300 font-medium">Procese el pago de <strong className="text-white">${total.toLocaleString()}</strong> en el terminal.</p>
                            <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest bg-yellow-500/10 py-2 rounded-lg">Asegúrese de que sea aprobada.</p>
                        </div>
                    )}

                    <button 
                        onClick={processCheckout}
                        disabled={isProcessing || (checkoutModal.method === 'efectivo' && (typeof cashReceived !== 'number' || cashReceived < total))}
                        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-lg flex items-center justify-center gap-2 transition-all ${
                            (checkoutModal.method === 'efectivo' && typeof cashReceived === 'number' && cashReceived >= total) || checkoutModal.method === 'tarjeta' 
                            ? 'bg-green-600 text-white hover:brightness-110 active:scale-95' 
                            : 'bg-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        {isProcessing ? 'Procesando e Imprimiendo...' : checkoutModal.method === 'efectivo' ? 'Confirmar Pago' : 'Pago Aprobado'}
                    </button>
                </div>
            </div>
         </div>
      )}

      {/* GRILLA PRINCIPAL */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="Buscar producto por nombre..." className="w-full bg-white/5 border border-white/10 p-4 pl-12 rounded-2xl text-white outline-none focus:border-[#E60000] focus:ring-1 focus:ring-[#E60000] transition-all" onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto pb-20 pr-2">
          {products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
            <button key={p.id} onClick={() => handleProductClick(p)} className="bg-[#0f172a] rounded-2xl border border-white/5 hover:border-[#E60000] transition-all flex flex-col overflow-hidden group text-left shadow-lg">
              <div className="w-full h-28 bg-black/40 relative overflow-hidden">
                {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/> : <div className="w-full h-full flex items-center justify-center text-slate-700 font-bold tracking-widest">RUTA9</div>}
                {p.has_modifiers && <div className="absolute bottom-2 right-2 bg-[#E60000] text-[9px] px-2 py-1 rounded-md font-black text-white uppercase tracking-widest shadow-md">Extras</div>}
              </div>
              <div className="p-4">
                <div className="font-bold text-white text-sm leading-tight mb-2 group-hover:text-[#E60000] transition-colors">{p.name}</div>
                <div className="text-slate-300 font-mono font-black">${p.base_price.toLocaleString()}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CARRITO */}
      <aside className="w-[380px] bg-[#0f172a] rounded-3xl border border-white/5 flex flex-col overflow-hidden shadow-2xl">
        <div className="p-5 bg-black/40 border-b border-white/5 flex justify-between items-center">
            <span className="font-black uppercase text-sm tracking-widest text-white">Orden Actual</span>
            {cart.length > 0 && <span className="bg-[#E60000] text-white text-xs font-bold px-2 py-1 rounded-md">{cart.length} items</span>}
        </div>
        
        <div className="flex-1 overflow-auto p-5 space-y-3">
          {cart.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <ShoppingCart size={48} className="opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest text-center">Seleccione productos<br/>para comenzar</p>
             </div>
          ) : (
            cart.map(item => (
                <div key={item.cartId} className="bg-white/5 p-4 rounded-xl border border-white/5 relative group">
                <div className="flex justify-between items-start text-sm">
                    <span className="font-bold text-white pr-4 leading-tight"><span className="text-[#E60000] mr-2 text-base">{item.qty}x</span>{item.name}</span>
                    <span className="font-mono text-white font-black">${(item.total_price * item.qty).toLocaleString()}</span>
                </div>
                {item.selectedMods.length > 0 && <div className="text-[11px] text-yellow-500 font-bold mt-2 uppercase tracking-wide bg-yellow-500/10 p-1.5 rounded inline-block">+ {item.selectedMods.map((m:any)=>m.name).join(', ')}</div>}
                <button onClick={() => setCart(cart.filter(i => i.cartId !== item.cartId))} className="absolute -top-2 -right-2 bg-red-900 text-white rounded-full p-1.5 hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"><X size={14}/></button>
                </div>
            ))
          )}
        </div>

        <div className="p-6 bg-[#050505] border-t border-white/5 space-y-4">
          <div className="flex justify-between items-end mb-2">
              <span className="font-bold text-slate-400 uppercase tracking-widest text-sm">Total a Pagar</span>
              <span className="font-black text-4xl text-white font-mono">${total.toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => setCheckoutModal({isOpen: true, method: 'efectivo'})} 
                disabled={cart.length === 0}
                className="bg-green-600 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex flex-col items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg"
            >
                <Banknote size={24}/> Efectivo
            </button>
            <button 
                onClick={() => setCheckoutModal({isOpen: true, method: 'tarjeta'})} 
                disabled={cart.length === 0}
                className="bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest flex flex-col items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg"
            >
                <CreditCard size={24}/> Tarjeta
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}