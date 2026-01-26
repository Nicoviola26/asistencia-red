import { ClipboardCheck, UserPlus, GraduationCap, UserSearch } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Bienvenido, Administrador</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona las asistencias y capacitaciones desde aquí.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard
                    href="/admin/asistencia"
                    icon={<ClipboardCheck className="text-emerald-500" size={32} />}
                    title="Control Asistencia"
                    description="Ver y exportar asistencias por capacitación."
                    color="border-emerald-500"
                />
                <DashboardCard
                    href="/admin/buscar"
                    icon={<UserSearch className="text-blue-500" size={32} />}
                    title="Buscar Persona"
                    description="Consultar historial de un participante por DNI."
                    color="border-blue-500"
                />
                <DashboardCard
                    href="/admin/personas"
                    icon={<UserPlus className="text-slate-800 dark:text-slate-300" size={32} />}
                    title="Cargar Persona"
                    description="Registrar nuevos participantes al sistema."
                    color="border-slate-800"
                />
                <DashboardCard
                    href="/admin/capacitaciones"
                    icon={<GraduationCap className="text-purple-500" size={32} />}
                    title="Cargar Capacitación"
                    description="Crear nuevos eventos de capacitación."
                    color="border-purple-500"
                />
            </div>

            {/* Basic Stats Mockup or placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card p-6">
                    <h3 className="text-lg font-semibold mb-4">Información del Sistema</h3>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Estado del Servidor</p>
                                <p className="text-lg font-bold text-emerald-500 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    Conectado a Supabase
                                </p>
                            </div>
                            <p className="text-xs text-slate-400 font-mono">v1.0.0</p>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            Usa el menú lateral para acceder a las diferentes funcionalidades. El sistema está optimizado para dispositivos móviles para facilitar la toma de asistencia.
                        </p>
                    </div>
                </div>

                <div className="card p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 rounded-full border-8 border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4">
                        <span className="text-2xl font-bold">100%</span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">Uptime</h3>
                    <p className="text-sm text-slate-500">Sistema operativo y listo</p>
                </div>
            </div>
        </div>
    );
}

function DashboardCard({ href, icon, title, description, color }: {
    href: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    color: string;
}) {
    return (
        <Link
            href={href}
            className={`card p-6 border-l-4 ${color} transition-all hover:translate-y-[-4px] hover:shadow-lg group`}
        >
            <div className="mb-4 transition-transform group-hover:scale-110 duration-300">{icon}</div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
        </Link>
    );
}
