'use client';

import { useState, useEffect } from 'react';
import { supabase, type Capacitacion } from '@/lib/supabase';
import { Search, Loader2, CheckCircle2, AlertCircle, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

export default function RegistrationPage() {
  const [dni, setDni] = useState('');
  const [capacitacionId, setCapacitacionId] = useState('');
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { showToast } = useToast();
  const [modal, setModal] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    user?: string;
  }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const fetchCapacitaciones = async () => {
    try {
      const { data } = await supabase
        .from('capacitaciones')
        .select('*')
        .eq('activa', true)
        .order('dia', { ascending: false });

      if (data) {
        setCapacitaciones(data);
        localStorage.setItem('cached_capacitaciones', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Offline - usando caché para capacitaciones');
      const cached = localStorage.getItem('cached_capacitaciones');
      if (cached) setCapacitaciones(JSON.parse(cached));
    }
  };

  const syncOfflineRegistrations = async () => {
    const pending = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
    if (pending.length === 0) return;

    showToast('Sincronizando registros offline...', 'info');
    let successCount = 0;

    for (const reg of pending) {
      try {
        const { error } = await supabase.from('asistencias').insert({
          persona_id: reg.persona_id,
          capacitacion_id: reg.capacitacion_id,
          created_at: reg.timestamp // Mantener la hora original si la DB lo permite
        });
        if (!error) successCount++;
      } catch (err) {
        console.error('Error sincronizando offline:', err);
      }
    }

    if (successCount > 0) {
      showToast(`¡Sincronización exitosa! ${successCount} registros subidos.`, 'success');
      localStorage.setItem('pending_registrations', '[]');
    }
  };

  useEffect(() => {
    // Offline / Online detection
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineRegistrations();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    if (navigator.onLine) syncOfflineRegistrations();

    // Fetch
    const cached = localStorage.getItem('cached_capacitaciones');
    if (cached) setCapacitaciones(JSON.parse(cached));

    fetchCapacitaciones();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (dni.length < 7 || dni.length > 8) {
      setModal({
        show: true,
        type: 'error',
        title: 'Formato Incorrecto',
        message: 'Por favor, ingresá un formato de DNI correcto.'
      });
      return;
    }

    setLoading(true);

    // MODO OFFLINE O FALLO DE CONEXIÓN
    if (!navigator.onLine) {
      const { data: persona } = await supabase
        .from('personas')
        .select('id, nombre, apellido')
        .eq('dni', dni.trim())
        .single();

      // Intentar buscar en caché local si implementamos eso, 
      // pero por ahora salvaremos el DNI y la capacitación directamente
      const pending = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
      pending.push({
        dni: dni.trim(),
        capacitacion_id: capacitacionId,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('pending_registrations', JSON.stringify(pending));

      setModal({
        show: true,
        type: 'info',
        title: 'Guardado Localmente',
        message: 'No tienes conexión a internet. Tu asistencia se guardó en el dispositivo y se sincronizará automáticamente cuando recuperes la conexión.'
      });
      setDni('');
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar persona por DNI
      const { data: persona, error: personaError } = await supabase
        .from('personas')
        .select('id, nombre, apellido, correo')
        .eq('dni', dni.trim())
        .single();

      if (personaError || !persona) {
        setModal({
          show: true,
          type: 'warning',
          title: 'DNI no encontrado',
          message: 'El DNI ingresado no se encuentra registrado en la Red de Formación Docente.'
        });
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
        setModal({
          show: true,
          type: 'error',
          title: 'Registro Duplicado',
          message: 'Esta asistencia ya fue registrada anteriormente para esta capacitación.'
        });
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

      setModal({
        show: true,
        type: 'success',
        title: '¡Registro Exitoso!',
        message: 'Tu asistencia ha sido confirmada correctamente.',
        user: `${persona.nombre} ${persona.apellido}`
      });
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
      // Falla por red? Salvar local
      const pending = JSON.parse(localStorage.getItem('pending_registrations') || '[]');
      pending.push({ dni: dni.trim(), capacitacion_id: capacitacionId, timestamp: new Date().toISOString() });
      localStorage.setItem('pending_registrations', JSON.stringify(pending));

      setModal({
        show: true,
        type: 'info',
        title: 'Error de Red - Guardado Local',
        message: 'Hubo un problema al conectar con el servidor. Tu asistencia se guardó localmente y se reintentará subir luego.'
      });
      setDni('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white overflow-hidden mb-6 shadow-2xl border-4 border-[var(--primary)] animate-float p-1 ring-8 ring-[var(--primary)]/10 relative">
            <img src="/logo.png" alt="Antigravity Logo" className="w-full h-full object-cover rounded-full" />
            {isOffline && (
              <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[1px]">
                <WifiOff className="text-white" size={32} />
              </div>
            )}
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-[280px] mx-auto">Red Municipal de Formación Docente</h1>
          {isOffline ? (
            <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full mt-3 animate-pulse">
              <WifiOff size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest">Modo Offline Activo</span>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 mt-3 font-semibold uppercase tracking-widest text-[10px]">Registro de Asistencia</p>
          )}
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
        </div>
      </div>

      {modal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 max-w-sm w-full text-center border border-slate-200 dark:border-slate-800 animate-zoom-in relative overflow-hidden">
            {/* Background Accent */}
            <div className={`absolute top-0 left-0 w-full h-2 ${modal.type === 'success' ? 'bg-emerald-500' :
              modal.type === 'warning' ? 'bg-amber-500' : 'bg-red-500'
              }`} />

            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${modal.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500' :
              modal.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500' :
                'bg-red-100 dark:bg-red-900/30 text-red-500'
              }`}>
              {modal.type === 'success' ? <CheckCircle2 size={48} /> : <AlertCircle size={48} />}
            </div>

            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">
              {modal.user ? modal.user : modal.title}
            </h2>

            <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium leading-relaxed">
              {modal.user ? modal.message : modal.message}
            </p>

            <button
              onClick={() => setModal({ ...modal, show: false })}
              className={`w-full h-14 rounded-2xl text-lg font-bold transition-all shadow-lg active:scale-95 ${modal.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20' :
                modal.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20' :
                  modal.type === 'info' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' :
                    'bg-red-600 hover:bg-red-700 text-white shadow-red-500/20'
                }`}
            >
              {modal.type === 'success' || modal.type === 'info' ? 'Entendido' : 'Reintentar'}
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
