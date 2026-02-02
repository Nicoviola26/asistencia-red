'use client';

import { useState } from 'react';
import { HelpCircle, X, BookOpen, UserPlus, GraduationCap, ClipboardCheck, Mail } from 'lucide-react';

export default function HelpModal() {
    const [isOpen, setIsOpen] = useState(false);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 text-emerald-400 hover:text-white transition-colors text-sm font-medium"
                title="Ver Manual de Ayuda"
            >
                <HelpCircle size={18} />
                Guía Rápida de Uso
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-900 dark:text-white">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-zoom-in">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--primary)] text-white rounded-xl shadow-lg">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">¿Cómo uso el sistema?</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Guía para el Coordinador</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* Paso 1 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0 border border-blue-200 dark:border-blue-800">1</div>
                        <div className="space-y-1">
                            <h4 className="font-bold flex items-center gap-2">
                                <UserPlus size={16} className="text-blue-500" />
                                Cargar una Persona
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Ve a <strong>"Cargar Persona"</strong>. Completa DNI, Nombre y Mail. Es fundamental para que el docente pueda poner su DNI en la entrada y el sistema lo reconozca.
                            </p>
                        </div>
                    </div>

                    {/* Paso 2 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center font-black shrink-0 border border-purple-200 dark:border-purple-800">2</div>
                        <div className="space-y-1">
                            <h4 className="font-bold flex items-center gap-2">
                                <GraduationCap size={16} className="text-purple-500" />
                                Crear un Evento
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                Ve a <strong>"Gestionar Capacitaciones"</strong>. Ponle nombre, fecha y asegúrate de que el estado sea <strong>"Habilitada"</strong> para que aparezca en la pantalla de registro.
                            </p>
                        </div>
                    </div>

                    {/* Paso 3 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black shrink-0 border border-emerald-200 dark:border-emerald-800">3</div>
                        <div className="space-y-1">
                            <h4 className="font-bold flex items-center gap-2">
                                <ClipboardCheck size={16} className="text-emerald-500" />
                                Ver Asistentes y PDF
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                En <strong>"Control Asistencia"</strong> elige tu evento. Verás la lista de los presentes. Presiona <strong>"Exportar PDF"</strong> para bajar la planilla lista para imprimir.
                            </p>
                        </div>
                    </div>

                    {/* Paso 4 */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black shrink-0 border border-orange-200 dark:border-orange-800">4</div>
                        <div className="space-y-1">
                            <h4 className="font-bold flex items-center gap-2">
                                <Mail size={16} className="text-orange-500" />
                                Enviar Mails Masivos
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                En <strong>"Mensajería"</strong>, busca "Envío Masivo". Elige tu capacitación, escribe el mensaje y envía. ¡Ya puedes cerrar la pestaña! El sistema hace el resto solo.
                            </p>
                        </div>
                    </div>

                    {/* Tip Offline */}
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl">
                        <p className="text-[10px] font-black uppercase text-amber-600 mb-1">💡 Dato Importante: Sin Internet</p>
                        <p className="text-xs m-0 text-amber-700 dark:text-amber-400">Si el lugar no tiene señal, los DNI se guardan igual en la tablet/celular y se suben solos cuando vuelvas a tener internet.</p>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="btn-primary py-2 px-8 font-bold rounded-2xl shadow-lg shadow-[var(--primary)]/20"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
