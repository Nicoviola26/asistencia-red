import { Client } from "@upstash/qstash";
import { NextResponse } from "next/server";

const qstashClient = new Client({
    token: process.env.QSTASH_TOKEN!,
});

export async function POST(req: Request) {
    try {
        const { recipients, type, subject, message, trainingName, date, attachments } = await req.json();

        if (!recipients || !Array.isArray(recipients)) {
            return NextResponse.json({ error: "No se encontraron destinatarios" }, { status: 400 });
        }

        // URL base de la aplicación (usar variable de entorno en Vercel o local)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`;
        const targetUrl = `${baseUrl}/api/send-email`;

        console.log(`Encolando ${recipients.length} correos hacia ${targetUrl}`);

        const publishPromises = recipients.map((recipient: any) => {
            return qstashClient.publishJSON({
                url: targetUrl,
                body: {
                    type: type || 'custom',
                    email: recipient.correo,
                    name: recipient.nombre,
                    subject: subject,
                    message: message,
                    trainingName: trainingName,
                    date: date,
                    attachments: attachments
                },
                // Opcional: Retrasar el envío un poco para no saturar Resend si son muchos
                // delay: index * 2 // 2 segundos de escalonamiento
            });
        });

        await Promise.all(publishPromises);

        return NextResponse.json({
            success: true,
            message: `${recipients.length} correos encolados para procesamiento en segundo plano.`
        });

    } catch (error: any) {
        console.error("Error en el despachador de cola:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
