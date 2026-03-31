/// src/components/totem/TotemMenu.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingCart, Trash2, CheckCircle, XCircle, ChevronRight, Plus, X, ArrowLeft, CreditCard, Menu } from 'lucide-react';
import { cartItems, cartTotal, addToCart, removeFromCart, clearCart, type Product } from '../../store/cartStore';
import { useCheckout } from '../../hooks/useCheckout';

// ============================================================================
// SUB-COMPONENTE: MODAL DE EXTRAS
// ============================================================================
const ModifierModal = ({ product, modifiers, onClose }: any) => {
  const [selectedMods, setSelectedMods] = useState<any[]>([]);

  const currentTotal = useMemo(() => {
    return product.base_price + selectedMods.reduce((sum, mod) => sum + mod.price, 0);
  }, [product, selectedMods]);

  const toggleMod = (mod: any) => {
    setSelectedMods(prev => prev.find(m => m.id === mod.id) ? prev.filter(m => m.id !== mod.id) : [...prev, mod]);
  };

  const availableMods = modifiers.filter((m: any) => 
    (product.ruta9_product_modifiers_map || []).some((map: any) => map.modifier_id === m.id)
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-xl animate-fade-in p-4 md:p-0">
      <div className="w-full h-[90vh] md:h-[85vh] md:max-w-7xl bg-[#0a0a0a] rounded-[2rem] md:rounded-[3rem] overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(230,0,0,0.15)] border border-white/5 animate-slide-up relative">
        
        <button onClick={onClose} className="absolute top-4 left-4 md:top-8 md:left-8 z-50 w-12 h-12 md:w-16 md:h-16 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white/50 active:bg-white/10 active:text-white transition-all border border-white/10">
            <ArrowLeft size={24} className="md:w-8 md:h-8" />
        </button>

        {/* Izquierda: Visualización */}
        <div className="w-full md:w-1/2 bg-gradient-to-b md:bg-gradient-to-br from-[#1a1a1a] to-[#050505] p-6 md:p-12 flex flex-col justify-center items-center relative border-b md:border-b-0 md:border-r border-white/5 h-1/3 md:h-full">
          <div className="w-24 h-24 md:w-full md:max-w-sm aspect-square md:mb-8 p-4 md:p-8 bg-black/40 rounded-3xl md:rounded-[3rem] flex items-center justify-center shadow-inner relative">
             <div className="absolute inset-0 bg-[#E60000]/5 rounded-[3rem] blur-2xl"></div>
             {product.image_url ? (
               <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain drop-shadow-2xl relative z-10" />
             ) : (
               <span className="text-white/10 font-black text-3xl md:text-6xl uppercase tracking-widest relative z-10">R9</span>
             )}
          </div>
          <h2 className="text-2xl md:text-6xl font-black text-white text-center leading-tight tracking-tighter mt-4 md:mt-0">{product.name}</h2>
          {product.description && <p className="hidden md:block text-slate-400 text-center mt-4 text-xl max-w-md">{product.description}</p>}
        </div>

        {/* Derecha: Configuración */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col bg-[#050505] h-2/3 md:h-full">
          <div className="mb-4 md:mb-8">
             <h3 className="text-xl md:text-3xl font-black text-white uppercase tracking-tight">Personaliza tu pedido</h3>
             <p className="text-slate-500 text-sm md:text-lg uppercase tracking-widest font-bold mt-1 md:mt-2">Agrega los extras que quieras</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 md:space-y-4 pr-2 scroll-smooth">
            {availableMods.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-600 text-lg md:text-2xl font-black uppercase tracking-widest text-center">
                    Sin extras configurados
                </div>
            ) : (
                availableMods.map((mod: any) => {
                  const isSelected = selectedMods.some(m => m.id === mod.id);
                  return (
                    <button key={mod.id} onClick={() => toggleMod(mod)} className={`w-full flex justify-between items-center p-4 md:p-8 rounded-2xl md:rounded-[2rem] border-2 transition-all active:scale-[0.98] ${isSelected ? 'bg-[#E60000]/10 border-[#E60000] shadow-[0_0_30px_rgba(230,0,0,0.15)]' : 'bg-[#0f172a] border-white/5 active:bg-white/10'}`}>
                      <span className={`text-lg md:text-3xl font-black tracking-tight ${isSelected ? 'text-white' : 'text-slate-400'}`}>{mod.name}</span>
                      <div className="flex items-center gap-3 md:gap-6">
                        <span className={`text-lg md:text-3xl font-black font-mono ${isSelected ? 'text-[#E60000]' : 'text-slate-600'}`}>+${mod.price.toLocaleString('es-CL')}</span>
                        <div className={`w-6 h-6 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 md:border-[3px] transition-colors ${isSelected ? 'bg-[#E60000] border-[#E60000]' : 'border-slate-700 bg-transparent'}`}>
                           {isSelected && <CheckCircle className="text-white w-4 h-4 md:w-7 md:h-7" />}
                        </div>
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-white/10">
             <button onClick={() => { addToCart(product, selectedMods); onClose(); }} className="w-full bg-[#E60000] text-white flex justify-between items-center p-4 md:p-8 rounded-2xl md:rounded-[2rem] active:scale-[0.98] shadow-[0_10px_30px_rgba(230,0,0,0.3)] md:shadow-[0_20px_50px_rgba(230,0,0,0.3)] transition-transform">
                <span className="text-xl md:text-4xl font-black uppercase tracking-widest">Añadir</span>
                <span className="text-2xl md:text-5xl font-black font-mono">${currentTotal.toLocaleString('es-CL')}</span>
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// ============================================================================
// COMPONENTE PRINCIPAL: TOTEM MENU (RESPONSIVO TEMPORAL)
// ============================================================================
export default function TotemMenu({ locationId, categories, products, modifiers }: any) {
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id || null);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Toggle categorias móvil
  const [mobileCartOpen, setMobileCartOpen] = useState(false); // Toggle carrito móvil
  
  const items = useStore(cartItems);
  const total = useStore(cartTotal);
  const { status, errorMsg, orderId, startPayment, setStatus } = useCheckout(locationId);

  const resetTimer = useCallback(() => {
    clearTimeout((window as any).kioskTimer);
    if (items.length > 0 || modalProduct) {
        (window as any).kioskTimer = setTimeout(() => {
        clearCart();
        window.location.href = '/totem-welcome';
        }, 60000);
    }
  }, [items.length, modalProduct]);

  useEffect(() => {
    resetTimer();
    const evts = ['touchstart', 'click'];
    evts.forEach(e => window.addEventListener(e, resetTimer));
    return () => evts.forEach(e => window.removeEventListener(e, resetTimer));
  }, [resetTimer]);

  useEffect(() => {
    let successTimer: any;
    if (status === 'SUCCESS') {
      successTimer = setTimeout(() => {
        setStatus('IDLE');
        clearCart();
        window.location.href = '/totem-welcome';
      }, 5000);
    }
    return () => clearTimeout(successTimer);
  }, [status]);

  const visibleProducts = products.filter((p: Product) => p.category_id === activeCategory);

  const handleProductTap = (p: Product) => {
    const hasMappedMods = p.has_modifiers && (p.ruta9_product_modifiers_map?.length > 0);
    if (hasMappedMods) {
        setModalProduct(p);
    } else {
        addToCart(p, []);
    }
  };

  // --- VISTAS DE PAGO ---
  if (status !== 'IDLE') {
    return (
      <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-4 md:p-8">
        
        {status === 'PROCESSING' && (
          <div className="animate-fade-in-up flex flex-col items-center max-w-3xl">
            <div className="relative w-32 h-32 md:w-64 md:h-64 mb-8 md:mb-16">
                <div className="absolute inset-0 border-[8px] md:border-[16px] border-white/5 rounded-full"></div>
                <div className="absolute inset-0 border-[8px] md:border-[16px] border-[#E60000] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center"><CreditCard className="text-[#E60000] animate-pulse w-12 h-12 md:w-20 md:h-20"/></div>
            </div>
            <h2 className="text-4xl md:text-7xl font-black text-white mb-4 md:mb-6 uppercase tracking-tighter">Procesando Pago</h2>
            <p className="text-lg md:text-4xl text-slate-400 font-medium px-4">Acerque o inserte su tarjeta en el terminal.</p>
            <div className="mt-10 md:mt-20 px-8 py-4 md:px-16 md:py-8 bg-white/5 rounded-2xl md:rounded-[3rem] border border-white/10">
                <div className="text-sm md:text-2xl text-slate-500 font-black uppercase tracking-widest mb-1 md:mb-2">Monto a Pagar</div>
                <div className="text-4xl md:text-8xl font-black text-white font-mono">${total.toLocaleString('es-CL')}</div>
            </div>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="animate-fade-in-up bg-[#0A0A0A] p-8 md:p-24 rounded-3xl md:rounded-[4rem] border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)] md:shadow-[0_0_150px_rgba(34,197,94,0.15)] max-w-4xl w-full">
            <div className="w-24 h-24 md:w-56 md:h-56 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-12 shadow-[0_0_40px_rgba(34,197,94,0.5)] md:shadow-[0_0_80px_rgba(34,197,94,0.5)]">
              <CheckCircle className="text-white w-12 h-12 md:w-32 md:h-32" />
            </div>
            <h2 className="text-4xl md:text-7xl font-black text-white mb-4 md:mb-6 uppercase tracking-tighter">¡Pago Exitoso!</h2>
            <p className="text-lg md:text-3xl text-slate-400 mb-8 md:mb-16 font-bold">Retire su comprobante.</p>
            
            <div className="bg-black/50 p-6 md:p-12 rounded-2xl md:rounded-[3rem] border border-white/5 mb-8 md:mb-16 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 md:h-2 bg-green-500"></div>
                <div className="text-sm md:text-2xl font-black tracking-widest md:tracking-[0.4em] text-slate-500 uppercase mb-2 md:mb-4">Número de Pedido</div>
                <div className="text-6xl md:text-[160px] leading-none font-black text-white font-mono drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">{orderId}</div>
            </div>
            
            <button onClick={() => { setStatus('IDLE'); clearCart(); window.location.href = '/totem-welcome'; }} className="w-full bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 text-white text-xl md:text-4xl font-black py-4 md:py-12 rounded-xl md:rounded-[2rem] transition-colors uppercase tracking-widest">
                Finalizar
            </button>
          </div>
        )}

        {status === 'ERROR' && (
          <div className="animate-fade-in-up max-w-3xl">
            <div className="w-24 h-24 md:w-56 md:h-56 bg-red-900/50 rounded-full border-[4px] md:border-[8px] border-red-500 flex items-center justify-center mx-auto mb-6 md:mb-12 shadow-[0_0_40px_rgba(220,38,38,0.4)] md:shadow-[0_0_80px_rgba(220,38,38,0.4)]">
              <XCircle className="text-red-500 w-12 h-12 md:w-24 md:h-24" />
            </div>
            <h2 className="text-4xl md:text-7xl font-black text-white mb-4 md:mb-6 uppercase tracking-tighter">Rechazado</h2>
            <p className="text-lg md:text-4xl text-slate-400 mb-10 md:mb-20">{errorMsg}</p>
            <button onClick={() => setStatus('IDLE')} className="w-full bg-[#E60000] text-white text-xl md:text-4xl font-black py-4 md:py-12 rounded-xl md:rounded-[2rem] active:scale-95 transition-transform uppercase tracking-widest shadow-[0_10px_30px_rgba(230,0,0,0.4)] md:shadow-[0_20px_50px_rgba(230,0,0,0.4)]">
                Intentar Nuevamente
            </button>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA PRINCIPAL (CATÁLOGO) ---
  return (
    <>
      {modalProduct && <ModifierModal product={modalProduct} modifiers={modifiers} onClose={() => setModalProduct(null)} />}
      
      <div className="flex flex-col md:flex-row h-screen w-screen bg-[#020617] overflow-hidden">
        
        {/* HEADER MÓVIL (Solo visible en pantallas pequeñas) */}
        <header className="md:hidden flex justify-between items-center p-4 bg-[#0f172a] border-b border-white/5 shadow-md">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white bg-white/5 rounded-lg border border-white/10">
                <Menu size={24} />
            </button>
            <img src="/images/logo-ruta9.png" alt="RUTA9" className="h-8 object-contain" />
            <button onClick={() => setMobileCartOpen(!mobileCartOpen)} className="p-2 text-white bg-[#E60000]/20 border border-[#E60000]/50 rounded-lg relative">
                <ShoppingCart size={24} className="text-[#E60000]" />
                {items.length > 0 && <span className="absolute -top-2 -right-2 bg-[#E60000] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{items.length}</span>}
            </button>
        </header>

        {/* SIDEBAR: CATEGORÍAS (Oculto en móvil a menos que se abra) */}
        <nav className={`${mobileMenuOpen ? 'flex' : 'hidden'} md:flex absolute md:relative w-full md:w-[300px] h-[calc(100vh-64px)] md:h-full bg-[#0f172a] border-r border-white/5 flex-col z-40 md:z-10 shadow-2xl transition-all`}>
          <div className="hidden md:flex h-40 items-center justify-center border-b border-white/5 bg-black/20">
              <img src="/images/logo-ruta9.png" alt="RUTA9" className="w-48 object-contain drop-shadow-[0_0_30px_rgba(230,0,0,0.3)]" />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 md:space-y-4 p-4 md:p-8 scroll-smooth">
            {categories.map((cat: any) => (
              <button 
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); setMobileMenuOpen(false); }}
                className={`w-full text-left px-6 py-4 md:px-8 md:py-10 rounded-xl md:rounded-[2rem] font-black text-lg md:text-2xl transition-all uppercase tracking-widest active:scale-95 ${activeCategory === cat.id ? 'bg-[#E60000] text-white shadow-[0_10px_20px_rgba(230,0,0,0.4)] md:shadow-[0_15px_30px_rgba(230,0,0,0.4)]' : 'bg-black/20 text-slate-500 border border-white/5 active:bg-white/5'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>

        {/* ÁREA CENTRAL: PRODUCTOS */}
        <section className="flex-1 h-full overflow-y-auto p-4 md:p-12 relative scroll-smooth pb-32 md:pb-40">
          <h2 className="text-2xl md:text-6xl font-black text-white uppercase tracking-tighter mb-6 md:mb-12 flex items-center gap-4 md:gap-6">
            {categories.find((c:any) => c.id === activeCategory)?.name || 'Menú'}
            <div className="flex-1 h-1 bg-white/5 rounded-full"></div>
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-10">
            {visibleProducts.map((p: Product) => (
              <button 
                key={p.id}
                onClick={() => handleProductTap(p)}
                className="group bg-[#0f172a] border border-white/5 rounded-2xl md:rounded-[3rem] p-4 md:p-8 flex md:flex-col items-center md:items-center transition-all active:scale-95 active:border-[#E60000] active:bg-black/40 relative overflow-hidden shadow-lg hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              >
                {p.has_modifiers && (p.ruta9_product_modifiers_map?.length > 0) && (
                   <div className="absolute top-2 right-2 md:top-6 md:right-6 bg-[#E60000] text-white text-[10px] md:text-sm font-black px-2 py-1 md:px-5 md:py-2 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1 md:gap-2 z-10">
                     <Plus className="w-3 h-3 md:w-4 md:h-4" strokeWidth={3} /> <span className="hidden md:inline">Extras</span>
                   </div>
                )}
                <div className="w-24 h-24 md:w-full md:aspect-square bg-black/30 rounded-xl md:rounded-[2rem] md:mb-8 p-2 md:p-8 flex shrink-0 items-center justify-center relative overflow-hidden mr-4 md:mr-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {p.image_url ? (
                     <img src={p.image_url} alt={p.name} className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-500 ease-out relative z-10" />
                  ) : (
                     <span className="text-slate-700 font-black text-xl md:text-4xl uppercase tracking-widest">R9</span>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-center items-start md:items-center text-left md:text-center w-full">
                    <h3 className="text-lg md:text-4xl font-bold text-white leading-tight md:mb-4 tracking-tight">{p.name}</h3>
                    <div className="mt-2 md:mt-auto text-xl md:text-4xl font-black text-[#E60000] font-mono bg-[#E60000]/10 px-4 py-1 md:px-8 md:py-3 rounded-full border border-[#E60000]/20">
                    ${p.base_price.toLocaleString('es-CL')}
                    </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* SIDEBAR: CARRITO (Oculto en móvil a menos que se abra) */}
        <aside className={`${mobileCartOpen ? 'flex' : 'hidden'} md:flex absolute md:relative right-0 w-full md:w-[450px] h-[calc(100vh-64px)] md:h-full bg-[#0a0a0a] border-l border-white/5 flex-col z-40 md:z-20 shadow-[-10px_0_50px_rgba(0,0,0,0.5)] md:shadow-[-30px_0_100px_rgba(0,0,0,0.5)]`}>
          <div className="h-20 md:h-40 px-6 md:px-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-b from-[#111] to-[#0a0a0a]">
            <div>
                <h2 className="text-xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2 md:gap-4">
                <ShoppingCart className="text-[#E60000] w-6 h-6 md:w-8 md:h-8" /> Tu Pedido
                </h2>
                <div className="text-slate-500 font-bold uppercase tracking-widest text-[10px] md:text-sm mt-1">{items.length} items seleccionados</div>
            </div>
            {items.length > 0 && (
              <button onClick={clearCart} className="w-10 h-10 md:w-14 md:h-14 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center active:bg-red-600 active:text-white transition-colors border border-red-900/30">
                  <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 scroll-smooth">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center px-4 md:px-10 opacity-50">
                <ShoppingCart className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-8" />
                <p className="text-xl md:text-3xl font-black uppercase tracking-widest leading-snug">El carrito<br/>está vacío</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-[#0f172a] border border-white/5 rounded-xl md:rounded-[2rem] p-4 md:p-6 relative overflow-hidden group shadow-lg">
                  <div className="flex gap-4 md:gap-6 items-start">
                    <div className="w-10 h-10 md:w-16 md:h-16 bg-black/40 rounded-lg md:rounded-2xl flex items-center justify-center text-xl md:text-3xl font-black text-[#E60000] border border-white/5">
                        {item.quantity}
                    </div>
                    <div className="flex-1 pr-6">
                        <h4 className="text-sm md:text-2xl font-bold text-white leading-tight mb-1">{item.product.name}</h4>
                        <div className="text-lg md:text-2xl font-black text-white/50 font-mono">${(item.lineTotal).toLocaleString('es-CL')}</div>
                        {item.modifiers?.length > 0 && (
                        <div className="mt-2 md:mt-3 flex flex-wrap gap-1 md:gap-2">
                            {item.modifiers.map((m:any) => (
                                <span key={m.id} className="text-[9px] md:text-[11px] font-black uppercase tracking-widest bg-yellow-500/10 text-yellow-500 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border border-yellow-500/20">
                                    + {m.name}
                                </span>
                            ))}
                        </div>
                        )}
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="absolute top-0 right-0 w-10 h-10 md:w-16 md:h-16 bg-red-500/10 text-red-500 rounded-bl-xl md:rounded-bl-[2rem] flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 active:bg-red-600 active:text-white transition-all">
                    <X className="w-5 h-5 md:w-6 md:h-6" strokeWidth={3} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* CHECKOUT AREA */}
          <div className="p-6 md:p-10 bg-black border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] md:shadow-[0_-30px_60px_rgba(0,0,0,0.5)] z-10 relative">
            <div className="absolute top-0 left-6 right-6 md:left-10 md:right-10 h-[1px] bg-gradient-to-r from-transparent via-[#E60000] to-transparent opacity-50"></div>
            <div className="flex justify-between items-end mb-4 md:mb-10">
              <span className="text-sm md:text-2xl text-slate-500 font-black uppercase tracking-widest">Total</span>
              <span className="text-3xl md:text-6xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(230,0,0,0.3)] md:drop-shadow-[0_0_20px_rgba(230,0,0,0.3)]">${total.toLocaleString('es-CL')}</span>
            </div>
            <button 
              onClick={() => { startPayment(); setMobileCartOpen(false); }}
              disabled={items.length === 0}
              className={`w-full flex items-center justify-center gap-3 md:gap-6 py-4 md:py-10 rounded-xl md:rounded-[3rem] text-xl md:text-4xl font-black uppercase tracking-widest transition-all active:scale-95 ${
                items.length > 0 
                  ? 'bg-[#E60000] text-white shadow-[0_10px_30px_rgba(230,0,0,0.4)] md:shadow-[0_20px_60px_rgba(230,0,0,0.4)]' 
                  : 'bg-white/5 text-slate-600 pointer-events-none'
              }`}
            >
              Pagar <ChevronRight className="w-6 h-6 md:w-12 md:h-12" strokeWidth={3} />
            </button>
          </div>
        </aside>

        {/* BOTÓN FLOTANTE CARRITO (Móvil) */}
        {!mobileCartOpen && items.length > 0 && (
            <button 
                onClick={() => setMobileCartOpen(true)}
                className="md:hidden fixed bottom-6 right-6 bg-[#E60000] text-white p-4 rounded-full shadow-[0_10px_30px_rgba(230,0,0,0.5)] flex items-center justify-center z-30"
            >
                <ShoppingCart size={28} />
                <span className="absolute -top-2 -right-2 bg-black text-white border border-white/20 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                    {items.length}
                </span>
            </button>
        )}

      </div>
    </>
  );
}