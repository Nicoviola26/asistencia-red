'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { HelpCircle, X, ExternalLink, BookOpen, UserCheck, ShieldCheck } from 'lucide-react';

export default function HelpModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-emerald-400 hover:text-white transition-colors text-sm font-medium"
                title="Ver Manual de Ayuda"
            >
                <HelpCircle size={18} />
                Ayuda / Manual
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-900 dark:text-white">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-zoom-in">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--primary)] text-white rounded-xl">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Centro de Ayuda</h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Manuales del Sistema</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setActiveTab('admin')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'admin'
                                ? 'border-[var(--primary)] text-[var(--primary)]'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <ShieldCheck size={18} />
                        Manual Administrador
                    </button>
                    <button
                        onClick={() => setActiveTab('user')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-widest transition-all border-b-2 flex items-center justify-center gap-2 ${activeTab === 'user'
                                ? 'border-[var(--primary)] text-[var(--primary)]'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <UserCheck size={18} />
                        Manual de Registro
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 prose dark:prose-invert max-w-none">
                    {activeTab === 'admin' ? (
                        <div className="animate-fade-in space-y-6 text-sm">
                            <section>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-500">
                                    <ExternalLink size={18} />
                                    Gestión de Mensajería Robusta
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    El nuevo sistema de envío masivo utiliza una cola de mensajes. Al presionar "Enviar", puedes cerrar la pestaña. Los correos se enviarán automáticamente en segundo plano a través de QStash.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-emerald-500">
                                    <ExternalLink size={18} />
                                    Checklist Sincronizado
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    La lista de tareas ahora es compartida. Cualquier cambio realizado por un administrador es visible para todo el equipo en tiempo real, permitiendo una coordinación perfecta pre y post evento.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-blue-500">
                                    <ExternalLink size={18} />
                                    Control de Capacitaciones
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Solo las capacitaciones marcadas como "Activas" aparecerán en el formulario público. Utiliza el buscador por DNI para ver el historial completo de cualquier docente registrado.
                                </p>
                            </section>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-xs uppercase mb-2">💡 Nota Profesional</p>
                                <p className="text-xs m-0">Para una guía completa con capturas de pantalla, consulta el archivo <code>MANUAL_ADMIN.md</code> en la carpeta raíz del proyecto.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-fade-in space-y-6 text-sm">
                            <section>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-amber-500">
                                    <ExternalLink size={18} />
                                    Registro sin Internet (Modo Offline)
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Nuestra plataforma PWA permite registrar asistencias incluso si el lugar no tiene conexión. Los datos se guardan en el navegador y se suben solos cuando recuperas señal.
                                </p>
                            </section>
                            <section>
                                <h3 className="text-lg font-bold flex items-center gap-2 text-blue-500">
                                    <ExternalLink size={18} />
                                    Instalar como Aplicación
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400">
                                    En celulares, utiliza la opción "Agregar a la pantalla de inicio" para tener un acceso directo con ícono, tal como una aplicación móvil nativa.
                                </p>
                            </section>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-xs uppercase mb-2">📧 Notificaciones</p>
                                <p className="text-xs m-0">Los docentes reciben un mail automático de confirmación si tienen un correo electrónico cargado en su perfil.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="btn-primary py-2 px-6"
                    >
                        Cerrar Manual
                    </button>
                </div>
            </div>
        </div>
    );
}
