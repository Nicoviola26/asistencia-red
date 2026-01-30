'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
    ClipboardCheck,
    UserPlus,
    GraduationCap,
    UserSearch,
    Mail,
    Users,
    Activity,
    CalendarCheck,
    ArrowUpRight,
    TrendingUp,
    X,
    Loader2,
    MapPin
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalPersonas: 0,
        totalAsistencias: 0,
        totalCapacitaciones: 0,
        porRol: {
            docente: 0,
            directivo: 0,
            estudiante: 0
        }
    });
    const [loading, setLoading] = useState(true);
    const [nextCapacitacion, setNextCapacitacion] = useState<any>(null);
    const [loadingNext, setLoadingNext] = useState(true);
    const [showActivity, setShowActivity] = useState(true);
    const [roleCycleIndex, setRoleCycleIndex] = useState(0);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            const [personas, asistencias, capacitaciones, rolesData] = await Promise.all([
                supabase.from('personas').select('*', { count: 'exact', head: true }),
                supabase.from('asistencias').select('*', { count: 'exact', head: true }),
                supabase.from('capacitaciones').select('*', { count: 'exact', head: true }),
                supabase.from('personas').select('rol')
            ]);

            const perRol = (rolesData.data || []).reduce((acc: any, curr: any) => {
                const r = (curr.rol || '').toLowerCase();
                if (r.includes('docente')) acc.docente++;
                else if (r.includes('direc')) acc.directivo++;
                else if (r.includes('estud')) acc.estudiante++;
                return acc;
            }, { docente: 0, directivo: 0, estudiante: 0 });

            setStats({
                totalPersonas: personas.count || 0,
                totalAsistencias: asistencias.count || 0,
                totalCapacitaciones: capacitaciones.count || 0,
                porRol: perRol
            });
            setLoading(false);
        }

        async function fetchNext() {
            setLoadingNext(true);
            try {
                const today = new Date().toISOString().split('T')[0];
                const { data, error } = await supabase
                    .from('capacitaciones')
                    .select('*')
                    .gte('dia', today)
                    .order('dia', { ascending: true })
                    .order('hora', { ascending: true })
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                setNextCapacitacion(data);
            } catch (err) {
                console.error('Error fetching next training:', err);
            } finally {
                setLoadingNext(false);
            }
        }

        fetchStats();
        fetchNext();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setRoleCycleIndex((prev) => (prev + 1) % 4);
        }, 12000); // 12 segundos
        return () => clearInterval(interval);
    }, []);

    const statSlides = [
        {
            label: 'Red Municipal de Formación',
            value: stats.totalPersonas,
            sub: 'Inscriptos Totales',
            color: 'text-emerald-400',
            icon: <Users size={40} className="text-emerald-500/20" />
        },
        {
            label: 'Programa de Capacitación',
            value: stats.totalCapacitaciones,
            sub: 'Eventos Realizados',
            color: 'text-purple-400',
            icon: <GraduationCap size={40} className="text-purple-500/20" />
        },
    ];

    const currentSlide = statSlides[roleCycleIndex % 2];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Dashboard Headers */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Panel de Control</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Gestión integral de la Red de Formación Docente</p>
                </div>
                <div className="glass px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                    <Activity size={16} />
                    Sistema en Línea
                </div>
            </div>

            {/* Next Training Featured Banner - LIGHTER version */}
            {!loadingNext && nextCapacitacion && (
                <div className="relative overflow-hidden card border-none bg-gradient-to-r from-emerald-500 to-emerald-700 text-white p-1 animate-zoom-in">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 -mr-8 -mt-8">
                        <CalendarCheck size={160} />
                    </div>
                    <div className="relative bg-white/10 backdrop-blur-md rounded-[1.1rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex flex-col items-center justify-center border border-white/30 shrink-0">
                                <span className="text-[10px] font-black uppercase opacity-90">
                                    {new Date(nextCapacitacion.dia).toLocaleDateString(undefined, { month: 'short' })}
                                </span>
                                <span className="text-2xl font-black leading-none">
                                    {new Date(nextCapacitacion.dia).getDate()}
                                </span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="px-2 py-0.5 bg-white text-emerald-600 text-[9px] font-black uppercase rounded-full">Próximo Evento</span>
                                    <span className="text-xs font-bold opacity-90 flex items-center gap-1"><MapPin size={12} /> {nextCapacitacion.lugar || 'S/D'}</span>
                                </div>
                                <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">{nextCapacitacion.nombre}</h3>
                                <p className="text-sm font-medium opacity-90 mt-1">Con el disertante <span className="font-bold">{nextCapacitacion.disertante || 'Por confirmar'}</span> a las {nextCapacitacion.hora} hs</p>
                            </div>
                        </div>
                        <Link
                            href="/admin/checklist"
                            className="px-6 py-3 bg-white text-emerald-700 rounded-xl font-black uppercase text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-900/10"
                        >
                            Ver Preparativos
                        </Link>
                    </div>
                </div>
            )}

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Docentes Registrados"
                    value={stats.totalPersonas}
                    icon={<Users className="text-blue-500" />}
                    trend="+12 esta semana"
                    loading={loading}
                />
                <MetricCard
                    title="Asistencias Totales"
                    value={stats.totalAsistencias}
                    icon={<CalendarCheck className="text-emerald-500" />}
                    trend="+45 últimos 30 días"
                    loading={loading}
                />
                <MetricCard
                    title="Capacitaciones"
                    value={stats.totalCapacitaciones}
                    icon={<GraduationCap className="text-purple-500" />}
                    trend={`${nextCapacitacion ? 'Siguiente programada' : 'Sin pendientes'}`}
                    loading={loading}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Navigation */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold px-1">Accesos Directos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <NavCard
                            href="/admin/asistencia"
                            icon={<ClipboardCheck className="text-emerald-500" size={24} />}
                            title="Control Asistencia"
                            description="Ver y exportar asistencias por capacitación."
                        />
                        <NavCard
                            href="/admin/buscar"
                            icon={<UserSearch className="text-blue-500" size={24} />}
                            title="Buscar Persona"
                            description="Consultar historial de un participante por DNI."
                        />
                        <NavCard
                            href="/admin/personas"
                            icon={<UserPlus className="text-slate-800 dark:text-slate-200" size={24} />}
                            title="Gestionar Personas"
                            description="Alta individual o importación masiva desde Excel."
                        />
                        <NavCard
                            href="/admin/mensajeria"
                            icon={<Mail className="text-indigo-500" size={24} />}
                            title="Mensajería"
                            description="Comunicados individuales o masivos por mail."
                        />
                    </div>
                </div>

                {/* Information Sidebar / Stats Carousel */}
                <div className="flex flex-col">
                    <h3 className="text-xl font-bold px-1 mb-6">Información Clave</h3>
                    <div className="card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl relative overflow-hidden group flex flex-col justify-center lg:h-[338px]">
                        {/* Decorative Background Icon */}
                        <div className="absolute -right-4 -bottom-4 text-white/5 w-48 h-48 group-hover:scale-110 transition-transform duration-700">
                            {currentSlide.icon}
                        </div>

                        <div key={roleCycleIndex % 2} className="relative z-10 animate-fade-in flex flex-col h-full">
                            <h4 className="font-bold text-slate-300 uppercase tracking-widest text-[9px] mb-6 flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    {[0, 1].map(i => (
                                        <div key={i} className={`w-2 h-2 rounded-full transition-all duration-500 ${i === (roleCycleIndex % 2) ? 'bg-emerald-500 w-6' : 'bg-slate-700'}`} />
                                    ))}
                                </div>
                                {currentSlide.label}
                            </h4>

                            <div className="flex-1 flex flex-col justify-center">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <p className="text-7xl font-black tabular-nums tracking-tighter leading-none">{currentSlide.value}</p>
                                    <p className={`${currentSlide.color} text-[10px] font-black uppercase tracking-widest`}>{currentSlide.sub}</p>
                                </div>
                                <p className="text-sm text-slate-400 leading-tight max-w-xs mt-3">
                                    {roleCycleIndex % 2 === 0
                                        ? 'Docentes y directivos de nuestra red municipal.'
                                        : 'Capacitaciones para potenciar la educación.'}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Activity size={10} className="text-emerald-500 animate-pulse" />
                                Datos en vivo
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon, trend, loading }: { title: string, value: number, icon: React.ReactNode, trend: string, loading: boolean }) {
    return (
        <div className="card p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                    {icon}
                </div>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">{trend}</span>
            </div>
            {loading ? (
                <div className="space-y-2">
                    <div className="h-8 w-24 skeleton" />
                    <div className="h-4 w-32 skeleton" />
                </div>
            ) : (
                <>
                    <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">{value.toLocaleString()}</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">{title}</p>
                </>
            )}
        </div>
    );
}

function NavCard({ href, icon, title, description }: { href: string, icon: React.ReactNode, title: string, description: string }) {
    return (
        <Link
            href={href}
            className="group flex flex-col p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:border-[var(--primary)] hover:shadow-2xl hover:shadow-[var(--primary)]/5 transition-all duration-300"
        >
            <div className="p-3 w-fit bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-[var(--primary)] transition-colors">{title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{description}</p>
        </Link>
    );
}
