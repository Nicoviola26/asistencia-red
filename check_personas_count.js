require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkPersonas() {
    const { count, error } = await supabase.from('personas').select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log('Total Personas:', count);
    }
}
checkPersonas();
