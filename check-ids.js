
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

async function checkData() {
    console.log('🔍 Diagnóstico de Datos...');

    // Asistencia de prueba del backup (usamos el primer ID)
    const asistenciasBackup = JSON.parse(fs.readFileSync(path.join(__dirname, 'backup_db', 'asistencias.json'), 'utf8'));
    const primeraAsistencia = asistenciasBackup[0];

    console.log(`\n📄 Asistencia Backup ID: ${primeraAsistencia.id}`);
    console.log(`   Persona FK: ${primeraAsistencia.persona_id}`);
    console.log(`   Capacitacion FK: ${primeraAsistencia.capacitacion_id}`);

    // Verificar si esa persona existe en la DB nueva
    const { data: personaDB } = await supabase.from('personas').select('id, nombre').eq('id', primeraAsistencia.persona_id).single();

    if (personaDB) {
        console.log(`✅ Persona encontrada en DB: ${personaDB.nombre} (${personaDB.id})`);
    } else {
        console.log(`❌ Persona NO encontrada en DB con ese ID.`);
        // Buscar por DNI o algo para ver si tiene OTRO ID
        // Necesitamos cargar el backup de personas para saber el DNI de este ID
        const personasBackup = JSON.parse(fs.readFileSync(path.join(__dirname, 'backup_db', 'personas.json'), 'utf8'));
        const personaOriginal = personasBackup.find(p => p.id === primeraAsistencia.persona_id);

        if (personaOriginal) {
            const { data: personaPorDNI } = await supabase.from('personas').select('id').eq('dni', personaOriginal.dni).single();
            if (personaPorDNI) {
                console.log(`⚠️ La persona existe pero con OTRO ID: ${personaPorDNI.id}`);
            } else {
                console.log(`💀 La persona no existe ni por ID ni por DNI.`);
            }
        }
    }

    // Verificar capacitacion
    const { data: capDB } = await supabase.from('capacitaciones').select('id, nombre').eq('id', primeraAsistencia.capacitacion_id).single();
    if (capDB) {
        console.log(`✅ Capacitación encontrada en DB: ${capDB.nombre}`);
    } else {
        console.log(`❌ Capacitación NO encontrada en DB con ese ID.`);
        // Verificar si existe con otro ID
        const capsBackup = JSON.parse(fs.readFileSync(path.join(__dirname, 'backup_db', 'capacitaciones.json'), 'utf8'));
        const capOriginal = capsBackup.find(c => c.id === primeraAsistencia.capacitacion_id);

        if (capOriginal) {
            const { data: capPorNombre } = await supabase.from('capacitaciones').select('id').eq('nombre', capOriginal.nombre).single();
            if (capPorNombre) {
                console.log(`⚠️ La capacitación existe pero con OTRO ID: ${capPorNombre.id}`);
            } else {
                console.log(`💀 La capacitación no existe.`);
            }
        }
    }
}

checkData();
