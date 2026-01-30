'use client';

import { useState, useEffect } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import { Mail, Search, Users, Loader2, Send, CheckCircle2, AlertCircle, X, Paperclip, FileIcon } from 'lucide-react';

export default function MensajeriaPage() {
    const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    // Individual Mail State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<PersonaSimple[]>([]);

    const [selectedPersonas, setSelectedPersonas] = useState<PersonaSimple[]>([]);
    // For build stability, let's define what we expect from a person
    type PersonaSimple = {
        id: string;
        nombre: string;
        apellido: string;
        correo: string | null;
        rol?: string;
    };
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [individualAttachments, setIndividualAttachments] = useState<{ filename: string, content: string }[]>([]);

    // Broadcast Mail State
    const [broadcastType, setBroadcastType] = useState<'capacitacion' | 'rol'>('capacitacion');
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedCapacitacion, setSelectedCapacitacion] = useState('');
    const [recipientCount, setRecipientCount] = useState(0);
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastAttachments, setBroadcastAttachments] = useState<{ filename: string, content: string }[]>([]);

    const [status, setStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchCapacitaciones();
    }, []);

    async function fetchCapacitaciones() {
        const { data } = await supabase.from('capacitaciones').select('*').order('dia', { ascending: false });
        if (data) setCapacitaciones(data);
    }

    async function handlePersonaSearch() {
        if (!searchTerm) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        setStatus(null);
        // setTargetPersona(null); // No need to reset selection on new search

        // Search by DNI (exact) or Name/Surname/Role (partial)
        let query = supabase
            .from('personas')
            .select('id, nombre, apellido, correo, dni, rol')
            .limit(10);

        // Check if search term is numeric (DNI)
        if (/^\d+$/.test(searchTerm.trim())) {
            query = query.eq('dni', searchTerm.trim());
        } else {
            // Text search (ILIKE) on nombre, apellido, or rol
            // Note: Supabase UI simple filtering doesn't support OR easily in one go without custom RPC or specific client syntax
            // We'll use a text search approach or simple 'or' filter string
            // 'nombre.ilike.%term%,apellido.ilike.%term%,rol.ilike.%term%'
            const term = `%${searchTerm.trim()}%`;
            query = query.or(`nombre.ilike.${term},apellido.ilike.${term},rol.ilike.${term}`);
        }

        const { data, error } = await query;

        if (data && data.length > 0) {
            setSearchResults(data as PersonaSimple[]);
            if (data.length === 1) {
                // Auto-select if only one result
                // setTargetPersona(data[0]); 
                // Better to let user click to confirm
            }
        } else {
            setSearchResults([]);
            setStatus({ type: 'error', text: 'No se encontraron personas con ese criterio.' });
        }
        setLoading(false);
    }

    function togglePersonaSelection(persona: PersonaSimple) {
        // Check if already selected
        const isSelected = selectedPersonas.some(p => p.id === persona.id);

        if (isSelected) {
            // Remove
            setSelectedPersonas(prev => prev.filter(p => p.id !== persona.id));
        } else {
            // Add
            setSelectedPersonas(prev => [...prev, persona]);
            setSearchTerm(''); // Clear search after adding one? Maybe user wants to add more. Let's keep search active but clear results if desired. 
            // Better UX: keep search results open to pick more, or clear?
            // User request: "que me deje seleccionar mas de un contacto" -> imply searching and picking multiple.
            // Let's clear the search term to let them search for the next person easily.
            setSearchTerm('');
            setSearchResults([]);
        }
    }

    function removePersona(id: string) {
        setSelectedPersonas(prev => prev.filter(p => p.id !== id));
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isBroadcast: boolean) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const newAttachments = await Promise.all(files.map(async (file) => {
                return new Promise<{ filename: string, content: string }>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result as string;
                        const base64Content = result.split(',')[1];
                        resolve({ filename: file.name, content: base64Content });
                    };
                    reader.readAsDataURL(file);
                });
            }));

            if (isBroadcast) {
                setBroadcastAttachments(prev => [...prev, ...newAttachments]);
            } else {
                setIndividualAttachments(prev => [...prev, ...newAttachments]);
            }
            // Reset input
            e.target.value = '';
        }
    };

    const removeAttachment = (index: number, isBroadcast: boolean) => {
        if (isBroadcast) {
            setBroadcastAttachments(prev => prev.filter((_, i) => i !== index));
        } else {
            setIndividualAttachments(prev => prev.filter((_, i) => i !== index));
        }
    };



    async function fetchRecipientCount() {
        setRecipientCount(0);

        if (broadcastType === 'capacitacion') {
            if (!selectedCapacitacion) return;
            // Count unique people with emails in the training
            const { data } = await supabase
                .from('asistencias')
                .select('personas(id, correo)')
                .eq('capacitacion_id', selectedCapacitacion);

            if (data) {
                const uniqueEmails = new Set(
                    (data as any[])
                        .map(a => a.personas?.correo)
                        .filter(bit => bit && bit.length > 0)
                );
                setRecipientCount(uniqueEmails.size);
            }
        } else {
            // Role based count
            if (!selectedRole) return;

            let query = supabase
                .from('personas')
                .select('id', { count: 'exact', head: true })
                .neq('correo', null)
                .neq('correo', '');

            if (selectedRole !== 'todos') {
                // Assuming rol is stored as simple text. Using ilike for better matching
                query = query.ilike('rol', `%${selectedRole}%`);
            }

            const { count } = await query;
            setRecipientCount(count || 0);
        }
    }

    useEffect(() => {
        fetchRecipientCount();
    }, [broadcastType, selectedCapacitacion, selectedRole]);

    async function sendIndividualEmail(e: React.FormEvent) {
        e.preventDefault();
        if (selectedPersonas.length === 0) return;

        setSending(true);
        setStatus({ type: 'success', text: 'Enviando correos...' });

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const person of selectedPersonas) {
                if (!person.correo) continue;

                const res = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'custom',
                        email: person.correo,
                        name: person.nombre,
                        subject: subject,
                        message: message,
                        attachments: individualAttachments
                    })
                })

                if (res.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            }

            if (successCount > 0) {
                setStatus({ type: 'success', text: `Se enviaron ${successCount} correos correctamente.${errorCount > 0 ? ` Fallaron ${errorCount}.` : ''}` });
                setSubject('');
                setMessage('');
                setIndividualAttachments([]);
                setSelectedPersonas([]); // Clear selection after successful send
            } else {
                setStatus({ type: 'error', text: 'No se pudo enviar ningún correo. Verifique los errores.' });
            }

        } catch (err: unknown) {
            const error = err as Error;
            setStatus({ type: 'error', text: 'Error procesando el envío: ' + error.message });
        } finally {
            setSending(false);
        }
    }

    async function sendBroadcastEmail(e: React.FormEvent) {
        e.preventDefault();
        if (broadcastType === 'capacitacion' && !selectedCapacitacion) return;
        if (broadcastType === 'rol' && !selectedRole) return;

        setSending(true);
        setStatus({ type: 'success', text: 'Iniciando envío masivo... Por favor espera.' });

        try {

            let recipients: PersonaSimple[] = [];

            if (broadcastType === 'capacitacion') {
                // 1. Fetch from attendance
                const { data: asistencias } = await supabase
                    .from('asistencias')
                    .select('personas(id, nombre, correo)')
                    .eq('capacitacion_id', selectedCapacitacion);

                if (asistencias) {
                    recipients = (asistencias as any[])
                        .map(a => a.personas)
                        .filter((p): p is PersonaSimple => !!p && !!p.correo);
                }
            } else {
                // 2. Fetch from people table directly
                let query = supabase
                    .from('personas')
                    .select('id, nombre, apellido, correo')
                    .neq('correo', null)
                    .neq('correo', '');

                if (selectedRole !== 'todos') {
                    query = query.ilike('rol', `%${selectedRole}%`);
                }

                const { data } = await query;
                if (data) recipients = data as PersonaSimple[];
            }

            // Deduplicate recipients by email just in case
            const uniqueRecipients = Array.from(new Map(recipients.map(item => [item.correo, item])).values());

            if (uniqueRecipients.length === 0) {
                setStatus({ type: 'error', text: 'No hay destinatarios con correo válido para esta selección.' });
                setSending(false);
                return;
            }

            let successCount = 0;
            for (const person of uniqueRecipients) {
                if (!person.correo) continue;
                const res = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'custom',
                        email: person.correo,
                        name: person.nombre,
                        subject: broadcastSubject,
                        message: broadcastMessage,
                        attachments: broadcastAttachments
                    })
                })
                if (res.ok) successCount++;
            }

            setStatus({
                type: 'success',
                text: `Se enviaron ${successCount} correos de ${uniqueRecipients.length} destinatarios encontrados.`
            });
            setBroadcastSubject('');
            setBroadcastMessage('');
            setBroadcastAttachments([]);
        } catch (err: unknown) {
            const error = err as Error;
            setStatus({ type: 'error', text: 'Error en el envío masivo: ' + error.message });
        } finally {
            setSending(false);
        }
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 print:hidden">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-600 font-bold uppercase tracking-widest text-[10px]">
                        <Mail size={14} />
                        Centro de Comunicaciones
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Mensajería y Notificaciones</h2>
                    <p className="text-slate-500 font-medium">Envía comunicados individuales o masivos por correo electrónico.</p>
                </div>
            </div>

            {status && (
                <div className={`p-4 rounded-xl flex items-start gap-3 transition-all ${status.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                    }`}>
                    {status.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                    <p className="font-medium text-sm">{status.text}</p>
                </div>
            )
            }

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
                            <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Buscar Persona</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        className="input-field pl-10"
                                        placeholder="Nombre, Apellido, DNI o Rol..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
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

                            {/* Search Results List */}
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                                    {searchResults.map((p) => {
                                        const isSelected = selectedPersonas.some(selected => selected.id === p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                onClick={() => togglePersonaSelection(p)}
                                                disabled={isSelected}
                                                className={`w-full text-left p-3 border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors flex justify-between items-center group ${isSelected
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/10 opacity-60 cursor-default'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700'
                                                    }`}
                                            >
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-slate-200">
                                                        {p.nombre} {p.apellido} {isSelected && <span className="text-emerald-600 ml-2 text-xs font-bold">(Seleccionado)</span>}
                                                    </p>
                                                    <div className="flex gap-2 text-xs text-slate-500">
                                                        {p.rol && <span className="uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide border border-blue-200 dark:border-blue-800">{p.rol}</span>}
                                                        <span>{p.id}</span>
                                                    </div>
                                                </div>
                                                {p.correo ? (
                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{p.correo}</span>
                                                ) : (
                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">Sin correo</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Selected List */}
                        {selectedPersonas.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Destinatarios seleccionados ({selectedPersonas.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedPersonas.map(persona => (
                                        <div key={persona.id} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{persona.nombre} {persona.apellido}</span>
                                                <div className="flex gap-1 items-center">
                                                    {persona.rol && <span className="text-[9px] uppercase bg-slate-200 dark:bg-slate-800 px-1 rounded text-slate-600 dark:text-slate-400">{persona.rol}</span>}
                                                    <span className="text-[10px] text-slate-500">{persona.correo || '⚠️ Sin mail'}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removePersona(persona.id)}
                                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-full transition-colors"
                                                title="Quitar"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
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

                            {/* Attachments UI - Individual */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer flex items-center gap-1.5">
                                        <Paperclip size={14} /> Adjuntar archivo
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, false)}
                                        />
                                    </label>
                                    <span className="text-[10px] text-slate-400">PDF, Imágenes, etc.</span>
                                </div>
                                {individualAttachments.length > 0 && (
                                    <div className="space-y-1">
                                        {individualAttachments.map((att, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-sm">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileIcon size={14} className="text-slate-400 shrink-0" />
                                                    <span className="truncate text-slate-600 dark:text-slate-300">{att.filename}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(i, false)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={sending || selectedPersonas.length === 0}
                                className="w-full btn-primary h-12 flex items-center justify-center gap-2"
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <><Send size={18} /> Enviar a {selectedPersonas.length} Persona(s)</>}
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
                        <h3 className="text-xl font-bold">Envío Masivo</h3>
                    </div>

                    <div className="space-y-4 flex-1">
                        {/* Selector de Modo */}
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setBroadcastType('capacitacion')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${broadcastType === 'capacitacion'
                                    ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                Por Capacitación
                            </button>
                            <button
                                type="button"
                                onClick={() => setBroadcastType('rol')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${broadcastType === 'rol'
                                    ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                Por Rol / Global
                            </button>
                        </div>

                        <div>
                            {broadcastType === 'capacitacion' ? (
                                <>
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
                                </>
                            ) : (
                                <>
                                    <label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Seleccionar Audiencia</label>
                                    <select
                                        className="input-field"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                    >
                                        <option value="">Seleccione un grupo...</option>
                                        <option value="todos">🌍 TODOS LOS REGISTRADOS</option>
                                        <option value="docente">🧑‍🏫 Docentes</option>
                                        <option value="directivo">👔 Directivos</option>
                                        <option value="asistente">👥 Asistentes</option>
                                        <option value="estudiante">🎓 Estudiantes</option>
                                    </select>
                                </>
                            )}
                        </div>

                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">Destinatarios estimados:</p>
                                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-300">{recipientCount}</p>
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

                            {/* Attachments UI - Broadcast */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="btn-secondary text-xs px-3 py-1.5 cursor-pointer flex items-center gap-1.5">
                                        <Paperclip size={14} /> Adjuntar archivo
                                        <input
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, true)}
                                        />
                                    </label>
                                    <span className="text-[10px] text-slate-400">PDF, Imágenes, etc.</span>
                                </div>
                                {broadcastAttachments.length > 0 && (
                                    <div className="space-y-1">
                                        {broadcastAttachments.map((att, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg text-sm">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <FileIcon size={14} className="text-slate-400 shrink-0" />
                                                    <span className="truncate text-slate-600 dark:text-slate-300">{att.filename}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAttachment(i, true)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={sending || recipientCount === 0 || (broadcastType === 'capacitacion' && !selectedCapacitacion) || (broadcastType === 'rol' && !selectedRole)}
                                className="w-full btn-primary h-12 flex items-center justify-center gap-2 !bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-500/20"
                            >
                                {sending ? <Loader2 className="animate-spin" /> : <><Users size={18} /> Enviar a Todos</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div >
    );
}
