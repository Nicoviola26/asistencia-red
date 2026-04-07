require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
    console.log('--- Database Inspection ---');
    console.log('URL:', supabaseUrl);

    // Check tables via RPC or direct query if possible, but we only have anon key
    // Let's try to get one row and see if it works again
    const { data, error, status } = await supabase.from('capacitaciones').select('*').limit(1);

    if (error) {
        console.log('Error fetching from "capacitaciones":', error.message);
        console.log('Status code:', status);
    } else {
        console.log('Successfully connected to "capacitaciones" table.');
        console.log('Sample data keys:', data.length > 0 ? Object.keys(data[0]) : 'No data');
    }

    // Try a different table
    const { data: pData, error: pError } = await supabase.from('personas').select('*').limit(1);
    if (pError) {
        console.log('Error fetching from "personas":', pError.message);
    } else {
        console.log('Successfully connected to "personas" table.');
    }
}

inspect();
