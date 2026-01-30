'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, CheckCircle2, ChevronRight, HelpCircle, FastForward, Play, CheckCircle, Plus, Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Task {
    id: string;
    text: string;
    completed: boolean;
    category: 'previo' | 'durante' | 'despues';
}

const DEFAULT_TASKS: Task[] = [
    { id: '1', text: 'Cargar la capacitación en el sistema de asistencia', completed: false, category: 'previo' },
    { id: '2', text: 'Generar y descargar el código QR de registro', completed: false, category: 'previo' },
    { id: '3', text: 'Verificar conexión a internet y proyector', completed: false, category: 'previo' },
    { id: '4', text: 'Proyectar el código QR en pantalla gigante', completed: false, category: 'durante' },
    { id: '5', text: 'Asistir a los docentes que tengan problemas con el DNI', completed: false, category: 'durante' },
    { id: '6', text: 'Monitorear el ingreso en tiempo real desde el panel', completed: false, category: 'durante' },
    { id: '7', text: 'Descargar el listado de asistencia en Excel', completed: false, category: 'despues' },
    { id: '8', text: 'Enviar certificados o material por correo', completed: false, category: 'despues' },
];

export default function ChecklistPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [newCategory, setNewCategory] = useState<Task['category']>('previo');
    const [mounted, setMounted] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const [loading, setLoading] = useState(true);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('checklist')
            .select('*')
            .order('created_at', { ascending: true });

        if (data && data.length > 0) {
            setTasks(data);
        } else if (data && data.length === 0) {
            // Seed if empty
            const { error: insertError } = await supabase.from('checklist').insert(
                DEFAULT_TASKS.map(({ id, ...rest }) => ({ ...rest }))
            );
            if (!insertError) {
                const { data: newData } = await supabase.from('checklist').select('*').order('created_at', { ascending: true });
                if (newData) setTasks(newData);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchTasks();
        setMounted(true);
    }, [fetchTasks]);

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        const { error } = await supabase
            .from('checklist')
            .update({ completed: !task.completed })
            .eq('id', id);

        if (!error) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        }
    };

    const addTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;

        const { data, error } = await supabase
            .from('checklist')
            .insert({
                text: newTask,
                completed: false,
                category: newCategory
            })
            .select()
            .single();

        if (data && !error) {
            setTasks(prev => [...prev, data]);
            setNewTask('');
        }
    };

    const removeTask = async (id: string) => {
        const { error } = await supabase
            .from('checklist')
            .delete()
            .eq('id', id);

        if (!error) {
            setTasks(prev => prev.filter(t => t.id !== id));
        }
    };

    const resetTasks = async () => {
        const { error: deleteError } = await supabase
            .from('checklist')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (!deleteError) {
            const { error: insertError } = await supabase.from('checklist').insert(
                DEFAULT_TASKS.map(({ id, ...rest }) => ({ ...rest }))
            );
            if (!insertError) {
                fetchTasks();
                setShowResetModal(false);
            }
        }
    };

    if (!mounted) return null;

    const categories = [
        { id: 'previo', label: 'Previos a la Capacitación', icon: <FastForward size={18} className="rotate-0" /> },
        { id: 'durante', label: 'Durante la Capacitación', icon: <Play size={18} /> },
        { id: 'despues', label: 'Después de la Capacitación', icon: <CheckCircle size={18} /> },
    ];

    const completedCount = tasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / tasks.length) * 100) || 0;

    return (
        <>
            <div className="space-y-8 animate-fade-in">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-[10px]">
                            <ClipboardList size={14} />
                            Planificación Logística
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Cosas a Tener en Cuenta</h2>
                        <p className="text-slate-500 font-medium">Cronograma de tareas para que la Capacitación sea un ÉXITO</p>
                    </div>
                    <button
                        onClick={() => setShowResetModal(true)}
                        className="btn-primary bg-slate-100 hover:bg-slate-200 text-slate-500 h-10 px-5 flex items-center justify-center gap-2 border-none shadow-sm transition-all active:scale-95"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">Restablecer Lista</span>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="card p-6 bg-white dark:bg-slate-900 border-l-4 border-[var(--primary)] shadow-md">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-700 dark:text-slate-300">Progreso Total</h3>
                        <span className="text-sm font-bold text-[var(--primary)]">{progress}% Completado</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div
                            className="bg-[var(--primary)] h-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(73,179,141,0.3)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Add Task Form */}
                <form onSubmit={addTask} className="flex flex-wrap gap-2">
                    <input
                        type="text"
                        required
                        placeholder="Agregar un nuevo punto a tener en cuenta..."
                        className="input-field flex-1 min-w-[300px]"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                    />
                    <select
                        className="input-field w-full md:w-auto"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as Task['category'])}
                    >
                        <option value="previo">Previos</option>
                        <option value="durante">Durante</option>
                        <option value="despues">Después</option>
                    </select>
                    <button type="submit" className="btn-primary flex items-center gap-2">
                        <Plus size={18} /> Agregar
                    </button>
                </form>

                {/* Task List by Category */}
                <div className="space-y-6">
                    {categories.map(cat => (
                        <div key={cat.id} className="space-y-3">
                            <div className={`flex items-center gap-2 font-bold uppercase text-[11px] tracking-widest pl-2 opacity-80 ${cat.id === 'previo' ? 'text-amber-500' :
                                cat.id === 'durante' ? 'text-blue-500' :
                                    'text-emerald-500'
                                }`}>
                                {cat.icon}
                                {cat.label}
                            </div>
                            <div className="card divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                                {tasks.filter(t => t.category === cat.id).length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-sm">No hay tareas programadas.</div>
                                ) : (
                                    tasks.filter(t => t.category === cat.id).map(task => (
                                        <div
                                            key={task.id}
                                            className={`flex items-center gap-4 p-4 transition-all duration-200 group ${task.completed ? 'bg-emerald-50/20 dark:bg-emerald-950/5' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                                        >
                                            <button
                                                onClick={() => toggleTask(task.id)}
                                                className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-[var(--primary)] border-[var(--primary)] text-white scale-110' : 'border-slate-300 dark:border-slate-700 hover:border-[var(--primary)]'}`}
                                            >
                                                {task.completed && <CheckCircle2 size={16} />}
                                            </button>
                                            <span className={`flex-1 text-sm font-medium transition-all ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {task.text}
                                            </span>
                                            <button
                                                onClick={() => removeTask(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all focus:opacity-100"
                                                title="Eliminar punto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Tip */}
                <div className="flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    <HelpCircle className="shrink-0 text-slate-400" size={20} />
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Esta lista es temporal y sirve como ayuda memoria para la organización de cada evento. Podés restablecerla cuando comience un nuevo ciclo de capacitación.
                    </p>
                </div>
            </div>

            {/* Custom Reset Modal - Moved outside the animated container for perfect centering */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-pure"
                        onClick={() => setShowResetModal(false)}
                    />
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-10 animate-fade-in-pure border border-slate-200 dark:border-slate-800">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center shadow-inner">
                                <AlertTriangle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">¿Restablecer Lista?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Esta acción volverá la lista a su estado original. Perderás todas las tareas personalizadas y el progreso actual.
                                </p>
                            </div>
                            <div className="flex flex-col w-full gap-2 pt-2">
                                <button
                                    onClick={resetTasks}
                                    className="btn-primary bg-amber-600 hover:bg-amber-700 text-white h-12 border-none shadow-lg shadow-amber-600/20 active:scale-95 transition-all w-full"
                                >
                                    <span className="text-xs font-black uppercase tracking-widest">Sí, Restablecer Todo</span>
                                </button>
                                <button
                                    onClick={() => setShowResetModal(false)}
                                    className="btn-primary bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 h-12 border-none hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all w-full"
                                >
                                    <span className="text-xs font-black uppercase tracking-widest">No, Mantener Lista</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
