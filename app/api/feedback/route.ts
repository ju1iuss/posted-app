import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { message, type, userEmail } = await req.json();

    const { data, error } = await resend.emails.send({
      from: 'Posted App <julius@tasy.ai>',
      to: ['hi@tasy.ai'],
      subject: `New ${type} from ${userEmail || 'Anonymous'}`,
      text: message,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
