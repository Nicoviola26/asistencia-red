'use client';

import { useState, useEffect } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import { Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function RegistrationPage() {
  const [dni, setDni] = useState('');
  const [capacitacionId, setCapacitacionId] = useState('');
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');

  const fetchCapacitaciones = async () => {
    const { data } = await supabase
      .from('capacitaciones')
      .select('*')
      .eq('activa', true)
      .order('dia', { ascending: false });

    if (data) setCapacitaciones(data);
  };

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!dni || !capacitacionId) return;

    if (dni.length < 7 || dni.length > 8) {
      setErrorMessage('Por favor, ingresá un formato de DNI correcto.');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Buscar persona por DNI
      const { data: persona, error: personaError } = await supabase
        .from('personas')
        .select('id, nombre, apellido, correo')
        .eq('dni', dni.trim())
        .single();

      if (personaError || !persona) {
        setErrorMessage('DNI no registrado en el sistema.');
        setShowErrorModal(true);
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
        setErrorMessage('Esta asistencia ya fue registrada anteriormente.');
        setShowErrorModal(true);
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

      setUserName(`${persona.nombre} ${persona.apellido}`);
      setShowModal(true);
      setDni('');

      // 4. Enviar correo si tiene uno registrado
      if (persona.correo) {
        const capacitacion = capacitaciones.find(c => c.id === capacitacionId);
        if (capacitacion) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: persona.correo,
              name: persona.nombre,
              trainingName: capacitacion.nombre,
              date: new Date(capacitacion.dia).toLocaleDateString(),
            }),
          }).catch(err => console.error('Error al disparar el envío de correo:', err));
        }
      }
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
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white overflow-hidden mb-6 shadow-2xl border-4 border-[var(--primary)] animate-float p-1 ring-8 ring-[var(--primary)]/10">
            <img src="/logo.png" alt="Antigravity Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-[280px] mx-auto">Red Municipal de Formación Docente</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-3 font-semibold uppercase tracking-widest text-[10px]">Registro de Asistencia</p>
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
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  placeholder="Ej: 12345678"
                  className="input-field pl-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={dni}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 8) {
                      setDni(value);
                    }
                  }}
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
                <option value="">Seleccioná una opción...</option>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-200 dark:border-slate-800 animate-zoom-in">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-emerald-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{userName}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium italic">Asistencia confirmada</p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full btn-primary h-12 text-lg font-semibold"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center border border-slate-200 dark:border-slate-800 animate-zoom-in">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-500 w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Atención!</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">{errorMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 text-white h-12 rounded-xl text-lg font-semibold transition-all shadow-lg active:scale-95"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

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
