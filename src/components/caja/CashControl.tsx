// src/components/caja/CashControl.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Lock, Unlock, UserCheck, Wallet, Calculator, Printer, X, Plus, Minus, CheckCircle2 } from 'lucide-react';

const DENOMINATIONS = [20000, 10000, 5000, 2000, 1000, 500, 100, 50, 10];

export default function CashControl({ locationId, session, onRefresh }: any) {
  const [rut, setRut] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado del Modal de Conteo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});
  
  // El monto final declarado tras usar el modal
  const [declaredAmount, setDeclaredAmount] = useState<number | null>(null);
  
  // Estadísticas de ventas para el Cierre
  const [stats, setStats] = useState({ totem: 0, posCash: 0, posCard: 0 });

  // Cargar estadísticas si hay una sesión abierta
  useEffect(() => {
    if (session) {
      const fetchStats = async () => {
        const { data } = await supabase
          .from('ruta9_orders')
          .select('total_amount, origin, payment_method')
          .eq('location_id', locationId)
          .gte('created_at', session.opened_at)
          .neq('status', 'cancelled'); // No contar anulados
          
        if (data) {
          setStats({
            totem: data.filter(o => o.origin === 'totem').reduce((s, o) => s + o.total_amount, 0),
            posCash: data.filter(o => o.origin === 'cashier' && o.payment_method === 'efectivo').reduce((s, o) => s + o.total_amount, 0),
            posCard: data.filter(o => o.origin === 'cashier' && o.payment_method === 'tarjeta').reduce((s, o) => s + o.total_amount, 0)
          });
        }
      };
      fetchStats();
    }
  }, [session, locationId]);

  // --- LÓGICA DEL MODAL DE CONTEO ---
  const openCountModal = () => {
    // Inicializar todo en 0
    setCounts(DENOMINATIONS.reduce((acc, d) => ({...acc, [d]: 0}), {}));
    setIsModalOpen(true);
  };

  const currentCountTotal = Object.entries(counts).reduce((acc, [denom, count]) => acc + (parseInt(denom) * (count || 0)), 0);

  const confirmCount = () => {
    setDeclaredAmount(currentCountTotal);
    setIsModalOpen(false);
  };

  const adjustCount = (denom: number, delta: number) => {
    setCounts(prev => {
      const current = prev[denom] || 0;
      const next = current + delta;
      return { ...prev, [denom]: next >= 0 ? next : 0 };
    });
  };

  // --- APERTURA DE CAJA ---
  const handleOpen = async () => {
    if (declaredAmount === null) return alert("Debe realizar el conteo de caja inicial.");
    if (!rut) return alert("Ingrese su RUT.");
    
    setLoading(true);
    const { data: staff } = await supabase.from('ruta9_staff').select('id').eq('rut', rut.trim()).eq('is_active', true).single();
    
    if (!staff) { 
        alert("RUT de Cajero no autorizado o inválido."); 
        setLoading(false); 
        return; 
    }

    const { error } = await supabase.from('ruta9_cash_sessions').insert({
      location_id: locationId, 
      staff_id: staff.id, 
      opening_balance: declaredAmount, 
      status: 'open'
    });

    if (error) alert("Error al abrir caja.");
    else {
        setRut('');
        setDeclaredAmount(null);
        onRefresh(); 
    }
    setLoading(false);
  };

  // --- IMPRESIÓN DEL CIERRE Z (TICKET PDF) ---
  const printZReport = () => {
    const totalExpected = session.opening_balance + stats.posCash;
    const difference = (declaredAmount || 0) - totalExpected;

    const html = `
      <html><head><style>
        body { font-family: 'Courier New', Courier, monospace; width: 80mm; margin: 0 auto; padding: 10px; color: black; font-size: 14px; }
        .c { text-align: center; } .r { text-align: right; } .b { font-weight: bold; }
        .line { border-bottom: 1px dashed black; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 3px 0; }
        .text-xl { font-size: 18px; } .text-2xl { font-size: 22px; }
      </style></head><body>
        <div class="c b text-2xl">RUTA9</div>
        <div class="c b text-xl">CIERRE DE CAJA (Z)</div>
        <div class="c">${new Date().toLocaleString('es-CL')}</div>
        <div class="line"></div>
        <div><span class="b">Cajero:</span> ${session.ruta9_staff.name}</div>
        <div><span class="b">RUT:</span> ${session.ruta9_staff.rut}</div>
        <div><span class="b">Apertura:</span> ${new Date(session.opened_at).toLocaleTimeString('es-CL')}</div>
        <div class="line"></div>
        <div class="b c">RESUMEN DE INGRESOS</div>
        <table>
          <tr><td>Ventas Tótem (Auto)</td><td class="r">$${stats.totem.toLocaleString()}</td></tr>
          <tr><td>Ventas Caja (Débito/Crédito)</td><td class="r">$${stats.posCard.toLocaleString()}</td></tr>
          <tr><td class="b">Ventas Caja (Efectivo)</td><td class="r b">$${stats.posCash.toLocaleString()}</td></tr>
        </table>
        <div class="line"></div>
        <div class="b c">ARQUEO DE EFECTIVO</div>
        <table>
          <tr><td>Fondo Inicial (Apertura)</td><td class="r">$${session.opening_balance.toLocaleString()}</td></tr>
          <tr><td>(+) Ingresos Efectivo</td><td class="r">$${stats.posCash.toLocaleString()}</td></tr>
          <tr><td class="b">(=) EFECTIVO ESPERADO</td><td class="r b text-xl">$${totalExpected.toLocaleString()}</td></tr>
        </table>
        <div class="line"></div>
        <table>
          <tr><td class="b">EFECTIVO DECLARADO</td><td class="r b text-xl">$${(declaredAmount || 0).toLocaleString()}</td></tr>
          <tr>
            <td class="b">DIFERENCIA</td>
            <td class="r b text-xl" style="color: ${difference < 0 ? 'red' : 'black'};">
                ${difference > 0 ? '+' : ''}$${difference.toLocaleString()}
            </td>
          </tr>
        </table>
        <div class="line"></div>
        <div class="c" style="margin-top: 50px;">_________________________</div>
        <div class="c b">Firma Cajero</div>
        <script>window.print(); setTimeout(()=>window.close(), 1000);</script>
      </body></html>
    `;
    const win = window.open('', '_blank');
    if(win) { win.document.write(html); win.document.close(); }
  };

  // --- CIERRE DE CAJA ---
  const handleClose = async () => {
    if (declaredAmount === null) return alert("Debe realizar el conteo de caja antes de cerrar.");
    if (!confirm("¿Generar Cierre Z e imprimir el ticket definitivo?")) return;
    
    setLoading(true);
    // 1. Imprimir Ticket
    printZReport();

    // 2. Guardar en Base de Datos
    await supabase.from('ruta9_cash_sessions').update({ 
        status: 'closed', 
        closed_at: new Date().toISOString(), 
        closing_balance: declaredAmount, 
        total_sales_cash: stats.posCash, 
        total_sales_card: stats.posCard 
    }).eq('id', session.id);
    
    setDeclaredAmount(null);
    onRefresh(); 
    setLoading(false);
  };

  return (
    <div className="flex h-full items-center justify-center p-6 relative">
      
      {/* ========================================================= */}
      {/* MODAL CONTADOR DE BILLETES (GLASSMORPHISM) */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in-up">
            <div className="bg-[#0f172a] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 bg-black/40 border-b border-white/5 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Calculator className="text-[#E60000]" size={28} />
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest">Arqueo de Billetes</h2>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={28}/></button>
                </div>
                
                <div className="p-8 grid grid-cols-2 gap-x-8 gap-y-4 max-h-[60vh] overflow-y-auto">
                    {DENOMINATIONS.map(denom => (
                        <div key={denom} className="flex items-center justify-between bg-white/5 border border-white/5 p-3 rounded-xl">
                            <span className="font-mono font-bold text-[#E60000] text-lg w-20">${denom}</span>
                            <div className="flex items-center gap-3">
                                <button onClick={() => adjustCount(denom, -1)} className="w-10 h-10 bg-black/40 text-slate-400 rounded-lg flex items-center justify-center hover:bg-white/10 active:scale-95"><Minus size={18}/></button>
                                <input 
                                    type="number" 
                                    min="0"
                                    value={counts[denom] === 0 ? '' : counts[denom]} 
                                    onChange={(e) => setCounts({...counts, [denom]: parseInt(e.target.value) || 0})}
                                    placeholder="0"
                                    className="w-16 bg-transparent text-center font-bold text-xl text-white outline-none placeholder:text-slate-600"
                                />
                                <button onClick={() => adjustCount(denom, 1)} className="w-10 h-10 bg-black/40 text-slate-400 rounded-lg flex items-center justify-center hover:bg-white/10 active:scale-95"><Plus size={18}/></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-6 bg-[#E60000]/10 border-t border-[#E60000]/20 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] font-bold text-[#E60000] uppercase tracking-widest">Total Contado</div>
                        <div className="text-4xl font-black text-white font-mono">${currentCountTotal.toLocaleString()}</div>
                    </div>
                    <button onClick={confirmCount} className="bg-[#E60000] text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center gap-2">
                        <CheckCircle2 size={24} /> Confirmar Monto
                    </button>
                </div>
            </div>
        </div>
      )}


      {/* ========================================================= */}
      {/* PANEL PRINCIPAL DE CAJA */}
      {/* ========================================================= */}
      <div className="bg-[#0f172a] border border-white/5 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
        
        {/* Cabecera Estado */}
        <div className={`p-8 flex items-center gap-6 ${session ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${session ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
            {session ? <Unlock size={36} /> : <Lock size={36} />}
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white">
              {session ? 'Caja Operativa' : 'Caja Cerrada'}
            </h2>
            <p className="text-sm text-slate-400 font-bold tracking-wide mt-1">
              {session ? `Cajero: ${session.ruta9_staff.name}` : 'Requiere apertura para iniciar ventas'}
            </p>
          </div>
        </div>

        <div className="p-10 space-y-8">
            
            {/* PASO 1 COMÚN: EL CONTEO */}
            <div className="bg-black/40 border border-white/10 p-6 rounded-2xl flex items-center justify-between">
                <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                        {session ? 'Dinero en Gaveta (Para Cierre)' : 'Fondo de Apertura (Efectivo)'}
                    </div>
                    <div className="text-4xl font-black text-white font-mono">
                        {declaredAmount !== null ? `$${declaredAmount.toLocaleString()}` : '---'}
                    </div>
                </div>
                <button onClick={openCountModal} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-2 transition-all active:scale-95">
                    <Wallet size={18}/> Contar Billetes
                </button>
            </div>

            {/* VISTA APERTURA */}
            {!session ? (
                <div className="space-y-6 pt-4 border-t border-white/5">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-2">RUT del Cajero Autorizado</label>
                        <div className="relative">
                            <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input 
                                type="text" 
                                placeholder="Ej: 12.345.678-9"
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-mono text-lg outline-none focus:border-[#E60000] focus:ring-1 focus:ring-[#E60000] transition-all"
                            />
                        </div>
                    </div>
                    <button onClick={handleOpen} disabled={loading} className="w-full bg-[#E60000] text-white py-5 rounded-xl font-black uppercase tracking-widest text-lg shadow-[0_10px_30px_rgba(230,0,0,0.3)] hover:brightness-110 active:scale-[0.98] transition-all">
                        {loading ? 'Validando...' : 'INICIAR TURNO DE CAJA'}
                    </button>
                </div>
            ) : (
            /* VISTA CIERRE */
                <div className="space-y-6 pt-4 border-t border-white/5">
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Ventas Tótem</div>
                            <div className="text-xl font-mono font-bold text-white">${stats.totem.toLocaleString()}</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Caja (Tarjetas)</div>
                            <div className="text-xl font-mono font-bold text-blue-400">${stats.posCard.toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="bg-[#E60000]/5 border border-[#E60000]/20 p-5 rounded-xl flex justify-between items-center">
                        <div className="text-xs font-bold text-[#E60000] uppercase tracking-widest">Efectivo Esperado (Apertura + Ventas)</div>
                        <div className="text-2xl font-mono font-black text-white">
                            ${(session.opening_balance + stats.posCash).toLocaleString()}
                        </div>
                    </div>

                    <button onClick={handleClose} disabled={loading} className="w-full bg-slate-800 text-white border border-white/10 py-5 rounded-xl font-black uppercase tracking-widest text-lg hover:bg-red-600 hover:border-red-500 transition-all flex items-center justify-center gap-3">
                        <Printer size={24} />
                        {loading ? 'Procesando...' : 'IMPRIMIR Z Y CERRAR TURNO'}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}