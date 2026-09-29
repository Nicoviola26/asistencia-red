'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import {
    X, Loader2, Search, UserPlus, FileSpreadsheet, Trash2,
    CheckCircle2, UserCheck, UserX, Users, AlertTriangle, Check, Minus
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import * as XLSX from 'xlsx';

type PersonaRow = {
    id: string;
    dni: string;
    nombre: string;
    apellido: string;
    rol: string;
    institucion: string | null;
};

// Fila cruda del Excel, antes de saber si esa persona ya existe.
type FilaImportada = {
    dni: string;
    nombre: string;
    apellido: string;
    rolCrudo: string;
    institucion: string;
};

function puntuar(f: FilaImportada): number {
    return [f.nombre, f.apellido, f.rolCrudo, f.institucion].filter(v => v && v.trim()).length;
}

function mapearRol(crudo: string): string {
    const r = (crudo || '').toLowerCase();
    if (r.includes('dir') || r.includes('vice') || r.includes('rector')) return 'Directivo';
    if (r.includes('sec')) return 'Secretario/a';
    if (r.includes('estud') || r.includes('alumno')) return 'Estudiante Avanzado';
    if (r.includes('agen') || r.includes('muni') || r.includes('admin')) return 'Agente Municipal';
    return 'Docente';
}

type Props = {
    capacitacion: Capacitacion;
    onClose: () => void;
    onChange: () => void;
};

export default function ModalConvocados({ capacitacion, onClose, onChange }: Props) {
    const { showToast } = useToast();

    const [convocados, setConvocados] = useState<PersonaRow[]>([]);
    const [asistentesIds, setAsistentesIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState('');
    const [resultados, setResultados] = useState<PersonaRow[]>([]);
    const [buscando, setBuscando] = useState(false);

    const [filtro, setFiltro] = useState<'todos' | 'asistieron' | 'ausentes'>('todos');
    const [filtroLista, setFiltroLista] = useState('');
    const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
    const [procesando, setProcesando] = useState(false);
    // Shift+click para seleccionar un rango entero de una vez: tachar un padrón
    // largo de 80 filas de a uno no es viable.
    const ultimoMarcado = useRef<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importando, setImportando] = useState(false);
    const [pendientes, setPendientes] = useState<FilaImportada[] | null>(null);
    const [aCrearSeleccionadas, setACrearSeleccionadas] = useState<Set<string>>(new Set());

    const cargar = useCallback(async () => {
        setLoading(true);
        const [{ data: conv }, { data: asis }] = await Promise.all([
            supabase
                .from('capacitacion_personas')
                .select('persona_id, personas (id, dni, nombre, apellido, rol, institucion)')
                .eq('capacitacion_id', capacitacion.id),
            supabase
                .from('asistencias')
                .select('persona_id')
                .eq('capacitacion_id', capacitacion.id),
        ]);

        const lista = ((conv || []) as any[])
            .filter(r => r.personas)
            .map(r => r.personas as PersonaRow)
            .sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`));

        setConvocados(lista);
        setAsistentesIds(new Set((asis || []).map((a: any) => a.persona_id)));
        setSeleccion(new Set());
        ultimoMarcado.current = null;
        setLoading(false);
    }, [capacitacion.id]);

    useEffect(() => {
        cargar();
    }, [cargar]);

    useEffect(() => {
        if (!search.trim()) {
            setResultados([]);
            return;
        }
        const t = setTimeout(() => buscarPersonas(search), 350);
        return () => clearTimeout(t);
    }, [search]);

    async function buscarPersonas(texto: string) {
        setBuscando(true);
        const q = texto.trim();
        const soloDigitos = q.replace(/\D/g, '');

        let builder = supabase
            .from('personas')
            .select('id, dni, nombre, apellido, rol, institucion')
            .order('apellido', { ascending: true })
            .limit(25);

        if (soloDigitos.length >= 7 && soloDigitos.length <= 8) {
            builder = builder.or(
                `dni.eq.${soloDigitos},nombre.ilike.%${q}%,apellido.ilike.%${q}%,rol.ilike.%${q}%`
            ) as any;
        } else {
            builder = builder.or(
                `dni.ilike.%${q}%,nombre.ilike.%${q}%,apellido.ilike.%${q}%,rol.ilike.%${q}%`
            ) as any;
        }

        const { data } = await builder;
        setResultados((data || []) as PersonaRow[]);
        setBuscando(false);
    }

    async function agregarConvocados(personas: PersonaRow[]) {
        if (personas.length === 0) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('capacitacion_personas')
                .upsert(
                    personas.map(p => ({ persona_id: p.id, capacitacion_id: capacitacion.id })),
                    { onConflict: 'persona_id,capacitacion_id' }
                );
            if (error) throw error;
            showToast(`${personas.length} ${personas.length === 1 ? 'persona agregada' : 'personas agregadas'} al padrón`, 'success');
            setSearch('');
            setResultados([]);
            await cargar();
            onChange();
        } catch (err: any) {
            showToast('Error al guardar: ' + (err?.message || 'desconocido'), 'error');
        } finally {
            setSaving(false);
        }
    }

    async function quitarConvocado(personaId: string) {
        const { data: row } = await supabase
            .from('capacitacion_personas')
            .select('id')
            .eq('capacitacion_id', capacitacion.id)
            .eq('persona_id', personaId)
            .maybeSingle();

        if (!row) return;

        const { error } = await supabase
            .from('capacitacion_personas')
            .delete()
            .eq('id', (row as any).id);

        if (error) {
            showToast('No se pudo quitar del padrón', 'error');
            return;
        }
        await cargar();
        onChange();
    }

    async function toggleAsistencia(personaId: string) {
        // Se relee del servidor en vez de confiar en el estado local: la tabla
        // asistencias no tiene UNIQUE y un insert a ciegas dejaria duplicados.
        const { data: row } = await supabase
            .from('asistencias')
            .select('id')
            .eq('capacitacion_id', capacitacion.id)
            .eq('persona_id', personaId)
            .limit(1);

        const existe = ((row || []) as any[])[0];

        if (existe) {
            const { error } = await supabase.from('asistencias').delete().eq('id', existe.id);
            if (error) { showToast('No se pudo quitar la asistencia', 'error'); return; }
        } else {
            const { error } = await supabase
                .from('asistencias')
                .insert({ persona_id: personaId, capacitacion_id: capacitacion.id });
            if (error) { showToast('No se pudo registrar la asistencia', 'error'); return; }
        }

        setAsistentesIds(prev => {
            const next = new Set(prev);
            if (existe) next.delete(personaId);
            else next.add(personaId);
            return next;
        });
        onChange();
    }

    function toggleSeleccion(id: string, conShift: boolean) {
        setSeleccion(prev => {
            const next = new Set(prev);
            if (!conShift || !ultimoMarcado.current) {
                if (next.has(id)) next.delete(id);
                else next.add(id);
                ultimoMarcado.current = id;
                return next;
            }

            const desde = listaFiltrada.findIndex(p => p.id === ultimoMarcado.current);
            const hasta = listaFiltrada.findIndex(p => p.id === id);
            if (desde === -1 || hasta === -1) return prev;

            const [ini, fin] = desde < hasta ? [desde, hasta] : [hasta, desde];
            const quitar = next.has(id);
            for (let i = ini; i <= fin; i++) {
                if (quitar) next.delete(listaFiltrada[i].id);
                else next.add(listaFiltrada[i].id);
            }
            ultimoMarcado.current = id;
            return next;
        });
    }

    function toggleSeleccionTodos() {
        const visibles = listaFiltrada.map(p => p.id);
        const todasMarcadas = visibles.every(id => seleccion.has(id));
        setSeleccion(prev => {
            const next = new Set(prev);
            visibles.forEach(id => {
                if (todasMarcadas) next.delete(id);
                else next.add(id);
            });
            return next;
        });
    }

    // La tabla asistencias no tiene restriccion UNIQUE, asi que insertar a ciegas
    // generaria duplicados si el estado local quedara desactualizado. Se consulta
    // el servidor y solo se insertan los pares que de verdad faltan.
    async function marcarSeleccion(asistieron: boolean) {
        const ids = [...seleccion];
        if (ids.length === 0) return;
        setProcesando(true);
        try {
            const { data: existentes, error: errLectura } = await supabase
                .from('asistencias')
                .select('id, persona_id')
                .eq('capacitacion_id', capacitacion.id)
                .in('persona_id', ids);

            if (errLectura) throw errLectura;
            const yaRegistradas = new Set(((existentes || []) as any[]).map(r => r.persona_id));

            if (asistieron) {
                const aAgregar = ids.filter(id => !yaRegistradas.has(id));
                const omitidas = ids.length - aAgregar.length;

                if (aAgregar.length > 0) {
                    const { error } = await supabase.from('asistencias').insert(
                        aAgregar.map(persona_id => ({ persona_id, capacitacion_id: capacitacion.id }))
                    );
                    if (error) throw error;
                }
                setAsistentesIds(prev => {
                    const next = new Set(prev);
                    ids.forEach(id => next.add(id));
                    return next;
                });
                showToast(
                    `${aAgregar.length} ${aAgregar.length === 1 ? 'asistencia registrada' : 'asistencias registradas'}` +
                    (omitidas > 0 ? ` (${omitidas} ya estaban)` : ''),
                    omitidas > 0 ? 'info' : 'success'
                );
            } else {
                const aBorrar = ((existentes || []) as any[]).map(r => r.id);
                if (aBorrar.length > 0) {
                    const { error } = await supabase.from('asistencias').delete().in('id', aBorrar);
                    if (error) throw error;
                }
                setAsistentesIds(prev => {
                    const next = new Set(prev);
                    ids.forEach(id => next.delete(id));
                    return next;
                });
                showToast(`${aBorrar.length} ${aBorrar.length === 1 ? 'asistencia dada de baja' : 'asistencias dadas de baja'}`, 'success');
            }

            setSeleccion(new Set());
            onChange();
        } catch (err: any) {
            showToast('Error: ' + (err?.message || 'desconocido'), 'error');
        } finally {
            setProcesando(false);
        }
    }

    async function quitarSeleccion() {
        const ids = [...seleccion];
        if (ids.length === 0) return;
        if (!confirm(`¿Quitar ${ids.length} ${ids.length === 1 ? 'persona' : 'personas'} del padrón? Se les borrará también la asistencia registrada.`)) return;

        setProcesando(true);
        try {
            const { data: rows } = await supabase
                .from('capacitacion_personas')
                .select('id')
                .eq('capacitacion_id', capacitacion.id)
                .in('persona_id', ids);
            const aBorrar = ((rows || []) as any[]).map(r => r.id);

            if (aBorrar.length > 0) {
                const { error } = await supabase.from('capacitacion_personas').delete().in('id', aBorrar);
                if (error) throw error;
            }

            showToast(`${aBorrar.length} ${aBorrar.length === 1 ? 'persona quitada' : 'personas quitadas'} del padrón`, 'success');
            setSeleccion(new Set());
            await cargar();
            onChange();
        } catch (err: any) {
            showToast('Error: ' + (err?.message || 'desconocido'), 'error');
        } finally {
            setProcesando(false);
        }
    }

    async function importarExcel(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportando(true);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const wb = XLSX.read(evt.target?.result, { type: 'array', codepage: 65001 });
                const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

                if (rows.length === 0) throw new Error('El archivo está vacío');

                // Se recorre cada fila una sola vez: un DNI repetido en el mismo
                // archivo no debe generar dos altas.
                const porFila = new Map<string, FilaImportada>();
                rows.forEach((item: any) => {
                    const norm: Record<string, any> = {};
                    Object.entries(item).forEach(([k, v]) => {
                        norm[k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')] = v;
                    });
                    const get = (...candidatos: string[]) => {
                        for (const c of candidatos) {
                            if (norm[c] != null && norm[c] !== '') return norm[c];
                        }
                        for (const c of candidatos) {
                            if (c.length < 3) continue;
                            const key = Object.keys(norm).find(k => k.includes(c));
                            if (key && norm[key] != null && norm[key] !== '') return norm[key];
                        }
                        return '';
                    };

                    const dni = String(get('dni', 'documento', 'nrodocumento', 'numdocumento', 'documentodeidentidad', 'ndocumento', 'cuil', 'legajo'))
                        .replace(/\D/g, '')
                        .trim();
                    if (dni.length < 7) return;

                    // La primera fila gana: si el DNI viene repetido se conserva
                    // la que tenga mas datos cargados.
                    const previa = porFila.get(dni);
                    const fila: FilaImportada = {
                        dni,
                        nombre: String(get('nombre', 'nombreyapellido', 'nombres')).trim(),
                        apellido: String(get('apellido', 'apellidos')).trim(),
                        rolCrudo: String(get('rol', 'categoria', 'cargo', 'funcion', 'puesto', 'jerarquia', 'condicion')).trim(),
                        institucion: String(get('institucion', 'organizacion', 'escuela', 'colegio', 'entidad')).trim(),
                    };
                    if (!previa || puntuar(fila) > puntuar(previa)) porFila.set(dni, fila);
                });

                const filas = [...porFila.values()];
                if (filas.length === 0) throw new Error('No se encontró ninguna columna con DNI');

                const { data: todas, error } = await supabase
                    .from('personas')
                    .select('id, dni, nombre, apellido, rol, institucion');
                if (error) throw error;

                const porDni = new Map<string, PersonaRow>();
                (todas || []).forEach((p: any) => porDni.set(String(p.dni), p as PersonaRow));

                const existentes: PersonaRow[] = [];
                const aCrear: FilaImportada[] = [];
                filas.forEach(f => {
                    const p = porDni.get(f.dni);
                    if (p) existentes.push(p);
                    else aCrear.push(f);
                });

                // Las que ya existen entran al padrón al instante.
                if (existentes.length > 0) {
                    const { error: insErr } = await supabase
                        .from('capacitacion_personas')
                        .upsert(
                            existentes.map(p => ({ persona_id: p.id, capacitacion_id: capacitacion.id })),
                            { onConflict: 'persona_id,capacitacion_id' }
                        );
                    if (insErr) throw insErr;
                }

                // Las nuevas requieren confirmación: crear personas es una
                // escritura en la base maestra, no solo en el padrón.
                if (aCrear.length > 0) {
                    setPendientes(aCrear);
                    setACrearSeleccionadas(new Set(aCrear.map(f => f.dni)));
                }

                showToast(
                    `${existentes.length} ${existentes.length === 1 ? 'persona agregada' : 'personas agregadas'} al padrón` +
                    (aCrear.length > 0 ? ` · ${aCrear.length} pendientes de crear` : ''),
                    aCrear.length > 0 ? 'info' : 'success'
                );
                await cargar();
                onChange();
            } catch (err: any) {
                showToast('Error al procesar el archivo: ' + err.message, 'error');
            } finally {
                setImportando(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Crea las personas confirmadas y las suma al padrón. El upsert por dni
    // evita duplicar aunque otra persona las haya cargado en paralelo.
    async function confirmarCrear() {
        const aCrear = (pendientes || []).filter(f => aCrearSeleccionadas.has(f.dni));
        if (aCrear.length === 0) {
            setPendientes(null);
            return;
        }
        setProcesando(true);
        try {
            // Postgres rechaza el lote completo (500) si el mismo dni aparece
            // dos veces, asi que se deduplica aca y no solo al leer el archivo.
            const unicos = [...new Map(aCrear.map(f => [f.dni, f])).values()];

            const { data, error } = await supabase.from('personas').upsert(
                unicos.map(f => ({
                    dni: f.dni,
                    nombre: f.nombre || `DNI ${f.dni}`,
                    apellido: f.apellido,
                    rol: mapearRol(f.rolCrudo),
                    institucion: f.institucion,
                })),
                { onConflict: 'dni' }
            );
            if (error) throw error;

            const creadas = (data || []) as any[];
            if (creadas.length > 0) {
                // Misma proteccion para el padron: un solo lote, sin pares repetidos.
                const pares = [...new Map(creadas.map(p => [p.id, p.id])).keys()];
                const { error: insErr } = await supabase
                    .from('capacitacion_personas')
                    .upsert(
                        pares.map(id => ({ persona_id: id, capacitacion_id: capacitacion.id })),
                        { onConflict: 'persona_id,capacitacion_id' }
                    );
                if (insErr) throw insErr;
            }

            showToast(`${creadas.length} ${creadas.length === 1 ? 'persona creada' : 'personas creadas'} y agregadas al padrón`, 'success');
            setPendientes(null);
            await cargar();
            onChange();
        } catch (err: any) {
            showToast('Error al crear las personas: ' + (err?.message || 'desconocido'), 'error');
        } finally {
            setProcesando(false);
        }
    }

    const yaConvocados = useMemo(() => new Set(convocados.map(c => c.id)), [convocados]);

    const sugerencias = useMemo(
        () => resultados.filter(r => !yaConvocados.has(r.id)),
        [resultados, yaConvocados]
    );

    const listaFiltrada = useMemo(() => {
        const s = filtroLista.toLowerCase();
        return convocados.filter(c => {
            if (filtro === 'asistieron' && !asistentesIds.has(c.id)) return false;
            if (filtro === 'ausentes' && asistentesIds.has(c.id)) return false;
            if (!s) return true;
            return (
                c.nombre.toLowerCase().includes(s) ||
                c.apellido.toLowerCase().includes(s) ||
                c.dni.includes(s)
            );
        });
    }, [convocados, filtro, filtroLista, asistentesIds]);

    const conteo = useMemo(() => ({
        convocados: convocados.length,
        asistieron: convocados.filter(c => asistentesIds.has(c.id)).length,
        ausentes: convocados.filter(c => !asistentesIds.has(c.id)).length,
    }), [convocados, asistentesIds]);

    const porcentaje = conteo.convocados > 0
        ? Math.round((conteo.asistieron / conteo.convocados) * 100)
        : 0;

    const seleccionados = seleccion.size;
    const selTodosMarcados = listaFiltrada.length > 0 && listaFiltrada.every(p => seleccion.has(p.id));
    const selAlgunosMarcados = listaFiltrada.some(p => seleccion.has(p.id));
    const selParaAsistir = [...seleccion].filter(id => !asistentesIds.has(id)).length;
    const selParaBajar = [...seleccion].filter(id => asistentesIds.has(id)).length;

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-6 overflow-y-auto">
            <div className="card w-full max-w-5xl shadow-2xl animate-fade-in my-4">
                {/* Header */}
                <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 sticky top-0 z-10">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest text-[10px]">
                            <Users size={14} />
                            Padrón de Convocados
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm mt-1 truncate">
                            {capacitacion.nombre}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                            Cargá a quiénes estaba dirigida la capacitación para que el % de asistencia sea real.
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-1 hidden sm:block">
                            Tildá varias personas para marcar o quitar en lote. Con <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-mono">Shift</kbd> seleccionás un rango completo.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                        aria-label="Cerrar"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-6 bg-slate-50/50 dark:bg-slate-950/30">
                    {/* Resumen */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <StatBox label="Convocados" value={conteo.convocados} color="text-slate-900 dark:text-white" />
                        <StatBox label="Asistieron" value={conteo.asistieron} color="text-emerald-600 dark:text-emerald-400" />
                        <StatBox label="Ausentes" value={conteo.ausentes} color="text-amber-600 dark:text-amber-400" />
                        <div className="card p-4 shadow-sm">
                            <p className={`text-2xl font-black ${conteo.convocados === 0 ? 'text-slate-300 dark:text-slate-600' : 'text-[var(--primary)]'}`}>
                                {conteo.convocados === 0 ? '--' : `${porcentaje}%`}
                            </p>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">Asistencia Real</p>
                        </div>
                    </div>

                    {/* Carga manual */}
                    <div className="card p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <UserPlus size={14} className="text-[var(--primary)]" />
                                Agregar por búsqueda
                            </h4>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importando}
                                className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-9 px-4 flex items-center justify-center gap-2 border-none shadow-lg shadow-emerald-600/20 active:scale-[0.97] whitespace-nowrap"
                            >
                                {importando ? <Loader2 className="animate-spin" size={14} /> : <FileSpreadsheet size={14} />}
                                <span className="text-[10px] font-black uppercase tracking-widest">Importar Excel</span>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={importarExcel}
                                accept=".xlsx, .xls, .csv"
                                className="hidden"
                            />
                        </div>

                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por DNI, nombre o rol..."
                                className="input-field py-2 pl-9 text-xs"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            {buscando && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--primary)]" />}
                        </div>

                        {sugerencias.length > 0 && (
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                                {sugerencias.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => agregarConvocados([p])}
                                        disabled={saving}
                                        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 disabled:opacity-50"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white uppercase truncate">
                                                {p.nombre} {p.apellido}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-medium">
                                                DNI {p.dni} · {p.rol}
                                            </p>
                                        </div>
                                        <UserPlus size={14} className="text-[var(--primary)] shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}

                        {search.trim() && !buscando && sugerencias.length === 0 && (
                            <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                                <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                                    {resultados.length > 0
                                        ? 'Todos los resultados ya están en el padrón.'
                                        : 'Sin resultados. Si la persona no está en la base, cargala primero en "Cargar Persona".'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Listado del padrón */}
                    <div className="card overflow-hidden shadow-sm">
                        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight text-xs">
                                <UserCheck size={16} className="text-[var(--primary)]" />
                                Padrón ({conteo.convocados})
                            </h4>
                            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    {(['todos', 'asistieron', 'ausentes'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setFiltro(f)}
                                            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
                                                filtro === f
                                                    ? 'bg-[var(--primary)] text-white'
                                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {f === 'todos' ? 'Todos' : f === 'asistieron' ? 'Asistieron' : 'Ausentes'}
                                        </button>
                                    ))}
                                </div>
                                <div className="relative">
                                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Filtrar..."
                                        className="input-field py-1.5 pl-8 text-xs sm:w-44"
                                        value={filtroLista}
                                        onChange={(e) => setFiltroLista(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Acciones masivas sobre la seleccion */}
                        {seleccionados > 0 && (
                            <div className="p-3 bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10 border-b border-[var(--primary)]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in-pure">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)]">
                                    {seleccionados} {seleccionados === 1 ? 'persona seleccionada' : 'personas seleccionadas'}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {selParaAsistir > 0 && (
                                        <button
                                            onClick={() => marcarSeleccion(true)}
                                            disabled={procesando}
                                            className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-8 px-3 flex items-center gap-1.5 border-none shadow-md active:scale-95 disabled:opacity-50"
                                        >
                                            {procesando ? <Loader2 className="animate-spin" size={12} /> : <CheckCircle2 size={12} />}
                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                Marcar asistencia ({selParaAsistir})
                                            </span>
                                        </button>
                                    )}
                                    {selParaBajar > 0 && (
                                        <button
                                            onClick={() => marcarSeleccion(false)}
                                            disabled={procesando}
                                            className="btn-primary bg-amber-600 hover:bg-amber-700 h-8 px-3 flex items-center gap-1.5 border-none shadow-md active:scale-95 disabled:opacity-50"
                                        >
                                            {procesando ? <Loader2 className="animate-spin" size={12} /> : <UserX size={12} />}
                                            <span className="text-[9px] font-black uppercase tracking-widest">
                                                Dar de baja ({selParaBajar})
                                            </span>
                                        </button>
                                    )}
                                    <button
                                        onClick={quitarSeleccion}
                                        disabled={procesando}
                                        className="btn-primary bg-red-600 hover:bg-red-700 h-8 px-3 flex items-center gap-1.5 border-none shadow-md active:scale-95 disabled:opacity-50"
                                    >
                                        {procesando ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />}
                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                            Quitar del padrón ({seleccionados})
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setSeleccion(new Set())}
                                        disabled={procesando}
                                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                        title="Limpiar selección"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-16">
                                <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando padrón</span>
                            </div>
                        ) : listaFiltrada.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400 px-6 text-center">
                                <Users size={40} className="opacity-10 mb-3" />
                                <p className="font-medium text-xs">
                                    {convocados.length === 0
                                        ? 'Todavía no cargaste el padrón de convocados para esta capacitación.'
                                        : 'No hay resultados para este filtro.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950/95 z-[1]">
                                        <tr>
                                            <th className="px-3 py-3 w-10">
                                                <button
                                                    onClick={toggleSeleccionTodos}
                                                    title="Seleccionar todo lo visible"
                                                    className={`inline-flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
                                                        selTodosMarcados
                                                            ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                                            : selAlgunosMarcados
                                                                ? 'border-[var(--primary)] text-[var(--primary)]'
                                                                : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-[var(--primary)]'
                                                    }`}
                                                >
                                                    {selTodosMarcados ? <Check size={13} strokeWidth={3} /> : selAlgunosMarcados ? <Minus size={13} strokeWidth={3} /> : null}
                                                </button>
                                            </th>
                                            <th className="px-3 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Participante</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Asistió</th>
                                            <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Quitar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {listaFiltrada.map(p => {
                                            const asiste = asistentesIds.has(p.id);
                                            const marcado = seleccion.has(p.id);
                                            return (
                                                <tr
                                                    key={p.id}
                                                    className={`transition-colors cursor-pointer ${
                                                        marcado
                                                            ? 'bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10'
                                                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                                    }`}
                                                    onClick={(e) => toggleSeleccion(p.id, e.shiftKey)}
                                                >
                                                    <td className="px-3 py-3">
                                                        <span
                                                            className={`inline-flex items-center justify-center w-5 h-5 rounded border-2 transition-all ${
                                                                marcado
                                                                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                                                    : 'border-slate-300 dark:border-slate-600 text-transparent'
                                                            }`}
                                                        >
                                                            <Check size={13} strokeWidth={3} />
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <p className="font-bold text-slate-900 dark:text-white uppercase text-xs leading-tight">
                                                            {p.nombre} {p.apellido}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                                                            DNI {p.dni} · {p.rol}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleAsistencia(p.id); }}
                                                            title={asiste ? 'Marcar como ausente' : 'Marcar como presente'}
                                                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all active:scale-90 ${
                                                                asiste
                                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:text-amber-600'
                                                            }`}
                                                        >
                                                            {asiste ? <CheckCircle2 size={16} /> : <UserX size={16} />}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); quitarConvocado(p.id); }}
                                                            title="Quitar del padrón"
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 dark:text-slate-600 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-all active:scale-90"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-primary bg-slate-800 hover:bg-slate-900 h-10 px-6 border-none shadow-lg shadow-slate-900/20 active:scale-[0.97]"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">Listo</span>
                    </button>
                </div>
            </div>

            {/* Confirmacion de altas: crear personas escribe en la base maestra,
                asi que se muestra exactamente que se va a generar antes de hacerlo. */}
            {pendientes && (
                <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-pure">
                    <div className="card w-full max-w-2xl shadow-2xl">
                        <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2 text-amber-600 font-bold uppercase tracking-widest text-[10px]">
                                    <UserPlus size={14} />
                                    Personas Nuevas
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-tight text-sm mt-1">
                                    {aCrearSeleccionadas.size} de {pendientes.length} se van a crear
                                </h3>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Estos DNI no están en la base. Al crearlas quedan disponibles en todo el sistema para certificados y mailing.
                                </p>
                            </div>
                            <button
                                onClick={() => setPendientes(null)}
                                disabled={procesando}
                                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 disabled:opacity-40"
                                aria-label="Cerrar"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <button
                                    onClick={() => setACrearSeleccionadas(
                                        aCrearSeleccionadas.size === pendientes.length
                                            ? new Set()
                                            : new Set(pendientes.map(f => f.dni))
                                    )}
                                    className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] hover:underline"
                                >
                                    {aCrearSeleccionadas.size === pendientes.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                                </button>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Deseleccioná las que quieras omitir.
                                </p>
                            </div>

                            <div className="card overflow-hidden max-h-72 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950/95 z-[1]">
                                        <tr>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">DNI</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Nombre</th>
                                            <th className="px-3 py-2.5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Rol</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {pendientes.map(f => {
                                            const marcado = aCrearSeleccionadas.has(f.dni);
                                            return (
                                                <tr
                                                    key={f.dni}
                                                    onClick={() => setACrearSeleccionadas(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(f.dni)) next.delete(f.dni);
                                                        else next.add(f.dni);
                                                        return next;
                                                    })}
                                                    className={`cursor-pointer transition-colors ${
                                                        marcado
                                                            ? 'bg-[var(--primary)]/5 dark:bg-[var(--primary)]/10'
                                                            : 'opacity-50 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                                                    }`}
                                                >
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`inline-flex items-center justify-center w-4 h-4 rounded border-2 shrink-0 transition-all ${
                                                                marcado
                                                                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                                                    : 'border-slate-300 dark:border-slate-600 text-transparent'
                                                            }`}>
                                                                <Check size={11} strokeWidth={3} />
                                                            </span>
                                                            <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{f.dni}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <p className="font-bold text-slate-900 dark:text-white uppercase text-xs leading-tight">
                                                            {f.nombre} {f.apellido}
                                                        </p>
                                                        {f.institucion && (
                                                            <p className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">{f.institucion}</p>
                                                        )}
                                                        {!f.nombre && (
                                                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">Sin nombre en el archivo</p>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span className="px-2 py-1 text-[9px] font-black uppercase rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                                            {mapearRol(f.rolCrudo)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between gap-3">
                            <p className="text-[10px] text-slate-400 font-medium self-center">
                                Si tenés el nombre mal, creá la persona desde <strong>Cargar Persona</strong> y volvé a importar.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPendientes(null)}
                                    disabled={procesando}
                                    className="btn-primary bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 px-5 border-none shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">Cancelar</span>
                                </button>
                                <button
                                    onClick={confirmarCrear}
                                    disabled={procesando || aCrearSeleccionadas.size === 0}
                                    className="btn-primary bg-emerald-600 hover:bg-emerald-700 h-10 px-5 flex items-center justify-center gap-2 border-none shadow-lg shadow-emerald-600/20 active:scale-[0.97] disabled:opacity-50"
                                >
                                    {procesando ? <Loader2 className="animate-spin" size={14} /> : <UserPlus size={14} />}
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        Crear {aCrearSeleccionadas.size}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBox({ label, value, color }: { label: string, value: number, color: string }) {
    return (
        <div className="card p-4 shadow-sm">
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-1">{label}</p>
        </div>
    );
}
