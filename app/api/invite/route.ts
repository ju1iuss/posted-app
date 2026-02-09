import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, orgName, inviteCode, inviterName } = await request.json();

    if (!email || !orgName || !inviteCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Posted App <posted@tasy.ai>',
      to: email,
      subject: `You've been invited to join ${orgName} on Posted`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #171717; color: #dbdbdb; border-radius: 12px;">
          <h1 style="color: #ddfc7b; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em;">Posted</h1>
          <p style="font-size: 16px; line-height: 1.5;">
            Hi there,
          </p>
          <p style="font-size: 16px; line-height: 1.5;">
            <strong>${inviterName || 'Someone'}</strong> has invited you to join their workspace <strong>${orgName}</strong> on Posted.
          </p>
          <div style="background-color: #2a2a2a; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #3f3f46;">
            <p style="margin: 0; font-size: 14px; color: #a1a1aa; text-transform: uppercase; font-weight: 900; letter-spacing: 0.1em;">Your Invite Code</p>
            <p style="margin: 10px 0 0 0; font-size: 32px; font-weight: 900; color: #ddfc7b; letter-spacing: 0.2em;">${inviteCode}</p>
          </div>
          <p style="font-size: 14px; color: #a1a1aa;">
            To join, open the Posted app, click on your organization name in the sidebar, and select <strong>Join Workspace</strong>.
          </p>
          <hr style="border: 0; border-top: 1px solid #3f3f46; margin: 20px 0;" />
          <p style="font-size: 12px; color: #71717a; text-align: center;">
            &copy; ${new Date().getFullYear()} Posted. All rights reserved.
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
