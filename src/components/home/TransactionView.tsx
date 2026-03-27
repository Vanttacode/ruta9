// src/components/home/TransactionView.tsx
import type { Product } from './ProductCard';

interface TransactionViewProps {
  status: 'PROCESSING' | 'SUCCESS' | 'ERROR';
  product: Product | null;
  onCancel: () => void;
}

export default function TransactionView({ status, product, onCancel }: TransactionViewProps) {
  if (status === 'PROCESSING') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 animate-fade-in z-10">
        <div className="w-28 h-28 border-[10px] border-slate-700 border-t-blue-500 rounded-full animate-spin mb-10 shadow-[0_0_30px_rgba(59,130,246,0.2)]"></div>
        <h2 className="text-5xl font-bold mb-6">Autorizando Pago...</h2>
        <p className="text-3xl text-slate-400">Acerque su tarjeta o teléfono al lector MDB</p>
        <p className="text-6xl text-blue-400 font-bold mt-10">${product?.price}</p>
        <button 
          onClick={onCancel}
          className="mt-20 px-12 py-6 bg-slate-800 border border-slate-700 rounded-full text-2xl text-slate-300 active:scale-95 transition-transform"
        >
          Cancelar Operación
        </button>
      </div>
    );
  }

  if (status === 'SUCCESS') {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 animate-fade-in z-10">
        <div className="w-40 h-40 bg-emerald-500 rounded-full flex items-center justify-center mb-10 shadow-[0_0_60px_rgba(16,185,129,0.5)]">
          <svg className="w-20 h-20 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-6xl font-bold text-white mb-6">¡Compra Exitosa!</h2>
        <p className="text-4xl text-emerald-200">Retire su producto en la bandeja inferior</p>
      </div>
    );
  }

  return null;
}