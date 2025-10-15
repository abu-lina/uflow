import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SITE_URL = Deno.env.get('SITE_URL') || 'https://ummahflow.com';

interface EmailData {
  token_hash?: string;
  redirect_to?: string;
  email_action_type?: string;
}

interface User {
  id: string;
  email: string;
  email_confirmed_at?: string;
  user_metadata?: {
    language?: string;
    preferred_language?: string;
  };
}

interface WebhookPayload {
  user: User;
  email_data: EmailData;
}

// Email templates matching your existing design
const getEmailTemplate = (language: string, confirmationUrl: string): { subject: string; html: string } => {
  if (language === 'de') {
    return {
      subject: 'Willkommen bei UmmahFlow! Bitte bestätigen Sie Ihre E-Mail',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Willkommen bei UmmahFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #D4D4D4;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #232323; letter-spacing: -0.02em;">UmmahFlow</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #555555; font-weight: 400;">Community-Services verbinden</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Willkommen bei UmmahFlow! 🎉</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Vielen Dank, dass Sie unserer Community beigetreten sind! Wir freuen uns, Ihnen dabei zu helfen, sich mit lokalen Dienstleistern und Anbietern zu vernetzen.
      </p>
      
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihre Registrierung abzuschließen:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
          E-Mail-Adresse bestätigen
        </a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        Falls Sie kein Konto bei UmmahFlow erstellt haben, können Sie diese E-Mail ignorieren.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #F5F5F5; padding: 24px 32px; text-align: center; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555;">
        Mit freundlichen Grüßen,<br>
        <strong style="color: #232323;">Das UmmahFlow Team</strong>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #555555;">
        <a href="https://ummahflow.com" style="color: #589D96; text-decoration: none;">ummahflow.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
    };
  }
  
  // English template
  return {
    subject: 'Welcome to UmmahFlow! Please confirm your email',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to UmmahFlow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #D4D4D4;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #232323; letter-spacing: -0.02em;">UmmahFlow</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #555555; font-weight: 400;">Connecting Community Services</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Welcome to UmmahFlow! 🎉</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Thank you for joining our community! We're excited to help you connect with local services and providers.
      </p>
      
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Please confirm your email address to complete your registration:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
          Confirm Email Address
        </a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        If you didn't create an account with UmmahFlow, you can safely ignore this email.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #F5F5F5; padding: 24px 32px; text-align: center; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555;">
        Best regards,<br>
        <strong style="color: #232323;">The UmmahFlow Team</strong>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #555555;">
        <a href="https://ummahflow.com" style="color: #589D96; text-decoration: none;">ummahflow.com</a>
      </p>
    </div>
  </div>
</body>
</html>`
  };
};

serve(async (req) => {
  try {
    // Parse the webhook payload
    const payload: WebhookPayload = await req.json();
    const { user, email_data } = payload;

    console.log('Auth hook triggered for user:', user.email);

    // Validate required data
    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: 'Missing user or email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Detect language from user metadata or default to English
    const language = user.user_metadata?.language || user.user_metadata?.preferred_language || 'en';
    
    // Build confirmation URL
    // Supabase provides token_hash in email_data for confirmation emails
    const confirmationUrl = email_data.token_hash
      ? `${SITE_URL}/auth/confirm?token_hash=${email_data.token_hash}&type=signup`
      : `${SITE_URL}/auth/confirm`;

    console.log('Sending email in language:', language);
    console.log('Confirmation URL:', confirmationUrl);

    // Get email template
    const { subject, html } = getEmailTemplate(language, confirmationUrl);

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'UmmahFlow <noreply@ummahflow.com>',
        to: user.email,
        subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation email sent',
        email_id: resendData.id 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-confirmation-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

