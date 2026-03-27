// src/components/home/Header.tsx
import { useState, useEffect } from 'react';

export default function Header() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = time.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  return (
    <header className="flex justify-between items-center px-8 py-5 bg-slate-950 border-b border-slate-800 shadow-md z-20">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.4)]">
           <span className="text-3xl font-black text-white">M</span>
        </div>
        <h1 className="text-3xl font-bold tracking-widest text-slate-200">MILODON<span className="text-blue-500">VENDING</span></h1>
      </div>
      
      <div className="flex items-center gap-6">
        <svg className="w-8 h-8 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3C7.95 3 4.21 4.34 1.2 6.6L3 9C5.5 7.12 8.62 6 12 6C15.38 6 18.5 7.12 21 9L22.8 6.6C19.79 4.34 16.05 3 12 3ZM12 9C9.3 9 6.81 9.86 4.8 11.28L6.6 13.68C8.13 12.63 9.98 12 12 12C14.02 12 15.87 12.63 17.4 13.68L19.2 11.28C17.19 9.86 14.7 9 12 9ZM12 15C10.6 15 9.32 15.43 8.3 16.15L12 21L15.7 16.15C14.68 15.43 13.4 15 12 15Z"/></svg>
        <div className="text-3xl font-mono text-slate-300 font-medium tracking-wider">{formattedTime}</div>
      </div>
    </header>
  );
}