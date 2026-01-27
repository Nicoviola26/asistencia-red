import { NextResponse } from 'next/server';
import { sendConfirmationEmail, sendCustomEmail } from '@/lib/emails';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, email, name } = body;

        let result;

        if (type === 'custom') {
            const { subject, message } = body;
            if (!email || !name || !subject || !message) {
                return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
            }
            result = await sendCustomEmail(email, name, subject, message);
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
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
