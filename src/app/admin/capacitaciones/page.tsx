'use client';

import { useState, useEffect } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import { GraduationCap, Loader2, CheckCircle2, AlertCircle, Trash2, Edit2, Eye, EyeOff, Plus } from 'lucide-react';

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
            activa: (cap as any).activa ?? true
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-12">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-600 text-white rounded-xl">
                            <Plus size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{isEditing ? 'Editar Capacitación' : 'Nueva Capacitación'}</h2>
                            <p className="text-slate-500">Completa los datos del evento.</p>
                        </div>
                    </div>
                    {isEditing && (
                        <button
                            onClick={() => {
                                setIsEditing(null);
                                setFormData({ nombre: '', dia: '', hora: '', lugar: '', disertante: '', activa: true });
                            }}
                            className="text-sm font-medium text-slate-500 hover:text-slate-700 underline"
                        >
                            Cancelar Edición
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
            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    Capacitaciones Existentes
                    {!fetching && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
                            {capacitaciones.length}
                        </span>
                    )}
                </h3>

                {fetching ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-slate-400" size={32} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {capacitaciones.map((cap) => (
                            <div key={cap.id} className="card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-lg uppercase leading-none">{cap.nombre}</h4>
                                        {!(cap as any).activa && (
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
                                        onClick={() => handleToggleActiva(cap.id, (cap as any).activa ?? true)}
                                        className={`p-2 rounded-lg transition-colors ${(cap as any).activa ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                                        title={(cap as any).activa ? 'Ocultar para asistentes' : 'Mostrar para asistentes'}
                                    >
                                        {(cap as any).activa ? <Eye size={20} /> : <EyeOff size={20} />}
                                    </button>
                                    <button
                                        onClick={() => startEdit(cap)}
                                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        <Edit2 size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(cap.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {capacitaciones.length === 0 && (
                            <div className="text-center py-12 text-slate-400 italic">
                                No hay capacitaciones registradas.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

