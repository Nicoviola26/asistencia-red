import { ClipboardCheck, UserPlus, GraduationCap, UserSearch, Mail } from 'lucide-react';
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
                <DashboardCard
                    href="/admin/mensajeria"
                    icon={<Mail className="text-indigo-500" size={32} />}
                    title="Mensajería"
                    description="Envía comunicados individuales o masivos."
                    color="border-indigo-500"
                />
            </div>

            {/* Basic Stats Mockup or placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold">Resumen de Gestión</h3>
                        <p className="text-sm text-slate-500">
                            Descarga un reporte consolidado con el total de asistentes y porcentajes de todas las capacitaciones.
                        </p>
                    </div>
                    <Link
                        href="/admin/asistencia"
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all shadow-lg active:scale-95"
                    >
                        Ir a Descargar Estadísticas
                    </Link>
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
