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
    TrendingUp
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalPersonas: 0,
        totalAsistencias: 0,
        totalCapacitaciones: 0,
        lastMonthGrowth: 12
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            const [personas, asistencias, capacitaciones] = await Promise.all([
                supabase.from('personas').select('*', { count: 'exact', head: true }),
                supabase.from('asistencias').select('*', { count: 'exact', head: true }),
                supabase.from('capacitaciones').select('*', { count: 'exact', head: true })
            ]);

            setStats({
                totalPersonas: personas.count || 0,
                totalAsistencias: asistencias.count || 0,
                totalCapacitaciones: capacitaciones.count || 0,
                lastMonthGrowth: 8
            });
            setLoading(false);
        }
        fetchStats();
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Panel de Control</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Resumen general de la Red de Formación Docente</p>
                </div>
                <div className="glass px-4 py-2 rounded-2xl flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                    <Activity size={16} />
                    Sistema en Línea
                </div>
            </div>

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
                    trend="5 activas hoy"
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

                {/* Information Sidebar */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold px-1">Actividad</h3>
                    <div className="card p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl relative overflow-hidden group">
                        <TrendingUp className="absolute -right-4 -bottom-4 text-white/5 w-40 h-40 group-hover:scale-110 transition-transform duration-700" />
                        <div className="relative z-10">
                            <h4 className="font-bold text-slate-300 uppercase tracking-widest text-[10px] mb-4">Crecimiento Mensual</h4>
                            <p className="text-4xl font-black mb-2">{stats.lastMonthGrowth}%</p>
                            <p className="text-sm text-slate-400 mb-6">Incremento en la tasa de asistencia respecto al mes pasado.</p>
                            <Link href="/admin/asistencia" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                                Ver estadísticas detalladas <ArrowUpRight size={16} />
                            </Link>
                        </div>
                    </div>

                    <div className="card p-6 border-dashed border-2 flex flex-col items-center text-center justify-center space-y-2">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-2">
                            <CalendarCheck size={24} className="text-slate-400" />
                        </div>
                        <h4 className="font-bold text-sm">Próxima Capacitación</h4>
                        <p className="text-xs text-slate-500">No hay eventos programados para las próximas 24 horas.</p>
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
