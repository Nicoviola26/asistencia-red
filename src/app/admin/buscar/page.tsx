'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    UserSearch, Search, Loader2, User, Clock, MapPin,
    Building2, Download, Trash2, CheckCircle2, AlertTriangle,
    Mail, Phone, GraduationCap, ChevronRight, ArrowLeft
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as XLSX from 'xlsx';

export default function BuscarPersonaPage() {
    const { showToast } = useToast();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [persona, setPersona] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [asistencias, setAsistencias] = useState<any[]>([]);
    const [error, setError] = useState('');

    const handleDownloadParticipants = async () => {
        setExporting(true);
        try {
            const { data, error } = await supabase
                .from('personas')
                .select('*')
                .order('apellido', { ascending: true });

            if (error) throw error;

            if (data) {
                const worksheetData = data.map((p: any) => ({
                    DNI: p.dni,
                    Nombre: p.nombre,
                    Apellido: p.apellido,
                    Rol: p.rol,
                    Institución: p.institucion || '-',
                    Eje: p.eje || '-',
                    Email: p.correo || '-',
                    WhatsApp: p.celular || '-',
                }));

                const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Participantes");
                XLSX.writeFile(workbook, "listado_completo_participantes.xlsx");
                showToast('Lista de participantes descargada', 'success');
            }
        } catch (err) {
            console.error('Error al exportar:', err);
            showToast('No se pudo exportar la lista de participantes', 'error');
        } finally {
            setExporting(false);
        }
    };

    const handleUpdatePersona = async (e: React.FormEvent) => {
        e.preventDefault();

        if (persona.dni.length < 7 || persona.dni.length > 8) {
            showToast('Por favor, ingresá un formato de DNI correcto.', 'error');
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from('personas')
            .update({
                nombre: persona.nombre,
                apellido: persona.apellido,
                dni: persona.dni,
                rol: persona.rol,
                institucion: persona.institucion,
                correo: persona.correo,
                celular: persona.celular,
                eje: persona.eje
            })
            .eq('id', persona.id);

        if (error) {
            showToast('Error al actualizar docente', 'error');
        } else {
            showToast('Datos actualizados correctamente', 'success');
        }
        setLoading(false);
    };

    const handleDeleteAsistencia = (asistenciaId: string) => {
        setDeleteConfig({ type: 'asistencia', id: asistenciaId, count: 1 });
        setIsDeleteModalOpen(true);
    };

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfig, setDeleteConfig] = useState<{ type: 'single' | 'bulk' | 'asistencia', id?: string, count: number }>({ type: 'single', count: 0 });

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === searchResults.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(searchResults.map(p => p.id));
        }
    };

    const handleDeletePersona = (id: string) => {
        setDeleteConfig({ type: 'single', id, count: 1 });
        setIsDeleteModalOpen(true);
    };

    const handleBulkDelete = () => {
        setDeleteConfig({ type: 'bulk', count: selectedIds.length });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        setLoading(true);
        setIsDeleteModalOpen(false);
        try {
            if (deleteConfig.type === 'single' && deleteConfig.id) {
                const { error } = await supabase.from('personas').delete().eq('id', deleteConfig.id);
                if (error) throw error;
                setPersona(null);
                setAsistencias([]);
                setSearchResults(prev => prev.filter(p => p.id !== deleteConfig.id));
                showToast('Persona eliminada correctamente', 'success');
            } else if (deleteConfig.type === 'bulk') {
                const { error } = await supabase.from('personas').delete().in('id', selectedIds);
                if (error) throw error;
                setSearchResults(prev => prev.filter(p => !selectedIds.includes(p.id)));
                setSelectedIds([]);
                setPersona(null);
                showToast('Personas eliminadas correctamente', 'success');
            } else if (deleteConfig.type === 'asistencia' && deleteConfig.id) {
                const { error } = await supabase.from('asistencias').delete().eq('id', deleteConfig.id);
                if (error) throw error;
                setAsistencias(prev => prev.filter(a => a.id !== deleteConfig.id));
                showToast('Asistencia eliminada correctamente', 'success');
            }
        } catch (err: any) {
            showToast('Error al eliminar: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError('');
        setPersona(null);
        setSearchResults([]);
        setSelectedIds([]);
        setAsistencias([]);

        try {
            let queryBuilder = supabase
                .from('personas')
                .select('*')
                .order('apellido', { ascending: true });

            if (query.trim()) {
                queryBuilder = queryBuilder.or(`dni.eq.${query.trim()},nombre.ilike.%${query.trim()}%,apellido.ilike.%${query.trim()}%,rol.ilike.%${query.trim()}%`);
            }

            const { data: results, error: searchError } = await queryBuilder;

            if (searchError) throw searchError;

            if (!results || results.length === 0) {
                setError('No se encontraron participantes con ese criterio.');
                return;
            }

            if (results.length === 1 && query.trim()) {
                selectPersona(results[0]);
            } else {
                setSearchResults(results);
            }
        } catch (err) {
            setError('Ocurrió un error al buscar los datos.');
        } finally {
            setLoading(false);
        }
    };

    const selectPersona = async (personaData: any) => {
        setPersona(personaData);
        setSearchResults([]);
        setSelectedIds([]);
        setLoading(true);
        try {
            const { data: asistenciasData } = await supabase
                .from('asistencias')
                .select(`
                    id,
                    fecha_registro,
                    capacitaciones (nombre, dia, hora, lugar, disertante)
                `)
                .eq('persona_id', personaData.id)
                .order('fecha_registro', { ascending: false });

            setAsistencias(asistenciasData || []);
        } catch (err) {
            setError('Error al cargar historial.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="text-[var(--foreground)]">
            {/* Main Content with Animation */}
            <div className="space-y-8 animate-fade-in">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-[10px]">
                            <UserSearch size={14} />
                            Base de Datos Docente
                        </div>
                        <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">Explorador de Participantes</h2>
                        <p className="text-slate-500 font-medium">Historial completo, edición y gestión de perfiles.</p>
                    </div>
                    <button
                        onClick={handleDownloadParticipants}
                        disabled={exporting}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-10 px-5 flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/20 border-none transition-all active:scale-[0.97] whitespace-nowrap"
                    >
                        {exporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Descargar Listado</span>
                    </button>
                </div>

                {/* Search Bar - Always Centered */}
                <div className="max-w-2xl mx-auto transition-all duration-500">
                    <div className="card p-2 bg-white dark:bg-slate-900 border-none shadow-2xl rounded-[2rem]">
                        <form onSubmit={handleSearch} className="flex gap-2 p-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="DNI, Nombre, Apellido o Rol..."
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                />
                            </div>
                            <button type="submit" disabled={loading} className="px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-600/20">
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Buscar'}
                            </button>
                        </form>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-3 font-bold text-center animate-shake">{error}</p>}
                </div>

                {/* Multiple Search Results */}
                {searchResults.length > 0 && (
                    <div className="max-w-2xl mx-auto space-y-4 animate-slide-up">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === searchResults.length && searchResults.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                />
                                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
                                    {searchResults.length} {searchResults.length === 1 ? 'Coincidencia' : 'Coincidencias'}
                                </p>
                            </div>
                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-red-500/20 animate-fade-in"
                                >
                                    <Trash2 size={14} /> Eliminar Seleccionados ({selectedIds.length})
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {searchResults.map((p) => (
                                <div
                                    key={p.id}
                                    className="group relative card p-4 flex items-center gap-4 hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 cursor-pointer bg-white dark:bg-slate-900 overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-10 transition-opacity">
                                        <User size={80} className="rotate-12 translate-x-4 -translate-y-4" />
                                    </div>
                                    <div className="relative z-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(p.id)}
                                            onChange={() => toggleSelect(p.id)}
                                            className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                    </div>
                                    <div
                                        className="flex-1 flex items-center justify-between"
                                        onClick={() => selectPersona(p)}
                                    >
                                        <div>
                                            <p className="font-black text-slate-900 dark:text-white uppercase leading-tight group-hover:text-emerald-600 transition-colors">
                                                {p.nombre} {p.apellido}
                                            </p>
                                            <div className="flex items-center gap-3 mt-1.5 font-bold">
                                                <span className="text-[10px] uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 tracking-widest">{p.rol}</span>
                                                <span className="text-[10px] text-emerald-500 font-mono">DNI: {p.dni}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {persona && (
                    <div className="space-y-6">
                        <button
                            onClick={() => { setPersona(null); setQuery(''); }}
                            className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 hover:text-emerald-500 transition-colors ml-1"
                        >
                            <ArrowLeft size={16} /> Volver a buscar
                        </button>


                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                            {/* Compact Info Sidebar - Emerald Theme */}
                            <div className="lg:col-span-4 flex flex-col">
                                {/* Profile Hero Card */}
                                <div className="card h-full border-none bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-2xl relative overflow-hidden p-8 group flex flex-col justify-between">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 -mr-8 -mt-8 translate-x-4">
                                        <User size={160} />
                                    </div>

                                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                                        <div className="w-24 h-24 bg-white/20 rounded-[2.5rem] flex items-center justify-center border-4 border-white/30 backdrop-blur-xl shadow-2xl relative group-hover:scale-110 transition-transform duration-500">
                                            <User size={48} className="text-white" />
                                        </div>

                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-3">
                                                {persona.nombre} <br /> {persona.apellido}
                                            </h3>
                                            <div className="inline-flex px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-xs font-black tracking-widest uppercase">
                                                DNI {persona.dni}
                                            </div>
                                        </div>

                                        <div className="w-full pt-8 grid grid-cols-1 gap-3 text-left border-t border-white/10">
                                            <InfoItem label="Institución" value={persona.institucion || 'S/D'} icon={<Building2 size={16} />} />
                                            <InfoItem label="Cargo / Rol" value={persona.rol} icon={<GraduationCap size={16} />} />
                                            <InfoItem label="Eje de Formación" value={persona.eje || 'General'} icon={<MapPin size={16} />} />
                                            <InfoItem label="WhatsApp" value={persona.celular || 'S/D'} icon={<Phone size={16} />} />
                                            <InfoItem label="Correo" value={persona.correo || 'S/D'} icon={<Mail size={16} />} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Actions Area - Emerald Theme */}
                            <div className="lg:col-span-8 flex flex-col">
                                {/* Edit Section */}
                                <div className="card h-full p-8 bg-white dark:bg-slate-900 border-none shadow-xl border-t-8 border-emerald-500 flex flex-col">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <CheckCircle2 className="text-emerald-500" size={24} />
                                                Configuración del Perfil
                                            </h3>
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Modifica los datos personales o elimina el registro.</p>
                                        </div>
                                        <button
                                            onClick={() => handleDeletePersona(persona.id)}
                                            className="p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition-all group"
                                            title="Eliminar permanentemente"
                                        >
                                            <Trash2 size={24} className="group-hover:scale-110" />
                                        </button>
                                    </div>

                                    <form onSubmit={handleUpdatePersona} className="flex-1 flex flex-col justify-between space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <CustomInput label="Nombre" value={persona.nombre} onChange={(v) => setPersona({ ...persona, nombre: v })} />
                                            <CustomInput label="Apellido" value={persona.apellido} onChange={(v) => setPersona({ ...persona, apellido: v })} />
                                            <CustomInput label="DNI" value={persona.dni} onChange={(v) => setPersona({ ...persona, dni: v.replace(/\D/g, '').slice(0, 8) })} isMono />

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Rol en el Sistema</label>
                                                <select
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-xl px-4 py-2 text-sm font-bold transition-all outline-none"
                                                    value={persona.rol}
                                                    onChange={(e) => setPersona({ ...persona, rol: e.target.value })}
                                                >
                                                    <option value="docente">Docente</option>
                                                    <option value="directivo">Directivo</option>
                                                    <option value="agente municipal">Agente Municipal</option>
                                                    <option value="estudiante avanzado">Estudiante Avanzado</option>
                                                </select>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Asignación de Eje</label>
                                                <select
                                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-xl px-4 py-2 text-sm font-bold transition-all outline-none"
                                                    value={persona.eje || ''}
                                                    onChange={(e) => setPersona({ ...persona, eje: e.target.value })}
                                                >
                                                    <option value="">Sin asignar</option>
                                                    <option value="Educación Ambiental">Educación Ambiental</option>
                                                    <option value="Educación Digital Integral">Educación Digital Integral</option>
                                                    <option value="Infancias Diversas">Infancias Diversas</option>
                                                    <option value="Alfabetización Inicial">Alfabetización Inicial</option>
                                                    <option value="Lenguajes Artísticos Integrales">Lenguajes Artísticos Integrales</option>
                                                </select>
                                            </div>

                                            <CustomInput label="Email de contacto" value={persona.correo || ''} onChange={(v) => setPersona({ ...persona, correo: v })} type="email" />
                                            <CustomInput label="Móvil (WhatsApp)" value={persona.celular || ''} onChange={(v) => setPersona({ ...persona, celular: v })} />
                                            <div className="md:col-span-2">
                                                <CustomInput label="Institución Educativa" value={persona.institucion || ''} onChange={(v) => setPersona({ ...persona, institucion: v })} />
                                            </div>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 border-none mt-4"
                                        >
                                            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                                            Actualizar Perfil de Asistente
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>

                        {/* History Visualization (Timeline Style) - Emerald */}
                        <div className="space-y-6 pt-4">
                            <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-3 text-slate-800 dark:text-white">
                                <Clock size={24} className="text-slate-400" />
                                Cronograma de Asistencia
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-xs font-black">{asistencias.length}</span>
                            </h3>

                            {asistencias.length === 0 ? (
                                <div className="card p-12 border-dashed border-2 flex flex-col items-center text-slate-400 bg-white/50 dark:bg-slate-900/50">
                                    <AlertTriangle size={48} className="opacity-10 mb-4" />
                                    <p className="font-bold">No registra asistencias previas en la red.</p>
                                </div>
                            ) : (
                                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                                    {asistencias.map((asistencia) => (
                                        <div key={asistencia.id} className="relative group animate-slide-right">
                                            <div className="absolute -left-[1.85rem] top-1.5 w-3 h-3 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-full z-10 group-hover:scale-150 transition-transform"></div>
                                            <div className="card p-5 group-hover:shadow-lg transition-all border-none bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between gap-4">
                                                <div className="space-y-1">
                                                    <div className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">
                                                        {new Date(asistencia.capacitaciones.dia).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </div>
                                                    <h4 className="font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                                                        {asistencia.capacitaciones.nombre}
                                                    </h4>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1">📍 {asistencia.capacitaciones.lugar || 'S/D'}</span>
                                                        <span className="flex items-center gap-1">👤 {asistencia.capacitaciones.disertante || 'S/D'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black uppercase text-slate-400">Entrada</p>
                                                        <p className="font-black text-emerald-600 dark:text-emerald-400">{new Date(asistencia.fecha_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteAsistencia(asistencia.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div> {/* Closing div for the new animated wrapper */}

            {/* Modal de Confirmación - OUTSIDE ANIMATED CONTAINER */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in-pure">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-sm w-full p-8 border border-slate-100 dark:border-slate-800 text-center animate-zoom-in">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={40} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">
                            {deleteConfig.type === 'asistencia' ? '¿Eliminar Asistencia?' : '¿Estás Seguro?'}
                        </h3>
                        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                            {deleteConfig.type === 'asistencia' ? (
                                <>Se eliminará permanentemente <span className="font-black text-red-500">este registro de asistencia</span>. Esta acción no tiene vuelta atrás.</>
                            ) : (
                                <>Se eliminará permanentemente a <span className="font-black text-red-500">{deleteConfig.count === 1 ? 'este usuario' : `${deleteConfig.count} usuarios`}</span> y todos sus registros. Esta acción no tiene vuelta atrás.</>
                            )}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={confirmDelete}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-red-600/20 active:scale-95 border-none"
                            >
                                Sí, eliminar ahora
                            </button>
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors border-none"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            <div className="text-white/40">{icon}</div>
            <div>
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest mb-0.5">{label}</p>
                <p className="text-xs font-bold leading-tight">{value}</p>
            </div>
        </div>
    );
}

function CustomInput({ label, value, onChange, type = "text", isMono = false }: { label: string, value: string, onChange: (v: string) => void, type?: string, isMono?: boolean }) {
    return (
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">{label}</label>
            <input
                type={type}
                className={`w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500 rounded-xl px-4 py-2 text-sm font-bold transition-all outline-none ${isMono ? 'font-mono' : ''}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}
