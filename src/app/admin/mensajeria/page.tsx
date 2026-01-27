'use client';

import { useState, useEffect } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import { Mail, Search, Users, Loader2, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function MensajeriaPage() {
    const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    // Individual Mail State
    const [dni, setDni] = useState('');
    const [targetPersona, setTargetPersona] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    // For build stability, let's define what we expect from a person
    type PersonaSimple = {
        id: string;
        nombre: string;
        apellido: string;
        correo: string | null;
    };
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    // Broadcast Mail State
    const [selectedCapacitacion, setSelectedCapacitacion] = useState('');
    const [attendeesCount, setAttendeesCount] = useState(0);
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');

    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchCapacitaciones();
    }, []);

    async function fetchCapacitaciones() {
        const { data } = await supabase.from('capacitaciones').select('*').order('dia', { ascending: false });
        if (data) setCapacitaciones(data);
    }

    async function handlePersonaSearch() {
        if (!dni) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('personas')
            .select('*')
            .eq('dni', dni.trim())
            .single();

        if (data) {
            setTargetPersona(data);
            setStatus(null);
        } else {
            setTargetPersona(null);
            setStatus({ type: 'error', text: 'No se encontró ninguna persona con ese DNI.' });
        }
        setLoading(false);
    }

    async function fetchAttendeesCount(id: string) {
        if (!id) {
            setAttendeesCount(0);
            return;
        }
        const { count } = await supabase
            .from('asistencias')
            .select('*', { count: 'exact', head: true })
            .eq('capacitacion_id', id);
        setAttendeesCount(count || 0);
    }

    useEffect(() => {
        fetchAttendeesCount(selectedCapacitacion);
    }, [selectedCapacitacion]);

    async function sendIndividualEmail(e: React.FormEvent) {
        e.preventDefault();
        if (!targetPersona || !targetPersona.correo) return;

        setSending(true);
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'custom',
                    email: targetPersona.correo,
                    name: targetPersona.nombre,
                    subject: subject,
                    message: message
                })
            });
            const data = await res.json();
            if (data.success) {
                setStatus({ type: 'success', text: 'Correo enviado correctamente.' });
                setSubject('');
                setMessage('');
            } else {
                throw new Error(data.error);
            }
        } catch (err: unknown) {
            const error = err as Error;
            setStatus({ type: 'error', text: 'Error al enviar el correo: ' + error.message });
        } finally {
            setSending(false);
        }
    }

    async function sendBroadcastEmail(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCapacitacion) return;

        setSending(true);
        setStatus({ type: 'success', text: 'Iniciando envío masivo... Por favor espera.' });

        try {
            // 1. Fetch all attendees with emails
            const { data: asistencias } = await supabase
                .from('asistencias')
                .select('personas(id, nombre, correo)')
                .eq('capacitacion_id', selectedCapacitacion);

            if (!asistencias || asistencias.length === 0) {
                setStatus({ type: 'error', text: 'No hay asistentes con correo para esta capacitación.' });
                setSending(false);
                return;
            }

            const recipients = (asistencias as any[])
                .map(a => a.personas)
                .filter((p): p is PersonaSimple => !!p && !!p.correo);

            let successCount = 0;
            for (const person of recipients) {
                const res = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'custom',
                        email: person.correo,
                        name: person.nombre,
                        subject: broadcastSubject,
                        message: broadcastMessage
                    })
                });
                if (res.ok) successCount++;
            }

            setStatus({
                type: 'success',
                text: `Se enviaron ${successCount} correos de ${recipients.length} destinatarios encontrados.`
            });
            setBroadcastSubject('');
            setBroadcastMessage('');
        } catch (err: unknown) {
            const error = err as Error;
            setStatus({ type: 'error', text: 'Error en el envío masivo: ' + error.message });
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Mensajería y Notificaciones</h2>
                <p className="text-slate-500 dark:text-slate-400">Envía comunicados individuales o masivos por correo electrónico.</p>
            </div>

            {status && (
                <div className={`p-4 rounded-xl flex items-start gap-3 transition-all ${status.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                    <p className="font-medium text-sm">{status.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Individual Email Card */}
                <div className="card p-6 flex flex-col h-full shadow-lg border-t-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Send size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Correo Individual</h3>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Buscar por DNI</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="number"
                                        className="input-field pl-10"
                                        placeholder="Ingrese DNI..."
                                        value={dni}
                                        onChange={(e) => setDni(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePersonaSearch()}
                                    />
                                </div>
                                <button
                                    onClick={handlePersonaSearch}
                                    disabled={loading}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Buscar'}
                                </button>
                            </div>
                        </div>

                        {targetPersona && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-top-2">
                                <p className="font-bold text-slate-900 dark:text-white uppercase">{targetPersona.nombre} {targetPersona.apellido}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{targetPersona.correo || '⚠️ No tiene correo registrado'}</p>
                            </div>
                        )}

                        <form onSubmit={sendIndividualEmail} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Asunto</label>
                                <input
                                    required
                                    className="input-field"
                                    placeholder="Ej: Recordatorio de documentación"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Mensaje</label>
                                <textarea
                                    required
                                    className="input-field min-h-[150px] py-3 resize-none"
                                    placeholder="Escribe el mensaje aquí..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={sending || !targetPersona || !targetPersona.correo}
                                className="w-full btn-primary h-12 flex items-center justify-center gap-2"
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Enviar Correo</>}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Broadcast Email Card */}
                <div className="card p-6 flex flex-col h-full shadow-lg border-t-4 border-emerald-500">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                            <Users size={24} />
                        </div>
                        <h3 className="text-xl font-bold">Envío por Capacitación</h3>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Seleccionar Capacitación</label>
                            <select
                                className="input-field"
                                value={selectedCapacitacion}
                                onChange={(e) => setSelectedCapacitacion(e.target.value)}
                            >
                                <option value="">Seleccione una capacitación...</option>
                                {capacitaciones.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Asistentes registrados:</p>
                                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">{attendeesCount}</p>
                            </div>
                            <p className="text-[10px] text-emerald-600 mt-1 uppercase tracking-wider font-bold">Se enviará un correo a cada uno</p>
                        </div>

                        <form onSubmit={sendBroadcastEmail} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Asunto del Comunicado</label>
                                <input
                                    required
                                    className="input-field"
                                    placeholder="Ej: Material de la capacitación disponible"
                                    value={broadcastSubject}
                                    onChange={(e) => setBroadcastSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Mensaje Masivo</label>
                                <textarea
                                    required
                                    className="input-field min-h-[150px] py-3 resize-none"
                                    placeholder="Escribe el comunicado masivo aquí..."
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={sending || !selectedCapacitacion || attendeesCount === 0}
                                className="w-full btn-primary h-12 flex items-center justify-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-500/20"
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <><Users size={18} /> Enviar a Todos</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
