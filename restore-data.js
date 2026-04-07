
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

async function restoreTable(tableName, jsonFile) {
    console.log(`⏳ Restaurando tabla: ${tableName}...`);

    const filePath = path.join(__dirname, 'backup_db', jsonFile);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Archivo ${jsonFile} no encontrado. Saltando...`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.length === 0) {
        console.log(`⚠️ Archivo vacío para ${tableName}. Nada que insertar.`);
        return;
    }

    // Insertar en lotes de 100 para evitar timeout
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const { error } = await supabase.from(tableName).insert(batch);

        if (error) {
            console.error(`❌ Error insertando lote en ${tableName}:`, error.message);
        } else {
            console.log(`✅ Insertados ${Math.min(i + batchSize, data.length)} / ${data.length} registros en ${tableName}`);
        }
    }
}

async function runRestore() {
    console.log('🚀 Iniciando Restauración de Datos...');
    console.log(`📍 Destino: ${supabaseUrl}`);

    // Orden importante por las claves foráneas (FK)
    // 1. Personas (dependencia base)
    await restoreTable('personas', 'personas.json');

    // 2. Capacitaciones (dependencia base)
    await restoreTable('capacitaciones', 'capacitaciones.json');

    // 3. Asistencias (depende de personas y capacitaciones)
    // IMPORTANT: Check if 'persona' or 'capacitacion' full object is in the json and remove it if so
    // Supabase restore might fail if we try to insert nested objects

    const asistenciasPath = path.join(__dirname, 'backup_db', 'asistencias.json');
    if (fs.existsSync(asistenciasPath)) {
        let asistencias = JSON.parse(fs.readFileSync(asistenciasPath, 'utf8'));
        // Limpiar relaciones anidadas si existen, solo queremos IDs
        asistencias = asistencias.map(a => ({
            id: a.id,
            persona_id: a.persona_id,
            capacitacion_id: a.capacitacion_id,
            fecha_registro: a.fecha_registro
        }));

        // Escribir temp file limpio
        const tempPath = path.join(__dirname, 'backup_db', 'asistencias_clean.json');
        fs.writeFileSync(tempPath, JSON.stringify(asistencias));

        await restoreTable('asistencias', 'asistencias_clean.json');
        fs.unlinkSync(tempPath);
    }

    console.log('\n✨ ¡Restauración completada!');
}

runRestore();
