import { NextResponse } from 'next/server';
import { sendAuthEmail } from '@/services/emailService';

export async function POST(request: Request) {
  try {
    const { to, type, language, confirmationUrl } = await request.json();
    
    // Validate inputs
    if (!to || !type || !language || !confirmationUrl) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email type
    if (type !== 'confirmSignup' && type !== 'resetPassword' && type !== 'magicLink') {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }
    
    // Validate language
    if (language !== 'en' && language !== 'de' && language !== 'ar' && language !== 'tr') {
      return NextResponse.json(
        { error: 'Invalid language' },
        { status: 400 }
      );
    }
    
    // Send email
    const result = await sendAuthEmail(to, type, language, confirmationUrl);
    
    return NextResponse.json({ success: true, result }, { status: 200 });
  } catch (error) {
    console.error('Failed to send auth email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

