'use client';

import { useState, useEffect } from 'react';
import { supabase, type Certificado } from '@/lib/supabase';
import { Upload, FileText, Trash2, Search, Loader2, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function CertificadosAdminPage() {
    const { showToast } = useToast();
    const [dni, setDni] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [certificados, setCertificados] = useState<Certificado[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCertificados();
    }, []);

    async function fetchCertificados() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('certificados')
                .select('*')
                .order('fecha_subida', { ascending: false });

            if (error) throw error;
            if (data) setCertificados(data);
        } catch (error: any) {
            console.error('Error fetching certificates:', error);
            showToast('Error al cargar la lista de certificados', 'error');
        } finally {
            setLoading(false);
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== 'application/pdf') {
                showToast('Solo se permiten archivos PDF', 'error');
                return;
            }
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
                showToast('El archivo es demasiado grande (máximo 5MB)', 'error');
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dni || !file) {
            showToast('Por favor, ingresa el DNI y selecciona un archivo', 'info');
            return;
        }

        setUploading(true);
        try {
            // 1. Subir archivo a Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${dni}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
            const filePath = `certs/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('certificados')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('certificados')
                .getPublicUrl(filePath);

            // 3. Guardar en la base de datos
            const { error: dbError } = await supabase
                .from('certificados')
                .insert([
                    {
                        dni: dni,
                        archivo_url: publicUrl,
                        nombre_archivo: file.name,
                        fecha_subida: new Date().toISOString()
                    }
                ]);

            if (dbError) throw dbError;

            showToast('Certificado cargado con éxito', 'success');
            setDni('');
            setFile(null);
            fetchCertificados();
        } catch (error: any) {
            console.error('Error uploading certificate:', error);
            showToast(error.message || 'Error al cargar el certificado', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (cert: Certificado) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este certificado?')) return;

        try {
            // Extraer el nombre del archivo de la URL
            const urlParts = cert.archivo_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const filePath = `certs/${fileName}`;

            // 1. Eliminar de Storage
            const { error: storageError } = await supabase.storage
                .from('certificados')
                .remove([filePath]);

            // Note: ignore storage error if file doesn't exist anymore
            
            // 2. Eliminar de la base de datos
            const { error: dbError } = await supabase
                .from('certificados')
                .delete()
                .eq('id', cert.id);

            if (dbError) throw dbError;

            showToast('Certificado eliminado correctamente', 'success');
            fetchCertificados();
        } catch (error: any) {
            console.error('Error deleting certificate:', error);
            showToast('Error al eliminar el certificado', 'error');
        }
    };

    const filteredCertificados = certificados.filter(c => 
        c.dni.includes(searchTerm) || 
        c.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[var(--primary)] font-bold uppercase tracking-widest text-[10px]">
                        <FileText size={14} />
                        Gestión Documental
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Carga de Certificados</h2>
                    <p className="text-slate-500 font-medium mt-2">Sube y administra los certificados de los participantes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario de Carga */}
                <div className="card p-8 border-none shadow-2xl bg-white dark:bg-slate-900 space-y-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Upload size={20} className="text-[var(--primary)]" />
                        Nuevo Certificado
                    </h3>
                    
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">DNI del Participante</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Ej: 30123456"
                                value={dni}
                                onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Archivo PDF</label>
                            <div className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${file ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-[var(--primary)]'}`}>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-center space-y-2">
                                    {file ? (
                                        <>
                                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                                                <CheckCircle2 size={24} />
                                            </div>
                                            <p className="font-bold text-sm truncate px-4">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Click para cambiar archivo</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto">
                                                <FileText size={24} />
                                            </div>
                                            <p className="font-bold text-sm">Arrastra o selecciona un PDF</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Máximo 5MB</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={uploading}
                            className={`w-full btn-primary h-12 flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 ${uploading ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                            <span className="font-bold uppercase tracking-widest text-sm">
                                {uploading ? 'Subiendo...' : 'Cargar Certificado'}
                            </span>
                        </button>
                    </form>
                </div>

                {/* Listado de Certificados */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="card overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight text-sm">
                                <FileText size={18} className="text-[var(--primary)]" />
                                Certificados Cargados
                            </h3>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por DNI o Archivo..."
                                    className="input-field py-2 pl-9 text-xs w-full sm:w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 size={40} className="animate-spin text-[var(--primary)] mb-4" />
                                <p className="font-bold uppercase tracking-widest text-xs">Cargando base de datos...</p>
                            </div>
                        ) : filteredCertificados.length === 0 ? (
                            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                                <AlertCircle size={40} className="opacity-20 mb-4" />
                                <p className="font-medium">No se encontraron certificados.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950/50">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Participante (DNI)</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Archivo</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fecha Carga</th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                        {filteredCertificados.map((cert) => (
                                            <tr key={cert.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{cert.dni}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <FileText size={16} className="text-red-500" />
                                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                                                            {cert.nombre_archivo}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(cert.fecha_subida).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <a 
                                                            href={cert.archivo_url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-slate-400 hover:text-[var(--primary)] transition-colors"
                                                            title="Ver documento"
                                                        >
                                                            <Download size={18} />
                                                        </a>
                                                        <button
                                                            onClick={() => handleDelete(cert)}
                                                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
