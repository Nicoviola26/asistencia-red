'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, ChevronRight, HelpCircle, Monitor, Package, ShieldCheck, Plus, Trash2 } from 'lucide-react';

interface Task {
    id: string;
    text: string;
    completed: boolean;
    category: 'técnica' | 'logística' | 'sistema';
}

const DEFAULT_TASKS: Task[] = [
    { id: '1', text: 'Cargar la capacitación en el sistema de asistencia', completed: false, category: 'sistema' },
    { id: '2', text: 'Generar y descargar el código QR de registro', completed: false, category: 'sistema' },
    { id: '3', text: 'Verificar conexión a internet en el lugar', completed: false, category: 'técnica' },
    { id: '4', text: 'Probar proyector y sonido', completed: false, category: 'técnica' },
    { id: '5', text: 'Controlar que el disertante tenga agua y café', completed: false, category: 'logística' },
    { id: '6', text: 'Tener a mano lapiceras y folletos extras', completed: false, category: 'logística' },
    { id: '7', text: 'Verificar que el aire acondicionado o ventilación funcione', completed: false, category: 'técnica' },
    { id: '8', text: 'Preparar banner o señalización en la entrada', completed: false, category: 'logística' },
];

export default function ChecklistPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [newCategory, setNewCategory] = useState<Task['category']>('técnica');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('asistencia_checklist');
        if (saved) {
            setTasks(JSON.parse(saved));
        } else {
            setTasks(DEFAULT_TASKS);
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            localStorage.setItem('asistencia_checklist', JSON.stringify(tasks));
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
        if (confirm('¿Deseas restablecer la lista a los valores por defecto? Se perderán las tareas nuevas.')) {
            setTasks(DEFAULT_TASKS);
        }
    };

    if (!mounted) return null;

    const categories = [
        { id: 'sistema', label: 'Gestión / Sistema', icon: <ShieldCheck size={18} /> },
        { id: 'técnica', label: 'Técnica / Equipamiento', icon: <Monitor size={18} /> },
        { id: 'logística', label: 'Logística / Organización', icon: <Package size={18} /> },
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
                        <h2 className="text-2xl font-bold">Cosas a tener en cuenta</h2>
                        <p className="text-slate-500">Checklist operativa para que la capacitación sea un éxito.</p>
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
            <div className="card p-6 bg-white dark:bg-slate-900 border-l-4 border-[var(--primary)]">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">Preparación del Evento</h3>
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
                    <option value="técnica">Técnica</option>
                    <option value="logística">Logística</option>
                    <option value="sistema">Sistema</option>
                </select>
                <button type="submit" className="btn-primary flex items-center gap-2">
                    <Plus size={18} /> Agregar
                </button>
            </form>

            {/* Task List by Category */}
            <div className="space-y-6">
                {categories.map(cat => (
                    <div key={cat.id} className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest pl-2">
                            {cat.icon}
                            {cat.label}
                        </div>
                        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
                            {tasks.filter(t => t.category === cat.id).length === 0 ? (
                                <div className="p-6 text-center text-slate-400 text-sm">No hay tareas en esta categoría.</div>
                            ) : (
                                tasks.filter(t => t.category === cat.id).map(task => (
                                    <div
                                        key={task.id}
                                        className={`flex items-center gap-4 p-4 transition-all duration-200 group ${task.completed ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}
                                    >
                                        <button
                                            onClick={() => toggleTask(task.id)}
                                            className={`shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-slate-300 dark:border-slate-700 hover:border-[var(--primary)]'}`}
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
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                <HelpCircle className="shrink-0 text-amber-500" size={20} />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed font-medium">
                    <span className="font-bold">Pro-tip:</span> Los cambios en esta lista se guardan localmente en tu navegador.
                    Podes usarla para organizarte minutos antes de empezar la capacitación directamente desde tu celular o notebook.
                </p>
            </div>
        </div>
    );
}
