'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Download, Loader2, Search, GraduationCap, Medal, Star, Trophy } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/components/Toast';

type DocenteDestacado = {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    rol: string;
    institucion: string | null;
    email: string | null;
    celular: string | null;
    total_asistencias: number;
    ultima_asistencia: string;
};

export default function PlateaDocentePage() {
    const { showToast } = useToast();
    const [docentes, setDocentes] = useState<DocenteDestacado[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDocentesDestacados();
    }, []);

    async function fetchDocentesDestacados() {
        setLoading(true);
        try {
            // Fetch all attendances with person details
            const { data, error } = await supabase
                .from('asistencias')
                .select(`
                    capacitacion_id,
                    fecha_registro,
                    personas (
                        id, dni, nombre, apellido, rol, institucion, correo, celular
                    )
                `);

            if (error) throw error;

            if (data) {
                // Process data to group by person
                const personasMap = new Map<string, {
                    person: any;
                    capacitaciones: Set<string>;
                    dates: string[];
                }>();

                data.forEach((registro: any) => {
                    const person = registro.personas;
                    if (!person) return;

                    // Filter for "docente" role (flexible matching)
                    const rol = (person.rol || '').toLowerCase();
                    const isDocente = rol.includes('docen') || rol.includes('prof');

                    if (isDocente) {
                        if (!personasMap.has(person.id)) {
                            personasMap.set(person.id, {
                                person,
                                capacitaciones: new Set(),
                                dates: []
                            });
                        }
                        const entry = personasMap.get(person.id)!;
                        entry.capacitaciones.add(registro.capacitacion_id);
                        entry.dates.push(registro.fecha_registro);
                    }
                });

                // Filter for >= 3 unique trainings and format
                const list: DocenteDestacado[] = [];
                personasMap.forEach((entry) => {
                    if (entry.capacitaciones.size >= 3) {
                        const sortedDates = entry.dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                        list.push({
                            id: entry.person.id,
                            nombre: entry.person.nombre,
                            apellido: entry.person.apellido,
                            dni: entry.person.dni,
                            rol: entry.person.rol,
                            institucion: entry.person.institucion,
                            email: entry.person.correo,
                            celular: entry.person.celular,
                            total_asistencias: entry.capacitaciones.size,
                            ultima_asistencia: sortedDates[0]
                        });
                    }
                });

                // Sort by total attendances (desc) then name (asc)
                list.sort((a, b) => {
                    if (b.total_asistencias !== a.total_asistencias) {
                        return b.total_asistencias - a.total_asistencias;
                    }
                    return a.apellido.localeCompare(b.apellido);
                });

                setDocentes(list);
            }
        } catch (error) {
            console.error('Error al cargar platea docente:', error);
            showToast('Error al cargar los datos', 'error');
        } finally {
            setLoading(false);
        }
    }

    const filteredDocentes = useMemo(() => {
        if (!searchTerm) return docentes;
        const s = searchTerm.toLowerCase();
        return docentes.filter(d =>
            d.nombre.toLowerCase().includes(s) ||
            d.apellido.toLowerCase().includes(s) ||
            d.dni.includes(s) ||
            (d.institucion || '').toLowerCase().includes(s)
        );
    }, [docentes, searchTerm]);

    const exportToExcel = () => {
        if (docentes.length === 0) return;

        const worksheetData = docentes.map(d => ({
            Apellido: d.apellido,
            Nombre: d.nombre,
            DNI: d.dni,
            Institución: d.institucion || '-',
            Rol: d.rol,
            'Total Capacitaciones': d.total_asistencias,
            'Última Asistencia': new Date(d.ultima_asistencia).toLocaleDateString(),
            Email: d.email || '-',
            Celular: d.celular || '-'
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Platea Docente");
        XLSX.writeFile(workbook, "platea_docente_destacada.xlsx");
        showToast('Listado exportado correctamente', 'success');
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest text-[10px]">
                        <Medal size={14} />
                        Reconocimiento al Compromiso
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-3">
                        Platea Docente
                        <span className="text-amber-500">
                            <Trophy size={28} />
                        </span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">
                        Listado de docentes destacados con alta participación (3 o más capacitaciones).
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToExcel}
                        disabled={loading || docentes.length === 0}
                        className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-10 px-5 flex items-center justify-center gap-2 group shadow-lg shadow-emerald-600/20 border-none transition-all active:scale-[0.97] whitespace-nowrap"
                    >
                        {loading ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">Exportar Excel</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-6 border-l-4 border-amber-500 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Destacados</span>
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg">
                            <Trophy size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {docentes.length}
                    </div>
                </div>

                <div className="card p-6 border-l-4 border-emerald-500 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Promedio Asistencias</span>
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <GraduationCap size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {docentes.length > 0
                            ? (docentes.reduce((acc, curr) => acc + curr.total_asistencias, 0) / docentes.length).toFixed(1)
                            : '0'}
                    </div>
                </div>

                <div className="card p-6 border-l-4 border-blue-500 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Máximo Alcanzado</span>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Star size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-900 dark:text-white">
                        {docentes.length > 0
                            ? Math.max(...docentes.map(d => d.total_asistencias))
                            : '0'}
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <div className="card overflow-hidden border-none shadow-xl">
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight text-sm">
                        <Star size={18} className="text-amber-500 fill-amber-500" />
                        Cuadro de Honor
                    </h3>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar docente o institución..."
                            className="input-field py-1.5 pl-9 text-xs w-full sm:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 flex flex-col items-center justify-center space-y-4">
                        <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
                        <p className="text-sm font-medium text-slate-500">Calculando participaciones...</p>
                    </div>
                ) : filteredDocentes.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <GraduationCap size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="font-medium">No se encontraron docentes con 3 o más capacitaciones.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950/50">
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-12 text-center">#</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Docente</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest hidden md:table-cell">Institución</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Nivel</th>
                                    <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Capacitaciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {filteredDocentes.map((d, index) => (
                                    <tr key={d.id} className="group hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                                        <td className="px-6 py-4 text-center font-mono text-xs text-slate-400">
                                            {index + 1}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white uppercase leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-2">
                                                    {d.apellido} {d.nombre}
                                                    {index < 3 && <Trophy size={14} className="text-amber-500" />}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 flex items-center gap-2">
                                                    <span className="tracking-wider">DNI: {d.dni}</span>
                                                    {d.celular && <span className="text-slate-300">•</span>}
                                                    {d.celular}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 uppercase">
                                                {d.institucion || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {[...Array(Math.min(d.total_asistencias, 5))].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={12}
                                                        className={`${i < 3 ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                                                    />
                                                ))}
                                                {d.total_asistencias > 5 && (
                                                    <span className="text-[10px] font-bold text-slate-400 ml-1">+{d.total_asistencias - 5}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center justify-center px-4 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                                                <span className="text-lg font-black text-slate-900 dark:text-white">
                                                    {d.total_asistencias}
                                                </span>
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
    );
}
