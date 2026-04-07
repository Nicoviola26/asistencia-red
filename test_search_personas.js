require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testSearch() {
    console.log('Testing search for all personas...');
    const { data, error } = await supabase.from('personas').select('*').limit(5);
    if (error) {
        console.error('Search error:', error.message);
    } else {
        console.log('Search success, found:', data.length);
        data.forEach(p => console.log(`${p.nombre} ${p.apellido}`));
    }
}
testSearch();
