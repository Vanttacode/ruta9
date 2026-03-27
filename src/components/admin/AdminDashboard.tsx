// src/components/admin/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, Users, Package, DollarSign, Award, Target, MonitorDot, Store, AlertCircle, Plus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export default function AdminDashboard({ locationId, locationName }: any) {
  const [activeTab, setActiveTab] = useState<'analytics' | 'staff'>('analytics');

  return (
    <div className="flex h-full bg-[#020617] text-slate-300 font-sans overflow-hidden">
      
      {/* SIDEBAR ADMINISTRATIVO */}
      <aside className="w-64 bg-[#0f172a] border-r border-white/5 flex flex-col z-20">
        <div className="p-6 border-b border-white/5 flex flex-col gap-2">
          <img src="/images/logo-ruta9.png" className="h-10 object-contain object-left" alt="RUTA9" />
          <span className="text-[10px] font-black text-[#E60000] tracking-widest uppercase">Gerencia General</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <SidebarLink active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<TrendingUp size={20}/>} label="Inteligencia (BI)" />
          <SidebarLink active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Users size={20}/>} label="Personal y Accesos" />
          
          <div className="pt-6 pb-2">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4">Accesos Directos</span>
          </div>
          <a href={`/menu?local=${locationName.toLowerCase().replace(' ', '-')}`} className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-all">
            <Package size={20}/> Gestor de Menú
          </a>
        </nav>

        <div className="p-6 bg-black/40 border-t border-white/5 text-xs text-slate-500">
          <div>Localidad Activa:</div>
          <div className="font-bold text-white uppercase tracking-widest">{locationName}</div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 overflow-auto relative">
        <div className="p-8">
            {activeTab === 'analytics' && <AnalyticsPanel locationId={locationId} />}
            {activeTab === 'staff' && <StaffManager />}
        </div>
      </main>
    </div>
  );
}

// ============================================================================
// 1. PANEL DE INTELIGENCIA DE NEGOCIOS (BI)
// ============================================================================
function AnalyticsPanel({ locationId }: { locationId: string }) {
    const [timeframe, setTimeframe] = useState('today');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totemRev: 0, cajaRev: 0, topProducts: [] as any[] });

    useEffect(() => {
        const fetchAnalytics = async () => {
            setLoading(true);
            
            // Calculador de Fechas
            const now = new Date();
            let startDate = new Date(0); // All time por defecto
            
            if (timeframe === 'today') {
                startDate = new Date(now.setHours(0,0,0,0));
            } else if (timeframe === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            } else if (timeframe === 'year') {
                startDate = new Date(now.getFullYear(), 0, 1);
            }

            // Consultar Pedidos (Ignoramos cancelados)
            let q = supabase.from('ruta9_orders')
                .select('id, total_amount, origin, ruta9_order_items(quantity, ruta9_products(name))')
                .eq('location_id', locationId)
                .neq('status', 'cancelled');
            
            if (timeframe !== 'all') {
                q = q.gte('created_at', startDate.toISOString());
            }

            const { data: orders } = await q;

            if (orders) {
                const totalRev = orders.reduce((sum, o) => sum + o.total_amount, 0);
                const totemRev = orders.filter(o => o.origin === 'totem').reduce((sum, o) => sum + o.total_amount, 0);
                const cajaRev = orders.filter(o => o.origin === 'cashier').reduce((sum, o) => sum + o.total_amount, 0);
                
                // Calcular Top Productos
                const productCounts: Record<string, number> = {};
                orders.forEach(o => {
                    o.ruta9_order_items.forEach((item: any) => {
                        const name = item.ruta9_products?.name || 'Producto Eliminado';
                        productCounts[name] = (productCounts[name] || 0) + item.quantity;
                    });
                });

                const top = Object.entries(productCounts)
                    .map(([name, qty]) => ({ name, qty }))
                    .sort((a, b) => b.qty - a.qty)
                    .slice(0, 5); // Tomar los 5 mejores

                setStats({ totalRevenue: totalRev, totalOrders: orders.length, totemRev, cajaRev, topProducts: top });
            }
            setLoading(false);
        };
        fetchAnalytics();
    }, [timeframe, locationId]);

    if (loading) return <div className="animate-pulse text-slate-500 font-bold uppercase tracking-widest p-10 text-center">Calculando métricas...</div>;

    const totemPercent = stats.totalRevenue > 0 ? Math.round((stats.totemRev / stats.totalRevenue) * 100) : 0;
    const cajaPercent = stats.totalRevenue > 0 ? Math.round((stats.cajaRev / stats.totalRevenue) * 100) : 0;
    const ticketPromedio = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0;

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            
            {/* Cabecera y Filtros */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Rendimiento Comercial</h2>
                    <p className="text-slate-500 font-medium">Analíticas basadas en órdenes concretadas.</p>
                </div>
                <div className="flex bg-[#0f172a] p-1 rounded-xl border border-white/5 shadow-lg">
                    {[{id: 'today', l: 'Hoy'}, {id: 'month', l: 'Mes'}, {id: 'year', l: 'Año'}, {id: 'all', l: 'Histórico'}].map(f => (
                        <button key={f.id} onClick={() => setTimeframe(f.id)} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${timeframe === f.id ? 'bg-[#E60000] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
                            {f.l}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPIs Principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-[#0f172a] to-black p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-green-500/10 group-hover:scale-110 transition-transform"><DollarSign size={120}/></div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 relative z-10">Ingresos Totales</div>
                    <div className="text-5xl font-black text-white font-mono relative z-10">${stats.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Órdenes Pagadas</div>
                    <div className="text-5xl font-black text-white font-mono">{stats.totalOrders}</div>
                </div>
                <div className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 shadow-2xl">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ticket Promedio</div>
                    <div className="text-5xl font-black text-[#E60000] font-mono">${ticketPromedio.toLocaleString()}</div>
                </div>
            </div>

            {/* Split Tótem vs Caja & Top Sellers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico Visual de Origen */}
                <div className="bg-[#0f172a] p-8 rounded-3xl border border-white/5 shadow-2xl">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3"><Target className="text-[#E60000]"/> Origen de Ventas</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span className="flex items-center gap-2 text-blue-400"><MonitorDot size={16}/> Tótem Autoatención</span>
                                <span className="text-white">${stats.totemRev.toLocaleString()} ({totemPercent}%)</span>
                            </div>
                            <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${totemPercent}%` }}></div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm font-bold mb-2">
                                <span className="flex items-center gap-2 text-green-400"><Store size={16}/> Caja Manual</span>
                                <span className="text-white">${stats.cajaRev.toLocaleString()} ({cajaPercent}%)</span>
                            </div>
                            <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${cajaPercent}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Productos */}
                <div className="bg-[#0f172a] p-8 rounded-3xl border border-white/5 shadow-2xl">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3"><Award className="text-yellow-500"/> Top 5 Vendidos</h3>
                    
                    {stats.topProducts.length === 0 ? (
                        <div className="text-slate-500 italic text-sm text-center py-10">No hay datos suficientes en este periodo.</div>
                    ) : (
                        <div className="space-y-4">
                            {stats.topProducts.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-black text-slate-500">{idx + 1}</div>
                                    <div className="flex-1 font-bold text-white text-sm">{p.name}</div>
                                    <div className="text-[#E60000] font-black text-lg">{p.qty} <span className="text-xs text-slate-500">und</span></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// ============================================================================
// 2. GESTOR DE PERSONAL Y CAJEROS
// ============================================================================
function StaffManager() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Form
    const [name, setName] = useState('');
    const [rut, setRut] = useState('');
    const [role, setRole] = useState('cashier');

    const loadStaff = async () => {
        setLoading(true);
        const { data } = await supabase.from('ruta9_staff').select('*').order('created_at', { ascending: false });
        setStaff(data || []);
        setLoading(false);
    };

    useEffect(() => { loadStaff(); }, []);

    const handleCreate = async () => {
        if (!name || !rut) return alert("Nombre y RUT son obligatorios");
        
        const { error } = await supabase.from('ruta9_staff').insert([{ name, rut, role }]);
        if (error) {
            if (error.code === '23505') alert("Este RUT ya está registrado.");
            else alert("Error: " + error.message);
        } else {
            setName(''); setRut(''); setRole('cashier');
            loadStaff();
        }
    };

    const toggleStatus = async (user: any) => {
        await supabase.from('ruta9_staff').update({ is_active: !user.is_active }).eq('id', user.id);
        loadStaff();
    };

    const deleteStaff = async (id: string) => {
        if (!confirm("¿Eliminar empleado? Si tiene ventas asociadas, podría generar errores en el historial. Recomendamos 'Inactivar' en su lugar.")) return;
        await supabase.from('ruta9_staff').delete().eq('id', id);
        loadStaff();
    };

    return (
        <div className="max-w-5xl mx-auto flex gap-8">
            
            {/* Formulario de Creación */}
            <div className="w-1/3 space-y-6">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2">Personal</h2>
                    <p className="text-slate-500 font-medium text-sm">Agrega cajeros y administradores al sistema. El RUT es su llave de acceso a la Caja.</p>
                </div>

                <div className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 shadow-2xl space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Nombre Completo</label>
                        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Juan Pérez" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E60000]" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">RUT (Identificador)</label>
                        <input type="text" value={rut} onChange={e=>setRut(e.target.value)} placeholder="Ej: 19.123.456-7" className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E60000] font-mono" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Nivel de Acceso</label>
                        <select value={role} onChange={e=>setRole(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E60000] font-bold">
                            <option value="cashier">Cajero (Operador)</option>
                            <option value="admin">Administrador Global</option>
                        </select>
                    </div>
                    <button onClick={handleCreate} disabled={!name || !rut} className="w-full bg-[#E60000] disabled:bg-slate-800 text-white py-4 rounded-xl font-black uppercase tracking-widest mt-4 flex justify-center items-center gap-2 hover:brightness-110 active:scale-95 transition-all">
                        <Plus size={20}/> Registrar Personal
                    </button>
                </div>
            </div>

            {/* Lista de Personal */}
            <div className="flex-1 bg-[#0f172a] rounded-3xl border border-white/5 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 bg-black/40 border-b border-white/5 font-bold text-slate-400 uppercase tracking-widest text-xs flex justify-between items-center">
                    <span>Nómina Activa</span>
                    <span className="bg-[#E60000]/20 text-[#E60000] px-3 py-1 rounded-full">{staff.length} Registros</span>
                </div>
                
                <div className="flex-1 p-6 overflow-auto">
                    {loading ? <div className="animate-pulse text-center py-10 text-slate-500">Cargando personal...</div> : (
                        <div className="grid grid-cols-1 gap-4">
                            {staff.map(user => (
                                <div key={user.id} className={`p-5 rounded-2xl border transition-all flex justify-between items-center group ${user.is_active ? 'bg-white/5 border-white/5 hover:border-white/20' : 'bg-black/40 border-red-900/30 opacity-60'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xl shadow-inner ${user.role === 'admin' ? 'bg-[#E60000] text-white' : 'bg-slate-700 text-slate-300'}`}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-black text-white text-lg">{user.name} {user.id === '1-1' && '(ROOT)'}</div>
                                            <div className="text-sm font-mono text-slate-400">{user.rut}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${user.role === 'admin' ? 'bg-[#E60000]/20 text-[#E60000]' : 'bg-slate-800 text-slate-400'}`}>
                                            {user.role}
                                        </span>
                                        
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => toggleStatus(user)} className="text-slate-500 hover:text-white" title={user.is_active ? 'Inactivar Acceso' : 'Reactivar Acceso'}>
                                                {user.is_active ? <ToggleRight size={28} className="text-green-500"/> : <ToggleLeft size={28}/>}
                                            </button>
                                            <button onClick={() => deleteStaff(user.id)} className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-900/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white">
                                                <Trash2 size={18}/>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SidebarLink({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-[#E60000] text-white shadow-lg shadow-red-900/20 scale-105' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
      {icon} {label}
    </button>
  );
}