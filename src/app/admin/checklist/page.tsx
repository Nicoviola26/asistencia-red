'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, ChevronRight, HelpCircle, FastForward, Play, CheckCircle, Plus, Trash2 } from 'lucide-react';

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

    useEffect(() => {
        const saved = localStorage.getItem('asistencia_checklist_v2');
        if (saved) {
            setTasks(JSON.parse(saved));
        } else {
            setTasks(DEFAULT_TASKS);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem('asistencia_checklist_v2', JSON.stringify(tasks));
        }
    }, [tasks, mounted]);

    const toggleTask = (id: string) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    };

    const addTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.trim()) return;
        const task: Task = {
            id: Date.now().toString(),
            text: newTask,
            completed: false,
            category: newCategory
        };
        setTasks(prev => [...prev, task]);
        setNewTask('');
    };

    const removeTask = (id: string) => {
        setTasks(prev => prev.filter(t => t.id !== id));
    };

    const resetTasks = () => {
        if (confirm('¿Deseas restablecer la lista a los valores por defecto?')) {
            setTasks(DEFAULT_TASKS);
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
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-[var(--primary)] text-white rounded-xl shadow-lg shadow-emerald-500/20">
                        <ClipboardList size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Cosas a Tener en Cuenta</h2>
                        <p className="text-slate-500">Cronograma de tareas para la organización del evento.</p>
                    </div>
                </div>
                <button
                    onClick={resetTasks}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider transition-colors"
                >
                    Restablecer lista
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
                    <option value="despues">Despúes</option>
                </select>
                <button type="submit" className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Agregar
                </button>
            </form>

            {/* Task List by Category */}
            <div className="space-y-6">
                {categories.map(cat => (
                    <div key={cat.id} className="space-y-3">
                        <div className={`flex items-center gap-2 font-bold uppercase text-[11px] tracking-widest pl-2 ${cat.id === 'previo' ? 'text-amber-500' :
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
    );
}
