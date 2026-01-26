'use client';

import { useState, useEffect } from 'react';
import { supabase, type Capacitacion, type Asistencia } from '@/lib/supabase';
import { Download, Loader2, Users, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AsistenciaControlPage() {
    const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
    const [selectedCapacitacion, setSelectedCapacitacion] = useState('');
    const [asistencias, setAsistencias] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalPersonas, setTotalPersonas] = useState(0);

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
        const { data, error } = await supabase
            .from('asistencias')
            .select(`
        id,
        fecha_registro,
        personas (dni, nombre, apellido, rol, institucion, celular, eje)
      `)
            .eq('capacitacion_id', id);

        if (data) setAsistencias(data);
        setLoading(false);
    }

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

                    // Contar por roles
                    const stats = asistencias_list.reduce((acc: any, curr: any) => {
                        let rol = (curr.personas?.rol || 'Sin asignar').toLowerCase().trim();
                        // Normalizar para incluir datos viejos que solo decían "estudiante"
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
            }
        } catch (err) {
            console.error('Error al exportar:', err);
            alert('No se pudieron exportar las estadísticas.');
        } finally {
            setLoading(false);
        }
    };

    const asistenciaPercentage = totalPersonas > 0
        ? Math.round((asistencias.length / totalPersonas) * 100)
        : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Control de Asistencia</h2>
                    <p className="text-slate-500">Monitorea y exporta los registros en tiempo real.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={exportGeneralStats}
                        disabled={loading || capacitaciones.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        Exportar Estadísticas Generales
                    </button>

                    {selectedCapacitacion && (
                        <button
                            onClick={exportToExcel}
                            className="btn-success flex items-center gap-2"
                        >
                            <Download size={18} />
                            Exportar Asistencia Actual
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="card p-6 lg:col-span-1 space-y-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Seleccionar Capacitación
                    </label>
                    <select
                        className="input-field"
                        value={selectedCapacitacion}
                        onChange={(e) => setSelectedCapacitacion(e.target.value)}
                    >
                        <option value="">Seleccione una...</option>
                        {capacitaciones.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>

                    {selectedCapacitacion && (
                        <div className="pt-4 space-y-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Participación</p>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-bold text-slate-800 dark:text-white">{asistenciaPercentage}%</p>
                                    <p className="text-sm text-slate-500 mb-1">del total ({asistencias.length}/{totalPersonas})</p>
                                </div>
                                <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-full transition-all duration-1000"
                                        style={{ width: `${asistenciaPercentage}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="card lg:col-span-3 overflow-hidden">
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                            <Loader2 className="animate-spin mb-2" size={32} />
                            <p>Cargando registros...</p>
                        </div>
                    ) : !selectedCapacitacion ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p>Selecciona una capacitación para ver los asistentes.</p>
                        </div>
                    ) : asistencias.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                            <Users size={48} className="mb-4 opacity-20" />
                            <p>No hay asistentes registrados todavía.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">DNI</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Nombre Completo</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Rol</th>
                                        <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Fecha Registro</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {asistencias.map((a) => (
                                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-sm">{a.personas.dni}</td>
                                            <td className="px-6 py-4 font-medium uppercase">{a.personas.nombre} {a.personas.apellido}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                                    {a.personas.rol}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {new Date(a.fecha_registro).toLocaleTimeString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
