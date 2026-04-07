
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function restoreAll() {
    console.log('🚀 Iniciando Restauración Completa y Segura...');

    try {
        // 1. Cargar Backups
        const personas = JSON.parse(fs.readFileSync(path.join(__dirname, 'backup_db/personas.json')));
        const capacitaciones = JSON.parse(fs.readFileSync(path.join(__dirname, 'backup_db/capacitaciones.json')));
        const asistencias = JSON.parse(fs.readFileSync(path.join(__dirname, 'backup_db/asistencias.json')));

        console.log(`📦 Datos cargados: ${personas.length} personas, ${capacitaciones.length} capacitaciones, ${asistencias.length} asistencias.`);

        // 2. Insertar PERSONAS
        console.log('\n👤 Insertando Personas...');
        for (const p of personas) {
            const { error } = await supabase.from('personas').upsert({
                id: p.id, // Forzamos el ID original
                dni: p.dni,
                nombre: p.nombre,
                apellido: p.apellido,
                correo: p.correo,
                celular: p.celular,
                institucion: p.institucion,
                rol: p.rol,
                eje: p.eje,
                premio_entregado: p.premio_entregado || false
            });
            if (error) console.error(`   ❌ Error Persona ${p.dni}:`, error.message);
        }
        console.log('✅ Personas procesadas.');

        // 3. Insertar CAPACITACIONES
        console.log('\n📚 Insertando Capacitaciones...');
        for (const c of capacitaciones) {
            const { error } = await supabase.from('capacitaciones').upsert({
                id: c.id, // Forzamos el ID original
                nombre: c.nombre,
                dia: c.dia,
                hora: c.hora,
                lugar: c.lugar,
                disertante: c.disertante
            });
            if (error) console.error(`   ❌ Error Capacitación ${c.nombre}:`, error.message);
        }
        console.log('✅ Capacitaciones procesadas.');

        // 4. Insertar ASISTENCIAS
        console.log('\n📝 Insertando Asistencias...');
        let asisCount = 0;
        for (const a of asistencias) {
            // Verificar si existen las referencias antes de insertar
            const { data: pExists } = await supabase.from('personas').select('id').eq('id', a.persona_id).single();
            const { data: cExists } = await supabase.from('capacitaciones').select('id').eq('id', a.capacitacion_id).single();

            if (pExists && cExists) {
                const { error } = await supabase.from('asistencias').upsert({
                    id: a.id,
                    persona_id: a.persona_id,
                    capacitacion_id: a.capacitacion_id,
                    fecha_registro: a.fecha_registro
                });
                if (error) {
                    console.error(`   ❌ Error Asistencia ${a.id}:`, error.message);
                } else {
                    asisCount++;
                }
            } else {
                console.warn(`   ⚠️ Saltando Asistencia ${a.id}: Falta Persona o Capacitación.`);
            }
        }
        console.log(`✅ Asistencias procesadas: ${asisCount}/${asistencias.length}`);

    } catch (err) {
        console.error('🔥 Error fatal:', err);
    }
}

restoreAll();
