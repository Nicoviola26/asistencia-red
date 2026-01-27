import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail(email: string, name: string, trainingName: string, date: string) {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Red Municipal de Formación Docente <onboarding@resend.dev>',
            to: [email],
            subject: `Confirmación de Asistencia - ${trainingName}`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
          <h1 style="color: #49b38d;">¡Hola ${name}!</h1>
          <p style="font-size: 16px; color: #1e293b;">Tu asistencia ha sido registrada con éxito.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Capacitación:</strong> ${trainingName}</p>
            <p style="margin: 5px 0;"><strong>Fecha:</strong> ${date}</p>
          </div>
          <p style="font-size: 14px; color: #64748b;">Gracias por participar en la Red Municipal de Formación Docente.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">Este es un mensaje automático, por favor no respondas a este correo.</p>
        </div>
      `,
        });

        if (error) {
            console.error('Error sending email:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Exception sending email:', error);
        return { success: false, error };
    }
}
