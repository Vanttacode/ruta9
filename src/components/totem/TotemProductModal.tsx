// src/components/totem/TotemProductModal.tsx
import { useState, useMemo } from 'react';
import { addToCart, type Product } from '../../store/cartStore';

interface Mod {
  id: string;
  name: string;
  price: number;
}

interface Props {
  product: Product;
  modifiers: Mod[];
  onClose: () => void;
}

export default function TotemProductModal({ product, modifiers, onClose }: Props) {
  // Guardamos los modificadores seleccionados en un array
  const [selectedMods, setSelectedMods] = useState<Mod[]>([]);

  // Calcula el precio dinámico en tiempo real
  const currentTotal = useMemo(() => {
    const modsTotal = selectedMods.reduce((sum, mod) => sum + mod.price, 0);
    return product.base_price + modsTotal;
  }, [product, selectedMods]);

  const toggleModifier = (mod: Mod) => {
    setSelectedMods(prev => {
      const exists = prev.find(m => m.id === mod.id);
      if (exists) return prev.filter(m => m.id !== mod.id); // Lo quita
      return [...prev, mod]; // Lo agrega
    });
  };

  const handleConfirm = () => {
    // Agregamos al carrito Global enviando el array de modificadores seleccionados
    addToCart(product, selectedMods);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-12 bg-black/90 backdrop-blur-md animate-fade-in-up touch-none">
      
      {/* Contenedor Principal (Layout Split-Screen) */}
      <div className="w-full max-w-6xl h-[80vh] bg-slate-900 border border-slate-700 rounded-[3rem] overflow-hidden flex shadow-[0_0_60px_rgba(0,0,0,0.8)]">
        
        {/* Mitad Izquierda: Visual y Descripción */}
        <div className="w-1/2 bg-slate-950 p-12 flex flex-col justify-center items-center relative">
          <div className="absolute top-8 left-8 text-slate-500 font-bold tracking-widest uppercase">
            Personaliza tu Pedido
          </div>
          <div className="w-full aspect-square mb-8 p-4 bg-slate-900 rounded-[2rem] flex items-center justify-center shadow-inner">
             {product.image_url ? (
               <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
             ) : (
               <span className="text-slate-700 font-black text-3xl">SIN IMAGEN</span>
             )}
          </div>
          <h2 className="text-5xl font-black text-white text-center leading-tight">{product.name}</h2>
          <div className="text-4xl font-bold text-[#E60000] mt-4">${product.base_price}</div>
        </div>

        {/* Mitad Derecha: Modificadores y Checkout */}
        <div className="w-1/2 p-12 flex flex-col bg-slate-900">
          <div className="flex justify-between items-center mb-8">
             <h3 className="text-3xl font-black text-white uppercase tracking-tight">Agrega Extras</h3>
             <button onClick={onClose} className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 active:bg-slate-700 touch-target">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
          </div>

          {/* Lista de Extras (Toggles Masivos) */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-4">
            {modifiers.length === 0 ? (
                <p className="text-slate-500 text-xl font-medium">No hay extras disponibles por ahora.</p>
            ) : (
                modifiers.map(mod => {
                  const isSelected = selectedMods.some(m => m.id === mod.id);
                  return (
                    <button
                      key={mod.id}
                      onClick={() => toggleModifier(mod)}
                      className={`w-full flex justify-between items-center p-6 rounded-2xl border-2 transition-all touch-target ${
                        isSelected 
                          ? 'bg-[#E60000]/10 border-[#E60000] shadow-[0_0_20px_rgba(230,0,0,0.2)]' 
                          : 'bg-slate-950 border-slate-800 active:bg-slate-800'
                      }`}
                    >
                      <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {mod.name}
                      </span>
                      <div className="flex items-center gap-6">
                        <span className={`text-2xl font-black ${isSelected ? 'text-[#E60000]' : 'text-slate-500'}`}>
                          + ${mod.price}
                        </span>
                        {/* Indicador Visual Táctil (Check) */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${isSelected ? 'bg-[#E60000] border-[#E60000]' : 'border-slate-700 bg-transparent'}`}>
                           {isSelected && <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>}
                        </div>
                      </div>
                    </button>
                  );
                })
            )}
          </div>

          {/* Botón de Confirmación */}
          <div className="mt-8 pt-8 border-t border-slate-800">
             <button 
               onClick={handleConfirm}
               className="w-full bg-[#E60000] text-white flex justify-between items-center p-8 rounded-2xl active:scale-95 shadow-[0_10px_40px_rgba(230,0,0,0.4)] transition-transform touch-target"
             >
                <span className="text-3xl font-black uppercase tracking-widest">Añadir</span>
                <span className="text-4xl font-black">${currentTotal}</span>
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}