'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, Loader2, CheckCircle2, AlertCircle, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function CargarPersonaPage() {
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState({
        dni: '',
        nombre: '',
        apellido: '',
        correo: '',
        celular: '',
        institucion: '',
        rol: 'docente',
        eje: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.dni.length < 7 || formData.dni.length > 8) {
            setMessage({ type: 'error', text: 'Por favor, ingresá un formato de DNI correcto.' });
            return;
        }

        setLoading(true);
        setMessage(null);

        const { error } = await supabase.from('personas').insert([formData]);

        if (error) {
            if (error.code === '23505') {
                setMessage({ type: 'error', text: 'El DNI ya se encuentra registrado.' });
            } else {
                setMessage({ type: 'error', text: 'Hubo un error al guardar la persona.' });
            }
        } else {
            setMessage({ type: 'success', text: 'Persona registrada correctamente.' });
            setFormData({
                dni: '', nombre: '', apellido: '', correo: '', celular: '', institucion: '', rol: 'docente', eje: ''
            });
        }
        setLoading(false);
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    throw new Error('El archivo está vacío');
                }

                // Normalizar datos (mapear columnas comunes ignorando mayúsculas, espacios y acentos)
                const personasToInsert = data.map((item: any) => {
                    const normalized: Record<string, unknown> = {};
                    Object.entries(item).forEach(([key, value]) => {
                        const k = key
                            .toString()
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '') // quitar acentos
                            .replace(/\s+/g, ''); // quitar espacios
                        normalized[k] = value;
                    });

                    const get = (...candidates: string[]) => {
                        for (const c of candidates) {
                            if (normalized[c] != null && normalized[c] !== '') return normalized[c];
                        }
                        return '';
                    };

                    return {
                        dni: String(get('dni', 'documento')).trim(),
                        nombre: String(get('nombre')).trim(),
                        apellido: String(get('apellido')).trim(),
                        correo: String(get('correo', 'email', 'mail', 'correoelectronico')).trim(),
                        celular: String(get('celular', 'telefono', 'whatsapp')).trim(),
                        institucion: String(
                            get(
                                'institucion',
                                'organizacion',
                                'institucionalaquepertenece'
                            )
                        ).trim(),
                        rol: String(
                            get('rol', 'categoria', 'cargo', 'funcion') || 'docente'
                        )
                            .toLowerCase()
                            .trim(),
                        eje: String(get('eje')).trim()
                    };
                }).filter(p => p.dni && p.nombre);

                if (personasToInsert.length === 0) {
                    throw new Error('No se encontraron datos válidos (faltan DNI o Nombre)');
                }

                const { error, data: insertedData } = await supabase.from('personas').upsert(personasToInsert, {
                    onConflict: 'dni'
                });

                if (error) throw error;

                setMessage({
                    type: 'success',
                    text: `Se importaron/actualizaron ${personasToInsert.length} personas con éxito.`
                });
            } catch (err: any) {
                console.error(err);
                setMessage({ type: 'error', text: 'Error al procesar el archivo: ' + err.message });
            } finally {
                setImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-800 text-white rounded-xl">
                        <UserPlus size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Gestión de Personas</h2>
                        <p className="text-slate-500">Registrá participantes o importá una lista completa.</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        accept=".xlsx, .xls, .csv"
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all disabled:opacity-50"
                    >
                        {importing ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                        Importar Excel / CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="card p-8">
                        <h3 className="text-lg font-bold mb-6">Registro Individual</h3>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">DNI *</label>
                                    <input
                                        name="dni"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={8}
                                        required
                                        className="input-field"
                                        value={formData.dni}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            if (value.length <= 8) {
                                                handleChange({ ...e, target: { ...e.target, name: 'dni', value } } as any);
                                            }
                                        }}
                                        placeholder="Sin puntos"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Rol *</label>
                                    <select
                                        name="rol" className="input-field"
                                        value={formData.rol} onChange={handleChange}
                                    >
                                        <option value="docente">Docente</option>
                                        <option value="directivo">Directivo</option>
                                        <option value="estudiante avanzado">Estudiante Avanzado</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">¿En cuál de los ejes desea inscribirse? *</label>
                                    <select
                                        name="eje" className="input-field"
                                        value={formData.eje} onChange={handleChange}
                                    >
                                        <option value="">Sin asignar</option>
                                        <option value="Educación Ambiental">Educación Ambiental</option>
                                        <option value="Educación Digital Integral">Educación Digital Integral</option>
                                        <option value="Infancias Diversas">Infancias Diversas</option>
                                        <option value="Alfabetización Inicial">Alfabetización Inicial</option>
                                        <option value="Lenguajes Artísticos Integrales">Lenguajes Artísticos Integrales</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Nombre *</label>
                                    <input
                                        name="nombre" required className="input-field"
                                        value={formData.nombre} onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Apellido *</label>
                                    <input
                                        name="apellido" required className="input-field"
                                        value={formData.apellido} onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold">Correo Electrónico</label>
                                        <input
                                            name="correo" type="email" className="input-field"
                                            value={formData.correo} onChange={handleChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold">Número de contacto (WhatsApp) *</label>
                                        <input
                                            name="celular" required className="input-field"
                                            value={formData.celular} onChange={handleChange}
                                            placeholder="Ej: 3624123456"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Institución / Organización</label>
                                    <input
                                        name="institucion" className="input-field"
                                        value={formData.institucion} onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary h-12 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : 'Guardar Persona'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="card p-6 bg-slate-50 dark:bg-slate-900 border-dashed border-2">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm text-emerald-500">
                                <Upload size={32} />
                            </div>
                            <div>
                                <h4 className="font-bold">Ayuda de Importación</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    El sistema detecta automáticamente columnas como:
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {['dni', 'nombre', 'apellido', 'institucion', 'rol', 'categoria', 'celular', 'eje', 'WhatsApp', 'institución a la que pertenece'].map(tag => (
                                    <span key={tag} className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-[10px] font-mono border border-slate-200 dark:border-slate-700">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400">
                                * Se ignoran mayúsculas y acentos en los títulos.
                            </p>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${message.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30'
                            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/30'
                            }`}>
                            {message.type === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
                            <span className="text-sm font-medium leading-tight">{message.text}</span>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}

