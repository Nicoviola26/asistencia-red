# Sistema de Gestión de Asistencia

Aplicación web moderna para la toma de asistencia en capacitaciones y eventos.

## Tecnologías

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **Backend / DB**: Supabase.
- **Iconografía**: Lucide React.
- **Exportación**: XLSX.

## Configuración de la Base de Datos (Supabase)

Ejecuta el siguiente SQL en el SQL Editor de tu proyecto Supabase:

```sql
-- Tabla: personas
CREATE TABLE personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dni TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  correo TEXT,
  celular TEXT,
  institucion TEXT,
  rol TEXT DEFAULT 'estudiante' -- estudiante, docente, asistente
);

-- Tabla: capacitaciones
CREATE TABLE capacitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  dia DATE NOT NULL,
  hora TIME NOT NULL,
  lugar TEXT,
  disertante TEXT
);

-- Tabla: asistencias
CREATE TABLE asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES personas(id) ON DELETE CASCADE,
  capacitacion_id UUID REFERENCES capacitaciones(id) ON DELETE CASCADE,
  fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(persona_id, capacitacion_id)
);

-- Habilitar RLS (Opcional, pero recomendado)
-- Para este ejemplo, asegúrate de configurar las políticas de acceso (Policies) 
-- para permitir lectura/escritura anónima o autenticada según sea necesario.
```

## Configuración del Entorno

1. Renombra `.env.local.example` a `.env.local`.
2. Completa las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con las credenciales de tu proyecto.

## Despliegue

La aplicación está lista para ser desplegada en **Vercel**:

1. Sube el código a un repositorio de GitHub.
2. Importa el proyecto en Vercel.
3. Configura las variables de entorno en el panel de Vercel.
4. ¡Listo!
