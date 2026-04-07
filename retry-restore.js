
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno manualmente porque no estamos en Next.js
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ No se encontraron las credenciales en .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function restoreAsistenciasIndividually() {
    console.log(`⏳ Restaurando asistencias una por una para evitar conflictos...`);

    const filePath = path.join(__dirname, 'backup_db', 'asistencias.json');
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo asistencias.json no encontrado.`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.length === 0) {
        console.log(`⚠️ Archivo vacío. Nada que insertar.`);
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const record of data) {
        // Limpiamos el objeto para solo tener los campos necesarios
        const cleanRecord = {
            id: record.id,
            persona_id: record.persona_id,
            capacitacion_id: record.capacitacion_id,
            fecha_registro: record.fecha_registro
        };

        const { error } = await supabase.from('asistencias').insert(cleanRecord);

        if (error) {
            // Ignoramos duplicados (23505) pero reportamos otros errores
            if (error.code !== '23505') {
                console.error(`❌ Falló ID ${record.id}:`, error.message);
                failCount++;
            }
        } else {
            successCount++;
        }

        // Pequeña pausa para no saturar
        if (successCount % 10 === 0) process.stdout.write('.');
    }

    console.log(`\n\n✨ Proceso finalizado.`);
    console.log(`✅ Insertadas: ${successCount}`);
    console.log(`❌ Fallidas: ${failCount}`);
}

restoreAsistenciasIndividually();
