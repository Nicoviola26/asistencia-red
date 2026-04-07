require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
    console.log('--- START DATA CHECK ---');
    const { data: caps, error: errCaps } = await supabase.from('capacitaciones').select('*');
    if (errCaps) console.error('Error caps:', errCaps.message);
    else console.log('Capacitaciones found:', caps.length);

    const { data: pers, error: errPers } = await supabase.from('personas').select('*').limit(5);
    if (errPers) console.error('Error personas:', errPers.message);
    else console.log('Personas found (limited to 5):', pers.length);
    console.log('--- END DATA CHECK ---');
}
checkData();
