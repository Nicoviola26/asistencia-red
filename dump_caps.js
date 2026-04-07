require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function dumpCaps() {
    const { data, error } = await supabase.from('capacitaciones').select('nombre, activa, dia');
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('--- Capacitaciones ---');
        data.forEach(c => console.log(`${c.activa ? 'A' : 'O'}|${c.dia}|${c.nombre}`));
        console.log('Total:' + data.length);
    }
}
dumpCaps();
