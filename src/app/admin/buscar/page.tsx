'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserSearch, Search, Loader2, User, Clock, MapPin, Building2, Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function BuscarPersonaPage() {
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
            }
        } catch (err) {
            console.error('Error al exportar:', err);
            alert('No se pudo exportar la lista de participantes.');
        } finally {
            setExporting(false);
        }
    };

    const handleUpdatePersona = async (e: React.FormEvent) => {
        e.preventDefault();
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
                celular: persona.celular
            })
            .eq('id', persona.id);

        if (error) {
            alert('Error al actualizar: ' + error.message);
        } else {
            alert('Datos actualizados correctamente');
        }
        setLoading(false);
    };



    const handleDeleteAsistencia = async (asistenciaId: string) => {
        if (!confirm('¿Eliminar este registro de asistencia?')) return;

        const { error } = await supabase.from('asistencias').delete().eq('id', asistenciaId);

        if (error) {
            alert('Error al eliminar asistencia');
        } else {
            setAsistencias(asistencias.filter(a => a.id !== asistenciaId));
        }
    };

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deleteConfig, setDeleteConfig] = useState<{ type: 'single' | 'bulk', id?: string, count: number }>({ type: 'single', count: 0 });

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
                alert('Persona eliminada correctamente');
            } else if (deleteConfig.type === 'bulk') {
                const { error } = await supabase.from('personas').delete().in('id', selectedIds);
                if (error) throw error;
                setSearchResults(prev => prev.filter(p => !selectedIds.includes(p.id)));
                setSelectedIds([]);
                setPersona(null);
                alert('Personas eliminadas correctamente');
            }
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
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
                queryBuilder = queryBuilder.or(`dni.eq.${query.trim()},nombre.ilike.%${query.trim()}%,apellido.ilike.%${query.trim()}%`);
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
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Buscar Participante</h2>
                    <p className="text-slate-500">Consulta el historial de asistencia de una persona.</p>
                </div>
                <button
                    onClick={handleDownloadParticipants}
                    disabled={exporting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 shadow-sm"
                >
                    {exporting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    Exportar Todos los Participantes
                </button>
            </div>

            <div className="card p-6 max-w-xl mx-auto">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por DNI, Nombre o Apellido..."
                            className="input-field pl-10"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? <Loader2 className="animate-spin" /> : 'Buscar'}
                    </button>
                </form>
                {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            </div>

            {/* Multiple Search Results */}
            {searchResults.length > 0 && (
                <div className="max-w-xl mx-auto space-y-3 px-4 md:px-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedIds.length === searchResults.length}
                                onChange={toggleSelectAll}
                                className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <p className="text-sm font-medium text-slate-500">
                                {query.trim() ? 'Múltiples coincidencias encontradas:' : 'Listado completo de personas:'}
                            </p>
                        </div>
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-bold transition-all shadow-sm animate-fade-in"
                            >
                                <Trash2 size={14} /> Eliminar ({selectedIds.length})
                            </button>
                        )}
                    </div>
                    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                        {searchResults.map((p) => (
                            <div
                                key={p.id}
                                className="w-full flex items-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                            >
                                <div className="pl-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(p.id)}
                                        onChange={() => toggleSelect(p.id)}
                                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                </div>
                                <button
                                    onClick={() => selectPersona(p)}
                                    className="flex-1 p-4 flex items-center justify-between text-left"
                                >
                                    <div>
                                        <p className="font-bold uppercase leading-tight">{p.nombre} {p.apellido}</p>
                                        <p className="text-xs text-slate-500 font-mono mt-1">DNI: {p.dni}</p>
                                    </div>
                                    <User size={20} className="text-slate-300" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {persona && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    {/* Persona Info */}
                    <div className="card p-6 h-fit bg-slate-800 text-white">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center border-4 border-slate-600 shadow-lg">
                                <User size={40} className="text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold uppercase">{persona.nombre} {persona.apellido}</h3>
                                <p className="text-emerald-400 font-mono text-sm">{persona.dni}</p>
                            </div>
                            <div className="w-full pt-4 space-y-3 text-left">
                                <InfoItem icon={<Building2 size={16} />} label="Institución" value={persona.institucion || 'No especificada'} />
                                <InfoItem icon={<User size={16} />} label="Rol" value={persona.rol} />
                                <InfoItem icon={<MapPin size={16} />} label="Eje" value={persona.eje || 'No especificado'} />
                                <InfoItem icon={<Clock size={16} />} label="Email" value={persona.correo || '-'} />
                            </div>
                        </div>
                    </div>

                    {/* Attendance History */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Edit Persona Section */}
                        <div className="card p-6 bg-white dark:bg-slate-900 border-t-4 border-emerald-500">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold">Editar Datos de la Persona</h3>
                                <button
                                    onClick={() => handleDeletePersona(persona.id)}
                                    className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 uppercase transition-colors"
                                >
                                    <Trash2 size={14} /> Eliminar Persona
                                </button>
                            </div>
                            <form onSubmit={handleUpdatePersona} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Nombre</label>
                                    <input
                                        className="input-field py-1 px-3 text-sm"
                                        value={persona.nombre}
                                        onChange={(e) => setPersona({ ...persona, nombre: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Apellido</label>
                                    <input
                                        className="input-field py-1 px-3 text-sm"
                                        value={persona.apellido}
                                        onChange={(e) => setPersona({ ...persona, apellido: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">DNI</label>
                                    <input
                                        className="input-field py-1 px-3 text-sm"
                                        value={persona.dni}
                                        onChange={(e) => setPersona({ ...persona, dni: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Rol</label>
                                    <select
                                        className="input-field py-1 px-3 text-sm"
                                        value={persona.rol}
                                        onChange={(e) => setPersona({ ...persona, rol: e.target.value })}
                                    >
                                        <option value="docente">Docente</option>
                                        <option value="directivo">Directivo</option>
                                        <option value="estudiante avanzado">Estudiante Avanzado</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Eje</label>
                                    <select
                                        className="input-field py-1 px-3 text-sm"
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
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Email</label>
                                    <input
                                        type="email"
                                        className="input-field py-1 px-3 text-sm"
                                        value={persona.correo || ''}
                                        onChange={(e) => setPersona({ ...persona, correo: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Número de contacto (WhatsApp)</label>
                                    <input
                                        className="input-field py-1 px-3 text-sm"
                                        value={persona.celular || ''}
                                        onChange={(e) => setPersona({ ...persona, celular: e.target.value })}
                                        placeholder="Ej: 3624123456"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400">Institución</label>
                                    <input
                                        className="input-field py-1 px-3 text-sm"
                                        value={persona.institucion || ''}
                                        onChange={(e) => setPersona({ ...persona, institucion: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full btn-primary h-10 text-sm flex items-center justify-center gap-2"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* History */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                Historial de Asistencias
                                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                                    {asistencias.length}
                                </span>
                            </h3>

                            {asistencias.length === 0 ? (
                                <div className="card p-12 flex flex-col items-center justify-center text-slate-400">
                                    <Clock size={48} className="opacity-20 mb-4" />
                                    <p>No registra asistencias hasta el momento.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {asistencias.map((asistencia) => (
                                        <div key={asistencia.id} className="card p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">
                                                    {asistencia.capacitaciones.nombre}
                                                </h4>
                                                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={14} /> {asistencia.capacitaciones.lugar || 'S/D'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={14} /> {new Date(asistencia.capacitaciones.dia).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-xs font-medium text-slate-400 uppercase">Registrado</p>
                                                    <p className="font-semibold text-emerald-500">{new Date(asistencia.fecha_registro).toLocaleTimeString()}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteAsistencia(asistencia.id)}
                                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                                    title="Eliminar asistencia"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-scale-in">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                                    <AlertTriangle size={32} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirmar Eliminación</h3>
                                    <p className="text-sm text-slate-500">Esta acción no se puede deshacer.</p>
                                </div>
                            </div>

                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                                Estás por eliminar definitivamente a <span className="font-bold text-red-600 dark:text-red-400">{deleteConfig.count === 1 ? 'esta persona' : `${deleteConfig.count} personas`}</span>, ¿estás seguro?
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg active:scale-95"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="mt-0.5 text-slate-400">{icon}</div>
            <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</p>
                <p className="text-sm font-medium">{value}</p>
            </div>
        </div>
    );
}
