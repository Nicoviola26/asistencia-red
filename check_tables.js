require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSchema() {
    console.log('Checking schema status...');
    const tables = ['personas', 'capacitaciones', 'asistencias'];

    for (const table of tables) {
        const { error, status } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table "${table}": Error ${status} - ${error.message}`);
        } else {
            console.log(`Table "${table}": OK`);
        }
    }
}
checkSchema();
