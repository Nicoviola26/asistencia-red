import { createClient } from '@supabase/supabase-js';
import { createResilientClient } from '@/lib/db-client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Las consultas a tablas pasan por /api/db (capa de servidor con reintentos,
// timeout y cache). Solo el bucket de certificados sigue yendo directo a
// Supabase, porque necesita streaming de archivos.
const storageClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false }
});

export const supabase = createResilientClient(storageClient.storage);

// Cliente seguro para la parte publica que NO usa localStorage (evita crashes por cache viejo)
export const publicSupabase = createResilientClient(storageClient.storage);

export type Persona = {
    id: string;
    dni: string;
    nombre: string;
    apellido: string;
    correo: string | null;
    celular: string | null;
    institucion: string | null;
    rol: 'estudiante' | 'docente' | 'asistente' | 'directivo' | 'estudiante avanzado' | 'agente municipal';
    eje?: string | null;
    premio_entregado?: boolean;
};

export type Capacitacion = {
    id: string;
    nombre: string;
    dia: string;
    hora: string;
    lugar: string | null;
    disertante: string | null;
    activa?: boolean;
};

export type Asistencia = {
    id: string;
    persona_id: string;
    capacitacion_id: string;
    fecha_registro: string;
    persona?: Persona;
    capacitacion?: Capacitacion;
};

// Padrón de personas a las que una capacitación iba dirigida. Es el denominador
// correcto del % de asistencia; sin él solo se conoce el total de la red.
export type Convocado = {
    id: string;
    persona_id: string;
    capacitacion_id: string;
    fecha_registro: string;
    persona?: Persona;
    capacitacion?: Capacitacion;
};

export type Certificado = {
    id: string;
    dni: string;
    capacitacion_id: string;
    archivo_url: string;
    nombre_archivo: string;
    fecha_subida: string;
    vistas?: number;
    ultima_vista?: string | null;
    capacitacion?: Capacitacion;
};
