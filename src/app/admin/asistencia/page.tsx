'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, type Capacitacion, type Asistencia } from '@/lib/supabase';
import { Download, Loader2, Users, Calendar, FileText, Printer, Search, ArrowUpRight, CheckCircle2, UserCheck, GraduationCap } from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as XLSX from 'xlsx';

export default function AsistenciaControlPage() {
    const { showToast } = useToast();
    const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
    const [selectedCapacitacion, setSelectedCapacitacion] = useState('');
    const [asistencias, setAsistencias] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalPersonas, setTotalPersonas] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCapacitaciones();
        fetchTotalPersonas();
    }, []);

    useEffect(() => {
        if (selectedCapacitacion) {
            fetchAsistencias(selectedCapacitacion);
        } else {
            setAsistencias([]);
        }
    }, [selectedCapacitacion]);

    async function fetchCapacitaciones() {
        const { data } = await supabase.from('capacitaciones').select('*').order('dia', { ascending: false });
        if (data) setCapacitaciones(data);
    }

    async function fetchTotalPersonas() {
        const { count } = await supabase.from('personas').select('*', { count: 'exact', head: true });
        setTotalPersonas(count || 0);
    }

    async function fetchAsistencias(id: string) {
        setLoading(true);
        const { data } = await supabase
            .from('asistencias')
            .select(`
                id,
                fecha_registro,
                personas (dni, nombre, apellido, rol, institucion, celular, eje)
            `)
            .eq('capacitacion_id', id) as any;

        if (data) setAsistencias(data);
        setLoading(false);
    }

    const filteredAsistencias = useMemo(() => {
        if (!searchTerm) return asistencias;
        const s = searchTerm.toLowerCase();
        return asistencias.filter(a =>
            a.personas.nombre.toLowerCase().includes(s) ||
            a.personas.apellido.toLowerCase().includes(s) ||
            a.personas.dni.includes(s)
        );
    }, [asistencias, searchTerm]);

    const handlePrint = () => {
        if (asistencias.length === 0) {
            showToast('Selecciona una capacitación con asistentes primero', 'info');
            return;
        }
        window.print();
    };

    const exportToExcel = () => {
        if (asistencias.length === 0) return;

        const capName = capacitaciones.find(c => c.id === selectedCapacitacion)?.nombre || 'asistencia';
        const worksheetData = asistencias.map((a: any) => ({
            DNI: a.personas.dni,
            Nombre: a.personas.nombre,
            Apellido: a.personas.apellido,
            Rol: a.personas.rol,
            Institución: a.personas.institucion,
            Eje: a.personas.eje || '-',
            WhatsApp: a.personas.celular || '-',
            'Fecha Registro': new Date(a.fecha_registro).toLocaleString(),
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Asistentes");
        XLSX.writeFile(workbook, `${capName.replace(/\s+/g, '_')}_asistencia.xlsx`);
        showToast('Archivo Excel generado correctamente', 'success');
    };

    const exportGeneralStats = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('capacitaciones')
                .select(`
                    nombre,
                    dia,
                    lugar,
                    disertante,
                    asistencias(
                        personas(rol)
                    )
                `)
                .order('dia', { ascending: false });

            if (error) throw error;

            if (data) {
                const worksheetData = data.map((c: any) => {
                    const asistencias_list = c.asistencias || [];
                    const count = asistencias_list.length;

                    const stats = asistencias_list.reduce((acc: any, curr: any) => {
                        let rol = (curr.personas?.rol || 'Sin asignar').toLowerCase().trim();
                        if (rol.includes('estudiante')) rol = 'estudiante avanzado';
                        acc[rol] = (acc[rol] || 0) + 1;
                        return acc;
                    }, {});

                    const percentage = totalPersonas > 0 ? Math.round((count / totalPersonas) * 100) : 0;

                    return {
                        Capacitación: c.nombre,
                        Fecha: new Date(c.dia).toLocaleDateString(),
                        Lugar: c.lugar || 'S/D',
                        Disertante: c.disertante || 'S/D',
                        'Total Asistentes': count,
                        'Docentes': stats['docente'] || 0,
                        'Directivos': stats['directivo'] || 0,
                        'Estud. Avanzados': stats['estudiante avanzado'] || 0,
                        'Sin Rol': stats['sin asignar'] || 0,
                        'Porcentaje Participación': `${percentage}%`
                    };
                });

                const worksheet = XLSX.utils.json_to_sheet(worksheetData);
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Estadísticas Generales");
                XLSX.writeFile(workbook, "estadisticas_generales_capacitaciones.xlsx");
                showToast('Estadísticas exportadas con éxito', 'success');
            }
        } catch (err) {
            console.error('Error al exportar:', err);
            showToast('No se pudieron exportar las estadísticas', 'error');
        } finally {
            setLoading(false);
        }
    };

    const asistenciaPercentage = totalPersonas > 0
        ? Math.round((asistencias.length / totalPersonas) * 100)
        : 0;

    const currentCap = capacitaciones.find(c => c.id === selectedCapacitacion);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Print Header */}
            <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6 text-center">
                <div className="flex justify-center mb-4">
                    <img src="/logo.png" alt="Logo" className="h-20 w-auto" />
                </div>
                <h1 className="text-2xl font-black uppercase tracking-tight">Acta de Asistencia Docente</h1>
                <p className="text-sm font-bold mt-2">Red Municipal de Formación Docente</p>

                <div className="mt-8 grid grid-cols-2 text-left text-sm gap-y-2 border p-4 rounded-lg bg-slate-50">
                    <p><strong>Evento:</strong> {currentCap?.nombre}</p>
                    <p><strong>Fecha:</strong> {currentCap ? new Date(currentCap.dia).toLocaleDateString() : '-'}</p>
                    <p><strong>Lugar:</strong> {currentCap?.lugar || '-'}</p>
                    <p><strong>Disertante:</strong> {currentCap?.disertante || '-'}</p>
                    <p><strong>Total Presentes:</strong> {asistencias.length}</p>
                </div>
            </div>

            {/* Title Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[var(--primary)] font-bold uppercase tracking-widest text-[10px]">
                        <Users size={14} />
                        Gestión de Audiencia
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Control de Asistencia</h2>
                    <p className="text-slate-500 font-medium">Monitorea y analiza el impacto de cada capacitación en tiempo real.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={exportGeneralStats}
                        disabled={loading || capacitaciones.length === 0}
                        className="btn-primary bg-slate-900 hover:bg-slate-800 h-11 px-5 flex items-center justify-center gap-2 group shadow-xl shadow-slate-900/10 border-none transition-all active:scale-95"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />}
                        <span className="text-[11px] font-black uppercase tracking-wider">Estadísticas Globales</span>
                    </button>

                    {selectedCapacitacion && (
                        <>
                            <button
                                onClick={handlePrint}
                                className="btn-primary bg-white border-2 border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200 h-11 px-5 flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                            >
                                <Printer size={18} className="text-slate-400" />
                                <span className="text-[11px] font-black uppercase tracking-wider">Generar Acta</span>
                            </button>
                            <button
                                onClick={exportToExcel}
                                className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-11 px-5 flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 border-none transition-all active:scale-95"
                            >
                                <FileText size={18} />
                                <span className="text-[11px] font-black uppercase tracking-wider">Excel Detallado</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Selection and Quick Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
                {/* Left Sidebar: Selector */}
                <div className="card p-6 border-none shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                            Seleccionar Evento
                        </label>
                        <select
                            className="input-field bg-white dark:bg-slate-800 border-slate-200"
                            value={selectedCapacitacion}
                            onChange={(e) => setSelectedCapacitacion(e.target.value)}
                        >
                            <option value="">Seleccione una...</option>
                            {capacitaciones.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {selectedCapacitacion && currentCap && (
                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                            <div className="flex items-center gap-3 text-sm font-medium">
                                <Calendar size={16} className="text-[var(--primary)]" />
                                {new Date(currentCap.dia).toLocaleDateString()}
                            </div>
                            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest mb-2">Impacto Directo</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{asistenciaPercentage}%</span>
                                    <span className="text-xs font-bold text-slate-500">asist.</span>
                                </div>
                                <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-full transition-all duration-1000"
                                        style={{ width: `${asistenciaPercentage}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase">
                                    {asistencias.length} de {totalPersonas} personas
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Content: Stats Cards and Table */}
                <div className="lg:col-span-3 space-y-6">
                    {selectedCapacitacion ? (
                        <div className="space-y-6">
                            {/* Detailed Stats Row */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <MiniStatCard
                                    label="Asistentes"
                                    value={asistencias.length}
                                    icon={<Users size={20} className="text-blue-500" />}
                                    color="bg-blue-500/10 text-blue-600"
                                />
                                <MiniStatCard
                                    label="Roles Únicos"
                                    value={new Set(asistencias.map(a => a.personas.rol)).size}
                                    icon={<GraduationCap size={20} className="text-purple-500" />}
                                    color="bg-purple-500/10 text-purple-600"
                                />
                                <MiniStatCard
                                    label="Inscritos Hoy"
                                    value={asistencias.filter(a => new Date(a.fecha_registro).toDateString() === new Date().toDateString()).length}
                                    icon={<ArrowUpRight size={20} className="text-emerald-500" />}
                                    color="bg-emerald-500/10 text-emerald-600"
                                />
                            </div>

                            {/* Table Card */}
                            <div className="card overflow-hidden border-none shadow-xl">
                                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight text-sm">
                                        <UserCheck size={18} className="text-[var(--primary)]" />
                                        Listado de Presentes
                                    </h3>
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Filtrar por DNI o Nombre..."
                                            className="input-field py-1.5 pl-9 text-xs w-full sm:w-64"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                                        <Loader2 className="animate-spin mb-4" size={40} />
                                        <p className="font-medium animate-pulse">Obteniendo registros de la base de datos...</p>
                                    </div>
                                ) : filteredAsistencias.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 m-4 rounded-3xl">
                                        <Search size={48} className="opacity-10 mb-4" />
                                        <p className="font-medium">{searchTerm ? 'No hay resultados para tu búsqueda.' : 'No se encontraron asistentes para este evento.'}</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-950/50">
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Participante</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">DNI</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Rol</th>
                                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Hora Registro</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                                {filteredAsistencias.map((a) => (
                                                    <tr key={a.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white uppercase leading-tight group-hover:text-[var(--primary)] transition-colors">
                                                                    {a.personas.nombre} {a.personas.apellido}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{a.personas.institucion || 'S/D'}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-sm text-slate-500 tracking-tighter">
                                                            {a.personas.dni}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-full border ${getRoleStyle(a.personas.rol)}`}>
                                                                {a.personas.rol}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                                    {new Date(a.fecha_registro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400 font-medium italic">hs</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] bg-slate-50/50 dark:bg-slate-900/20">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Calendar size={32} className="opacity-20" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Panel en Espera</h4>
                            <p className="max-w-xs text-center text-sm font-medium">Por favor, selecciona una capacitación en la barra lateral para ver los detalles y registros.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function MiniStatCard({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) {
    return (
        <div className="card p-5 border-none shadow-lg group hover:scale-[1.02] transition-transform duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${color}`}>
                    {icon}
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{value}</p>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{label}</p>
        </div>
    );
}

function getRoleStyle(rol: string) {
    const r = rol.toLowerCase();
    if (r.includes('direc')) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
    if (r.includes('estud')) return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
}
