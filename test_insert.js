require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
    console.log('--- Testing Insert to "capacitaciones" ---');
    const newCap = {
        nombre: 'Test API Insert',
        dia: '2026-03-02',
        hora: '10:00',
        lugar: 'Test',
        disertante: 'Test',
        activa: true // THIS IS THE FIELD WE ARE WORRIED ABOUT
    };

    console.log('Attempting to insert row with "activa" field...');
    const { data, error } = await supabase.from('capacitaciones').insert([newCap]);

    if (error) {
        console.log('❌ Insert failed as expected (if column is missing):', error.message);
    } else {
        console.log('✅ Insert SUCCEEDED! This means the column "activa" ALREADY EXISTS.');
        // Cleanup
        await supabase.from('capacitaciones').delete().eq('nombre', 'Test API Insert');
    }
}

testInsert();
