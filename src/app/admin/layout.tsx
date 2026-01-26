'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FilePlus, Calendar, Search, LogOut, Lock, Loader2, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const auth = localStorage.getItem('admin_auth');
        if (auth === 'true') {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin123') {
            localStorage.setItem('admin_auth', 'true');
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Contraseña incorrecta');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_auth');
        setIsAuthenticated(false);
        window.location.href = '/';
    };

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-slate-400" size={40} />
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md card p-8 shadow-2xl border-t-4 border-slate-800">
                    <div className="flex flex-col items-center mb-6">
                        <div className="p-3 bg-slate-800 text-white rounded-full mb-4">
                            <Lock size={32} />
                        </div>
                        <h1 className="text-2xl font-bold">Acceso Administrador</h1>
                        <p className="text-slate-500 text-sm">Ingrese la contraseña para continuar</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                className="input-field text-center text-lg tracking-widest"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-red-500 text-center text-sm font-medium">{error}</p>}
                        <button type="submit" className="w-full btn-primary h-12">
                            Entrar al Panel
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 underline">
                            Volver al Inicio
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
            {/* Sidebar for Desktop */}
            <aside className="w-full md:w-64 bg-slate-800 text-white flex flex-col shadow-xl z-10">
                <div className="p-6">
                    <Link href="/admin" className="flex items-center gap-3 text-xl font-bold tracking-tight">
                        <div className="w-10 h-10 rounded-full bg-white overflow-hidden shadow-lg border-2 border-[var(--primary)] p-0.5 shrink-0">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <span className="leading-tight text-lg">Red Municipal</span>
                    </Link>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1">
                    <SidebarLink href="/admin/asistencia" icon={<Calendar size={20} />} label="Control Asistencia" />
                    <SidebarLink href="/admin/buscar" icon={<Search size={20} />} label="Buscar Persona" />
                    <SidebarLink href="/admin/personas" icon={<FilePlus size={20} />} label="Cargar Persona" />
                    <SidebarLink href="/admin/capacitaciones" icon={<Calendar size={20} />} label="Gestionar Capacitaciones" />
                    <SidebarLink href="/admin/checklist" icon={<ClipboardList size={20} />} label="Cosas a tener en cuenta" />
                </nav>

                <div className="p-4 mt-auto border-t border-slate-700">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors text-sm"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

function SidebarLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all font-medium group"
        >
            <div className="text-emerald-400 group-hover:scale-110 transition-transform">{icon}</div>
            <span>{label}</span>
        </Link>
    );
}

