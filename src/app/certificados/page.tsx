'use client';

import { useState } from 'react';
import { publicSupabase, type Certificado } from '@/lib/supabase';
import { Search, Loader2, Download, FileText, AlertCircle, Home } from 'lucide-react';
import Link from 'next/link';

export default function DescargarCertificadosPage() {
    const [dni, setDni] = useState('');
    const [loading, setLoading] = useState(false);
    const [certificados, setCertificados] = useState<Certificado[]>([]);
    const [searched, setSearched] = useState(false);

    async function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        if (dni.length < 7 || dni.length > 8) return;

        setLoading(true);
        setSearched(true);
        try {
            const { data, error } = await publicSupabase
                .from('certificados')
                .select('*')
                .eq('dni', dni.trim())
                .order('fecha_subida', { ascending: false });

            if (error) throw error;
            setCertificados(data || []);
        } catch (error) {
            console.error('Error searching certificates:', error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            {/* Back Home Button - Top Right */}
            <Link
                href="/"
                className="fixed top-6 left-6 z-50 group"
                title="Volver al Inicio"
            >
                <div className="relative">
                    <div className="relative w-12 h-12 bg-white dark:bg-slate-900 rounded-full shadow-lg border border-slate-200 dark:border-slate-800 flex items-center justify-center transition-all group-hover:scale-110 group-hover:shadow-xl group-hover:border-[var(--primary)]">
                        <Home size={20} className="text-slate-600 dark:text-slate-400 group-hover:text-[var(--primary)] transition-colors" />
                    </div>
                </div>
            </Link>

            <div className="w-full max-w-2xl animate-fade-in space-y-8">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-full max-w-[240px] h-20 rounded-2xl bg-transparent overflow-hidden mb-8 animate-float p-2">
                        <img src="/logo.png" width={240} height={80} alt="Logo MCSF" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Certificados Digitales</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-3 font-semibold uppercase tracking-widest text-[10px]">Red Municipal de Formación Docente</p>
                </div>

                <div className="card p-8 shadow-2xl border-t-4 border-[var(--primary)] bg-white dark:bg-slate-900">
                    <form onSubmit={handleSearch} className="space-y-6">
                        <div>
                            <label className="block text-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-4">
                                Ingrese su DNI para acceder a sus certificados
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={8}
                                required
                                placeholder="Ej: 30123456"
                                className="input-field text-center h-16 text-2xl font-black tracking-[0.2em]"
                                value={dni}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '');
                                    if (value.length <= 8) setDni(value);
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary h-14 flex items-center justify-center gap-2 text-lg shadow-lg shadow-[var(--primary)]/20 uppercase font-black tracking-widest"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'INGRESAR'}
                        </button>
                    </form>

                    {searched && !loading && (
                        <div className="mt-10 space-y-4 animate-fade-in">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Resultados para DNI {dni}</h3>
                            
                            {certificados.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                    <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="font-bold text-slate-600 dark:text-slate-400">No se encontraron certificados cargados para este DNI.</p>
                                    <p className="text-xs text-slate-400 mt-1">Si cree que se trata de un error, comuníquese con el administrador.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {certificados.map((cert) => (
                                        <div key={cert.id} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-[var(--primary)] transition-all group shadow-sm hover:shadow-md">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white uppercase text-xs leading-none mb-1">Certificado de Capacitación</p>
                                                    <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px] sm:max-w-[300px]">{cert.nombre_archivo}</p>
                                                </div>
                                            </div>
                                            <a
                                                href={cert.archivo_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-primary w-12 h-12 rounded-full p-0 flex items-center justify-center shadow-lg shadow-[var(--primary)]/10"
                                                title="Descargar Certificado"
                                            >
                                                <Download size={20} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium italic">
                        Los certificados están disponibles solo en formato PDF. Asegúrese de tener un lector instalado.
                    </p>
                </div>
            </div>
        </main>
    );
}
