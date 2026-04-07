
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

async function backupTable(tableName) {
    console.log(`⏳ Descargando tabla: ${tableName}...`);

    const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' });

    if (error) {
        console.error(`❌ Error descargando ${tableName}:`, error.message);
        return null;
    }

    if (!data || data.length === 0) {
        console.log(`⚠️ La tabla ${tableName} está vacía o no se pudo leer.`);
        return [];
    }

    console.log(`✅ ${tableName}: ${data.length} registros encontrados.`);
    return data;
}

async function runBackup() {
    console.log('🚀 Iniciando Respaldo de Emergencia...');
    console.log(`📍 Conectando a: ${supabaseUrl}`);

    const backupDir = path.join(__dirname, 'backup_db');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    // 1. Personas
    const personas = await backupTable('personas');
    if (personas) fs.writeFileSync(path.join(backupDir, 'personas.json'), JSON.stringify(personas, null, 2));

    // 2. Capacitaciones
    const caps = await backupTable('capacitaciones');
    if (caps) fs.writeFileSync(path.join(backupDir, 'capacitaciones.json'), JSON.stringify(caps, null, 2));

    // 3. Asistencias
    const asistencias = await backupTable('asistencias');
    if (asistencias) fs.writeFileSync(path.join(backupDir, 'asistencias.json'), JSON.stringify(asistencias, null, 2));

    console.log('\n✨ ¡Respaldo completado! Los archivos están en la carpeta "backup_db".');
}

runBackup();
