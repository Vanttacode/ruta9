// src/components/home/Screensaver.tsx
export default function Screensaver() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-black text-white cursor-pointer animate-fade-in touch-none">
       <h1 className="text-7xl font-bold mb-8 tracking-widest text-slate-300">BIENVENIDO</h1>
       <p className="text-5xl text-blue-400 animate-pulse">Toque la pantalla para empezar</p>
    </div>
  );
}