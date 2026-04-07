require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testCreateCap() {
    console.log('Testing create training...');
    const newCap = {
        nombre: 'Capacitacion de Prueba ' + Date.now(),
        dia: '2026-03-12',
        hora: '10:00',
        lugar: 'Lugar de Prueba',
        disertante: 'Disertante de Prueba',
        activa: true
    };

    const { data, error } = await supabase.from('capacitaciones').insert([newCap]).select();
    if (error) {
        console.error('Create error:', error.message);
    } else {
        console.log('Create success:', data[0].nombre);
        // Delete it afterwards
        await supabase.from('capacitaciones').delete().eq('id', data[0].id);
        console.log('Cleanup success.');
    }
}
testCreateCap();
