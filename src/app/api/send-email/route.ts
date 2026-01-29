import { NextResponse } from 'next/server';
import { sendConfirmationEmail, sendCustomEmail } from '@/lib/emails';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, email, name } = body;

        let result;

        if (type === 'custom') {
            const { subject, message, attachments } = body;
            if (!email || !name || !subject || !message) {
                return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
            }
            result = await sendCustomEmail(email, name, subject, message, attachments);
        } else {
            const { trainingName, date } = body;
            if (!email || !name || !trainingName || !date) {
                return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
            }
            result = await sendConfirmationEmail(email, name, trainingName, date);
        }

        if (result.success) {
            return NextResponse.json({ success: true, data: result.data });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error: unknown) {
        const err = error as Error;
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
