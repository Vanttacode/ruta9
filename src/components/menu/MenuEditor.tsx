// src/components/menu/MenuEditor.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Image as ImageIcon, Save, Trash2, Tag, Layers, Package, Edit3, X, Search, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MenuEditor({ locationId }: { locationId: string }) {
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'modifiers'>('products');
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [catsRes, prodsRes, modsRes] = await Promise.all([
        supabase.from('ruta9_categories').select('*').order('order_index'),
        supabase.from('ruta9_products').select('*, ruta9_categories(name)').eq('location_id', locationId),
        supabase.from('ruta9_modifiers').select('*').order('name')
      ]);

      if (catsRes.error) throw catsRes.error;
      if (prodsRes.error) throw prodsRes.error;
      if (modsRes.error) throw modsRes.error;

      setCategories(catsRes.data || []);
      setProducts(prodsRes.data || []);
      setModifiers(modsRes.data || []);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [locationId]);

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-300 overflow-hidden relative">
      
      {/* HEADER TABS */}
      <div className="flex border-b border-white/5 bg-[#0f172a] px-8 pt-4">
        <TabBtn active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Package size={18}/>} label="Catálogo de Productos" />
        <TabBtn active={activeTab === 'categories'} onClick={() => setActiveTab('categories')} icon={<Layers size={18}/>} label="Categorías" />
        <TabBtn active={activeTab === 'modifiers'} onClick={() => setActiveTab('modifiers')} icon={<Tag size={18}/>} label="Agregados (Extras)" />
      </div>

      {errorMsg && (
        <div className="m-8 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-400 flex items-center gap-3 font-bold">
          <AlertCircle /> Error de Base de Datos: {errorMsg}
        </div>
      )}

      {/* WORKSPACE */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
           <div className="h-full flex items-center justify-center animate-pulse text-slate-500 font-black uppercase tracking-widest">Sincronizando Inventario...</div>
        ) : (
          <>
            {activeTab === 'products' && <ProductManager locationId={locationId} categories={categories} products={products} modifiers={modifiers} onRefresh={fetchData} />}
            {activeTab === 'categories' && <CategoryManager categories={categories} onRefresh={fetchData} />}
            {activeTab === 'modifiers' && <ModifierManager modifiers={modifiers} onRefresh={fetchData} />}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 1. GESTOR DE PRODUCTOS PRO (PIM)
// ============================================================================
function ProductManager({ locationId, categories, products, modifiers, onRefresh }: any) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State (SE AGREGÓ 'preparation')
  const [formData, setFormData] = useState({ name: '', base_price: '', category_id: '', description: '', preparation: '', image_url: '', is_active: true });
  const [selectedMods, setSelectedMods] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredProducts = products.filter((p:any) => p.name.toLowerCase().includes(search.toLowerCase()));

  const openForm = async (p: any = null) => {
    if (p) {
      setEditingId(p.id);
      setFormData({ 
          name: p.name, 
          base_price: p.base_price.toString(), 
          category_id: p.category_id || '', 
          description: p.description || '', 
          preparation: p.preparation || '', // <-- Cargar de DB
          image_url: p.image_url || '', 
          is_active: p.is_active 
      });
      const { data } = await supabase.from('ruta9_product_modifiers_map').select('modifier_id').eq('product_id', p.id);
      setSelectedMods(data?.map(m => m.modifier_id) || []);
    } else {
      setEditingId(null);
      setFormData({ name: '', base_price: '', category_id: '', description: '', preparation: '', image_url: '', is_active: true });
      setSelectedMods([]);
    }
    setIsModalOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `catalog/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;

    const { error } = await supabase.storage.from('product-images').upload(filePath, file);
    if (error) {
        alert("Error al subir imagen. Verifique permisos de Storage.");
    } else {
        const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
        setFormData({ ...formData, image_url: data.publicUrl });
    }
    setUploading(false);
  };

  const saveProduct = async () => {
    if (!formData.name || !formData.category_id || !formData.base_price) return alert("Nombre, Categoría y Precio son obligatorios.");
    setSaving(true);
    
    // SE AGREGÓ 'preparation' AL PAYLOAD
    const payload = {
        name: formData.name,
        base_price: parseInt(formData.base_price),
        category_id: formData.category_id,
        description: formData.description,
        preparation: formData.preparation, // <-- Guardar en DB
        image_url: formData.image_url,
        is_active: formData.is_active,
        location_id: locationId,
        has_modifiers: selectedMods.length > 0
    };

    let productId = editingId;

    if (editingId) {
        const { error } = await supabase.from('ruta9_products').update(payload).eq('id', editingId);
        if (error) { alert(error.message); setSaving(false); return; }
        await supabase.from('ruta9_product_modifiers_map').delete().eq('product_id', editingId); // Clean old
    } else {
        const { data, error } = await supabase.from('ruta9_products').insert([payload]).select().single();
        if (error) { alert(error.message); setSaving(false); return; }
        productId = data.id;
    }

    if (selectedMods.length > 0 && productId) {
        const mappings = selectedMods.map(mId => ({ product_id: productId, modifier_id: mId }));
        await supabase.from('ruta9_product_modifiers_map').insert(mappings);
    }

    setIsModalOpen(false);
    setSaving(false);
    onRefresh();
  };

  const toggleActive = async (p: any) => {
    await supabase.from('ruta9_products').update({ is_active: !p.is_active }).eq('id', p.id);
    onRefresh();
  };

  return (
    <div className="h-full flex flex-col p-8">
      {/* TOOLBAR */}
      <div className="flex justify-between items-center mb-8">
        <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="Buscar en el catálogo..." value={search} onChange={e=>setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 p-3 pl-12 rounded-xl text-white outline-none focus:border-[#E60000] transition-colors" />
        </div>
        <button onClick={() => openForm()} className="bg-[#E60000] text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-red-900/20">
          <Plus size={20}/> Crear Producto
        </button>
      </div>

      {/* PRODUCT GRID */}
      <div className="flex-1 overflow-auto pr-2 pb-20">
        {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <Package size={64} className="opacity-20" />
                <p className="font-bold uppercase tracking-widest text-sm">No hay productos registrados</p>
            </div>
        ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {filteredProducts.map((p:any) => (
                <div key={p.id} className={`bg-[#0f172a] rounded-2xl border transition-all flex flex-col overflow-hidden group shadow-lg ${p.is_active ? 'border-white/5 hover:border-white/20' : 'border-red-900/30 opacity-60 grayscale hover:grayscale-0'}`}>
                    <div className="w-full aspect-video bg-black/40 relative overflow-hidden">
                        {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/> : <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 tracking-widest">SIN IMAGEN</div>}
                        
                        {/* Badges Flotantes */}
                        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
                            <span className="bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest border border-white/10">{p.ruta9_categories?.name || 'Sin Categoría'}</span>
                            {!p.is_active && <span className="bg-red-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-lg">INACTIVO</span>}
                        </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-bold text-white text-base leading-tight mb-1">{p.name}</h4>
                        <div className="text-xl font-black text-[#E60000] font-mono mb-3">${p.base_price.toLocaleString()}</div>
                        
                        <div className="mt-auto flex justify-between items-center pt-3 border-t border-white/5">
                            <button onClick={() => toggleActive(p)} className="text-slate-500 hover:text-white transition-colors" title={p.is_active ? 'Desactivar' : 'Activar'}>
                                {p.is_active ? <ToggleRight size={24} className="text-green-500"/> : <ToggleLeft size={24}/>}
                            </button>
                            <div className="flex gap-2">
                                <button onClick={() => openForm(p)} className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"><Edit3 size={16}/></button>
                                <button onClick={async () => { if(confirm('¿Eliminar permanentemente?')) { await supabase.from('ruta9_products').delete().eq('id', p.id); onRefresh(); }}} className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        )}
      </div>

      {/* MODAL FORMULARIO DE PRODUCTO (SLIDE OVER) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-[#0f172a] h-full shadow-2xl flex flex-col border-l border-white/10 animate-slide-in-right">
                <div className="p-6 bg-black/40 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Package className="text-[#E60000]"/> {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    
                    {/* Bloque: Identidad */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Identidad Visual</h3>
                        <div className="flex gap-6 items-start">
                            <label className="w-32 h-32 rounded-2xl border-2 border-dashed border-white/20 hover:border-[#E60000] bg-black/20 flex flex-col items-center justify-center cursor-pointer transition-colors group relative overflow-hidden shrink-0">
                                {formData.image_url ? (
                                    <><img src={formData.image_url} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity"/><div className="relative z-10 text-white font-bold text-[10px] uppercase bg-black/60 px-2 py-1 rounded">Cambiar</div></>
                                ) : (
                                    <><ImageIcon className="text-slate-500 mb-2 group-hover:text-[#E60000] transition-colors" /><span className="text-[10px] font-bold text-slate-500 uppercase">Subir Foto</span></>
                                )}
                                <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                                {uploading && <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-[#E60000] font-bold text-xs">Subiendo...</div>}
                            </label>
                            
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre Público</label>
                                    <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#E60000] font-bold text-lg" placeholder="Ej: Burger Triple Cheddar" />
                                </div>
                                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                                    <span className="text-xs font-bold text-white uppercase">Estado del Producto</span>
                                    <button onClick={() => setFormData({...formData, is_active: !formData.is_active})} className="ml-auto">
                                        {formData.is_active ? <ToggleRight size={32} className="text-green-500"/> : <ToggleLeft size={32} className="text-slate-600"/>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bloque: Comercial */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Datos Comerciales</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Precio Base ($)</label>
                                <input type="number" value={formData.base_price} onChange={e=>setFormData({...formData, base_price: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-[#E60000] font-mono font-black text-xl outline-none focus:border-[#E60000]" placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Categoría</label>
                                <select value={formData.category_id} onChange={e=>setFormData({...formData, category_id: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#E60000] h-[52px] font-bold">
                                    <option value="" disabled>Seleccione...</option>
                                    {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descripción (Opcional, para el cliente)</label>
                            <textarea value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white outline-none focus:border-[#E60000] h-16 text-sm" placeholder="Ingredientes o descripción del pack..." />
                        </div>
                        {/* NUEVO CAMPO: PREPARACIÓN */}
                        <div>
                            <label className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Instrucciones de Cocina (Uso Interno)</label>
                            <input type="text" value={formData.preparation} onChange={e=>setFormData({...formData, preparation: e.target.value})} className="w-full bg-blue-900/10 border border-blue-500/30 p-3 rounded-xl text-blue-100 outline-none focus:border-blue-500 text-sm" placeholder="Ej: Cocción 5 min, sin sal..." />
                        </div>
                    </div>

                    {/* Bloque: Modificadores */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end border-b border-white/5 pb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Agregados Permitidos</h3>
                            <span className="text-[10px] font-bold text-[#E60000] bg-[#E60000]/10 px-2 py-1 rounded">{selectedMods.length} seleccionados</span>
                        </div>
                        
                        {modifiers.length === 0 ? (
                            <div className="text-sm text-slate-500 italic bg-white/5 p-4 rounded-xl text-center">No has creado Extras Globales aún.</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                                {modifiers.map((m: any) => {
                                    const isSelected = selectedMods.includes(m.id);
                                    return (
                                        <button key={m.id} onClick={() => isSelected ? setSelectedMods(selectedMods.filter(id => id !== m.id)) : setSelectedMods([...selectedMods, m.id])} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${isSelected ? 'border-[#E60000] bg-[#E60000]/10' : 'border-white/5 bg-black/20 hover:border-white/20'}`}>
                                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'border-[#E60000] bg-[#E60000]' : 'border-slate-600'}`}>
                                                {isSelected && <CheckCircle2 size={14} className="text-white"/>}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{m.name}</div>
                                                <div className="text-[10px] font-mono text-slate-500">+${m.price}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-black/60 border-t border-white/5">
                    <button onClick={saveProduct} disabled={saving || uploading} className="w-full bg-[#E60000] text-white py-4 rounded-xl font-black text-lg uppercase tracking-widest shadow-[0_10px_30px_rgba(230,0,0,0.3)] hover:brightness-110 active:scale-95 transition-all flex justify-center items-center gap-2">
                        {saving ? 'Guardando...' : <><Save size={20}/> Guardar Producto</>}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. GESTOR DE CATEGORÍAS
// ============================================================================
function CategoryManager({ categories, onRefresh }: any) {
    const [name, setName] = useState('');
    const save = async () => {
        if (!name.trim()) return;
        const { error } = await supabase.from('ruta9_categories').insert([{ name: name.trim(), order_index: categories.length }]);
        if (error) alert("Error: " + error.message); else { setName(''); onRefresh(); }
    };

    return (
        <div className="h-full p-8 flex gap-8 max-w-5xl mx-auto">
            <div className="w-1/3 space-y-4">
                <h3 className="font-black text-2xl text-white uppercase tracking-tight">Crear Categoría</h3>
                <p className="text-sm text-slate-500 mb-6">Agrupa tus productos para que los clientes los encuentren más rápido en el Tótem.</p>
                <div className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Nombre de la Categoría</label>
                        <input type="text" placeholder="Ej: Promociones" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E60000] font-bold" />
                    </div>
                    <button onClick={save} disabled={!name} className="w-full bg-white text-black py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50">Crear Nueva</button>
                </div>
            </div>

            <div className="flex-1 bg-[#0f172a] rounded-3xl border border-white/5 shadow-xl overflow-hidden flex flex-col">
                <div className="p-6 bg-black/40 border-b border-white/5 font-bold text-slate-400 uppercase tracking-widest text-xs">Categorías Existentes ({categories.length})</div>
                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {categories.length === 0 ? <div className="p-10 text-center text-slate-600">No hay categorías.</div> : 
                        categories.map((c:any) => (
                            <div key={c.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center group hover:border-white/20 transition-all">
                                <span className="font-black text-white text-lg tracking-tight">{c.name}</span>
                                <button onClick={async () => { if(confirm(`¿Borrar categoría ${c.name}?`)) { await supabase.from('ruta9_categories').delete().eq('id', c.id); onRefresh(); }}} className="w-10 h-10 bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"><Trash2 size={18}/></button>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 3. GESTOR DE EXTRAS / MODIFICADORES
// ============================================================================
function ModifierManager({ modifiers, onRefresh }: any) {
    const [newItem, setNewItem] = useState({ name: '', price: '' });
    const save = async () => {
        if (!newItem.name || !newItem.price) return;
        const { error } = await supabase.from('ruta9_modifiers').insert([{ name: newItem.name.trim(), price: parseInt(newItem.price) }]);
        if (error) alert("Error: " + error.message); else { setNewItem({ name: '', price: '' }); onRefresh(); }
    };

    return (
        <div className="h-full p-8 flex gap-8 max-w-5xl mx-auto">
            <div className="w-1/3 space-y-4">
                <h3 className="font-black text-2xl text-white uppercase tracking-tight">Crear Extra Global</h3>
                <p className="text-sm text-slate-500 mb-6">Crea opciones (Ej: Queso, Tocino) que luego podrás vincular a múltiples productos.</p>
                <div className="bg-[#0f172a] p-6 rounded-3xl border border-white/5 shadow-xl space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Nombre del Extra</label>
                        <input type="text" placeholder="Ej: Extra Queso Cheddar" value={newItem.name} onChange={e=>setNewItem({...newItem, name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white outline-none focus:border-[#E60000] font-bold text-sm" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Precio Adicional ($)</label>
                        <input type="number" placeholder="0" value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-[#E60000] outline-none focus:border-[#E60000] font-black font-mono text-xl" />
                    </div>
                    <button onClick={save} disabled={!newItem.name || !newItem.price} className="w-full bg-[#E60000] text-white py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-[0_10px_20px_rgba(230,0,0,0.2)]">Guardar Extra</button>
                </div>
            </div>

            <div className="flex-1 bg-[#0f172a] rounded-3xl border border-white/5 shadow-xl overflow-hidden flex flex-col">
                <div className="p-6 bg-black/40 border-b border-white/5 font-bold text-slate-400 uppercase tracking-widest text-xs">Repositorio de Extras ({modifiers.length})</div>
                <div className="flex-1 overflow-auto p-4 grid grid-cols-2 gap-3 content-start">
                    {modifiers.length === 0 ? <div className="col-span-2 p-10 text-center text-slate-600">No hay extras creados.</div> : 
                        modifiers.map((m:any) => (
                            <div key={m.id} className="p-4 bg-white/5 border border-white/5 rounded-xl flex justify-between items-center group hover:border-white/20 transition-all">
                                <div>
                                    <div className="font-bold text-white text-sm">{m.name}</div>
                                    <div className="font-mono font-black text-[#E60000] text-sm">+${m.price.toLocaleString()}</div>
                                </div>
                                <button onClick={async () => { if(confirm(`¿Borrar extra ${m.name}? Se quitará de todos los productos.`)) { await supabase.from('ruta9_modifiers').delete().eq('id', m.id); onRefresh(); }}} className="w-10 h-10 bg-red-900/20 text-red-500 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white"><Trash2 size={16}/></button>
                            </div>
                        ))
                    }
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// UI COMPONENTS
// ============================================================================
function TabBtn({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-8 py-5 text-[11px] font-black uppercase tracking-widest border-b-[3px] transition-all ${active ? 'border-[#E60000] text-white bg-white/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
      <span className={active ? 'text-[#E60000]' : ''}>{icon}</span> {label}
    </button>
  );
}