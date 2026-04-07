const { createClient } = require('@supabase/supabase-js');
const url = 'https://ntjrmnamfhjbbhzpujfi.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2Y3djc3VhbXVqeXhpaG1rbnR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MjAxNzMsImV4cCI6MjA4NjE5NjE3M30.0sZSLX--lkRUyefBQSEiht51uFfi1qd9WpaeOSTTBZo'; // using the one from .env

async function test() {
    console.log('Testing alternative URL from CREDENCIALES_SISTEMA.md...');
    const supabase = createClient(url, key);
    const { data, error } = await supabase.from('capacitaciones').select('*').limit(1);
    if (error) {
        console.log('Error:', error.message);
    } else {
        console.log('Success! Data found.');
    }
}
test();
