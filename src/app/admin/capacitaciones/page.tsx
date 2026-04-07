'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import { GraduationCap, Loader2, CheckCircle2, AlertCircle, Trash2, Edit2, Eye, EyeOff, Plus, Calendar, History } from 'lucide-react';

export default function CargarCapacitacionPage() {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nombre: '',
        dia: '',
        hora: '',
        lugar: '',
        disertante: '',
        activa: true
    });

    useEffect(() => {
        fetchCapacitaciones();
    }, []);

    async function fetchCapacitaciones() {
        setFetching(true);
        const { data, error } = await supabase
            .from('capacitaciones')
            .select('*')
            .order('dia', { ascending: false });

        if (data) setCapacitaciones(data);
        setFetching(false);
    }

    const { proximas, pasadas } = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const p = capacitaciones.filter(c => c.dia >= today).sort((a, b) => a.dia.localeCompare(b.dia));
        const pas = capacitaciones.filter(c => c.dia < today).sort((a, b) => b.dia.localeCompare(a.dia));
        return { proximas: p, pasadas: pas };
    }, [capacitaciones]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (isEditing) {
            const { error } = await supabase
                .from('capacitaciones')
                .update(formData)
                .eq('id', isEditing);

            if (error) {
                setMessage({ type: 'error', text: 'Error al actualizar la capacitación.' });
            } else {
                setMessage({ type: 'success', text: 'Capacitación actualizada con éxito.' });
                setIsEditing(null);
                setFormData({ nombre: '', dia: '', hora: '', lugar: '', disertante: '', activa: true });
                fetchCapacitaciones();
            }
        } else {
            const { error } = await supabase.from('capacitaciones').insert([formData]);

            if (error) {
                setMessage({ type: 'error', text: 'Error al registrar la capacitación.' });
            } else {
                setMessage({ type: 'success', text: 'Capacitación creada con éxito.' });
                setFormData({ nombre: '', dia: '', hora: '', lugar: '', disertante: '', activa: true });
                fetchCapacitaciones();
            }
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta capacitación? Se borrarán también todos los registros de asistencia asociados.')) return;

        const { error } = await supabase.from('capacitaciones').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar');
        } else {
            fetchCapacitaciones();
        }
    };

    const handleToggleActiva = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('capacitaciones')
            .update({ activa: !currentStatus })
            .eq('id', id);

        if (error) {
            alert('Error al cambiar estado');
        } else {
            fetchCapacitaciones();
        }
    };

    const startEdit = (cap: Capacitacion) => {
        setIsEditing(cap.id);
        setFormData({
            nombre: cap.nombre,
            dia: cap.dia,
            hora: cap.hora,
            lugar: cap.lugar || '',
            disertante: cap.disertante || '',
            activa: cap.activa ?? true
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-purple-600 font-bold uppercase tracking-widest text-[10px]">
                            <Calendar size={14} />
                            Gestión de Calendario
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                            {isEditing ? 'Editar Capacitación' : 'Nueva Capacitación'}
                        </h2>
                        <p className="text-slate-500 font-medium">Completa los datos del evento para habilitar el registro.</p>
                    </div>

                    {isEditing && (
                        <button
                            onClick={() => {
                                setIsEditing(null);
                                setFormData({ nombre: '', dia: '', hora: '', lugar: '', disertante: '', activa: true });
                            }}
                            className="btn-primary bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 flex items-center justify-center gap-2 border-none shadow-sm transition-all active:scale-95"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest">Cancelar Edición</span>
                        </button>
                    )}
                </div>

                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold">Nombre de la Capacitación *</label>
                                <input
                                    name="nombre" required className="input-field"
                                    value={formData.nombre} onChange={handleChange}
                                    placeholder="Ej: Curso de React Avanzado"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Fecha (Día) *</label>
                                <input
                                    name="dia" type="date" required className="input-field"
                                    value={formData.dia} onChange={handleChange}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Hora *</label>
                                <input
                                    name="hora" type="time" required className="input-field"
                                    value={formData.hora} onChange={handleChange}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Lugar / Plataforma</label>
                                <input
                                    name="lugar" className="input-field"
                                    value={formData.lugar} onChange={handleChange}
                                    placeholder="Ej: Aula Magna o Zoom"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Disertante / Instructor</label>
                                <input
                                    name="disertante" className="input-field"
                                    value={formData.disertante} onChange={handleChange}
                                    placeholder="Nombre del expositor"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
                            <input
                                type="checkbox"
                                id="activa"
                                name="activa"
                                checked={formData.activa}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                            />
                            <label htmlFor="activa" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                                Visible para los asistentes (Habilitar para registro)
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full h-12 flex items-center justify-center gap-2 ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'btn-primary'}`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (isEditing ? 'Actualizar Capacitación' : 'Crear Capacitación')}
                        </button>
                    </form>

                    {message && (
                        <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 animate-fade-in ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            <span className="text-sm font-medium">{message.text}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* List of existing trainings */}
            <div className="space-y-12">
                {/* UPCOMING TRAININGS */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <Calendar size={20} />
                        Próximas Capacitaciones
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs font-bold">
                            {proximas.length}
                        </span>
                    </h3>

                    <div className="grid grid-cols-1 gap-4">
                        {proximas.map((cap) => (
                            <CapacitacionCard
                                key={cap.id}
                                cap={cap}
                                onToggleActiva={handleToggleActiva}
                                onEdit={startEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                        {proximas.length === 0 && !fetching && (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 italic">
                                No hay eventos programados.
                            </div>
                        )}
                    </div>
                </div>

                {/* PAST TRAININGS */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-500">
                        <History size={20} />
                        Capacitaciones Dictadas
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500">
                            {pasadas.length}
                        </span>
                    </h3>

                    <div className="grid grid-cols-1 gap-4 opacity-75">
                        {pasadas.map((cap) => (
                            <CapacitacionCard
                                key={cap.id}
                                cap={cap}
                                onToggleActiva={handleToggleActiva}
                                onEdit={startEdit}
                                onDelete={handleDelete}
                                isPast
                            />
                        ))}
                    </div>
                </div>

                {fetching && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                    </div>
                )}
            </div>
        </div>
    );
}

function CapacitacionCard({ cap, onToggleActiva, onEdit, onDelete, isPast }: {
    cap: Capacitacion,
    onToggleActiva: (id: string, s: boolean) => void,
    onEdit: (cap: Capacitacion) => void,
    onDelete: (id: string) => void,
    isPast?: boolean
}) {
    return (
        <div className={`card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md ${isPast ? 'bg-slate-50/50 dark:bg-slate-900/50' : ''}`}>
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <h4 className="font-bold text-lg uppercase leading-none">{cap.nombre}</h4>
                    {!cap.activa && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold uppercase rounded">Deshabilitada</span>
                    )}
                </div>
                <div className="text-sm text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1 italic">
                        {new Date(cap.dia).toLocaleDateString()} - {cap.hora}
                    </span>
                    {cap.lugar && <span className="opacity-70">📍 {cap.lugar}</span>}
                    {cap.disertante && <span className="opacity-70">👤 {cap.disertante}</span>}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onToggleActiva(cap.id, cap.activa ?? true)}
                    className={`p-2 rounded-lg transition-colors ${cap.activa ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                    title={cap.activa ? 'Ocultar para asistentes' : 'Mostrar para asistentes'}
                >
                    {cap.activa ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
                <button
                    onClick={() => onEdit(cap)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                >
                    <Edit2 size={20} />
                </button>
                <button
                    onClick={() => onDelete(cap.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
}
