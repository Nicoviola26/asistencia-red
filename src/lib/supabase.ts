import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Persona = {
    id: string;
    dni: string;
    nombre: string;
    apellido: string;
    correo: string | null;
    celular: string | null;
    institucion: string | null;
    rol: 'estudiante' | 'docente' | 'asistente' | 'directivo' | 'estudiante avanzado' | 'agente municipal';
};

export type Capacitacion = {
    id: string;
    nombre: string;
    dia: string;
    hora: string;
    lugar: string | null;
    disertante: string | null;
};

export type Asistencia = {
    id: string;
    persona_id: string;
    capacitacion_id: string;
    fecha_registro: string;
    persona?: Persona;
    capacitacion?: Capacitacion;
};
