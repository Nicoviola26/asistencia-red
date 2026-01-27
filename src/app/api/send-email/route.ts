import { NextResponse } from 'next/server';
import { sendConfirmationEmail } from '@/lib/emails';

export async function POST(request: Request) {
    try {
        const { email, name, trainingName, date } = await request.json();

        if (!email || !name || !trainingName || !date) {
            return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 });
        }

        const result = await sendConfirmationEmail(email, name, trainingName, date);

        if (result.success) {
            return NextResponse.json({ success: true, data: result.data });
        } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
