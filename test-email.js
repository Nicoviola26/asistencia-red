import { sendConfirmationEmail } from './src/lib/emails.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function test() {
    const email = 'nicoviola2609@gmail.com';
    const name = 'Nico Viola';
    const trainingName = 'Capacitación de Prueba - Red Municipal';
    const date = new Date().toLocaleDateString();

    console.log(`Enviando correo de prueba a ${email}...`);

    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_tu_clave_aqui') {
        console.error('ERROR: No has configurado tu RESEND_API_KEY en el archivo .env.local');
        console.log('Por favor, obtén una clave en https://resend.com y actualiza el archivo .env.local');
        return;
    }

    const result = await sendConfirmationEmail(email, name, trainingName, date);

    if (result.success) {
        console.log('¡ÉXITO! El correo ha sido enviado correctamente.');
    } else {
        console.error('FALLO al enviar el correo:', result.error);
    }
}

test();
