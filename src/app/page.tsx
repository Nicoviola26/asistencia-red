'use client';

import { useState, useEffect } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import { UserCheck, Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegistrationPage() {
  const [dni, setDni] = useState('');
  const [capacitacionId, setCapacitacionId] = useState('');
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      setMessage({
        type: 'error',
        text: 'Error de configuración: Las variables de entorno de Supabase no están configuradas. Por favor, revisa el archivo .env.local'
      });
      return;
    }
    fetchCapacitaciones();
  }, []);

  async function fetchCapacitaciones() {
    const { data, error } = await supabase
      .from('capacitaciones')
      .select('*')
      .eq('activa', true)
      .order('dia', { ascending: false });

    if (data) setCapacitaciones(data);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!dni || !capacitacionId) return;

    setLoading(true);
    setMessage(null);

    try {
      // 1. Buscar persona por DNI
      const { data: persona, error: personaError } = await supabase
        .from('personas')
        .select('id')
        .eq('dni', dni.trim())
        .single();

      if (personaError || !persona) {
        setMessage({ type: 'error', text: 'DNI no registrado en el sistema.' });
        setLoading(false);
        return;
      }

      // 2. Verificar si ya asistió
      const { data: existingAsistencia } = await supabase
        .from('asistencias')
        .select('id')
        .eq('persona_id', persona.id)
        .eq('capacitacion_id', capacitacionId)
        .single();

      if (existingAsistencia) {
        setMessage({ type: 'error', text: 'Esta asistencia ya fue registrada anteriormente.' });
        setLoading(false);
        return;
      }

      // 3. Registrar asistencia
      const { error: insertError } = await supabase
        .from('asistencias')
        .insert({
          persona_id: persona.id,
          capacitacion_id: capacitacionId,
        });

      if (insertError) throw insertError;

      setMessage({ type: 'success', text: '¡Asistencia registrada con éxito!' });
      setDni('');
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Ocurrió un error al registrar la asistencia.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white overflow-hidden mb-4 shadow-xl border-4 border-slate-100 dark:border-slate-800">
            <img src="/logo.png" alt="Antigravity Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Antigravity</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Registro de Asistencia</p>
        </div>

        <div className="card p-8 shadow-2xl border-t-4 border-[var(--primary)]">
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Documento Nacional de Identidad (DNI)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  required
                  placeholder="Ej: 12345678"
                  className="input-field pl-10"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Capacitación
              </label>
              <select
                required
                className="input-field appearance-none"
                value={capacitacionId}
                onChange={(e) => setCapacitacionId(e.target.value)}
              >
                <option value="">Selecciona una opción...</option>
                {capacitaciones.map((cap) => (
                  <option key={cap.id} value={cap.id}>
                    {cap.nombre} - {new Date(cap.dia).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary h-12 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Registrar Asistencia'}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-lg flex items-start gap-3 animate-fade-in ${message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
              }`}>
              {message.type === 'success' ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}
        </div>
      </div>

      <footer className="mt-12 text-center">
        <Link
          href="/admin"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs transition-colors"
        >
          Acceso Administrador
        </Link>
      </footer>
    </main>
  );
}
