import { Resend } from 'resend';

// Lazy-load Resend client to avoid build-time initialization
let resendClient: Resend | null = null;

const getResendClient = () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

// Email templates
const templates = {
  confirmSignup: {
    en: {
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
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Welcome to UmmahFlow!</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Thank you for joining our community! We're excited to help you connect with local services and providers.
      </p>
      
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Please confirm your email address to complete your registration:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{CONFIRMATION_URL}}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
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
    },
    de: {
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
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Willkommen bei UmmahFlow!</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Vielen Dank, dass Sie unserer Community beigetreten sind! Wir freuen uns, Ihnen dabei zu helfen, sich mit lokalen Dienstleistern und Anbietern zu vernetzen.
      </p>
      
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihre Registrierung abzuschließen:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{CONFIRMATION_URL}}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
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
    }
  },
  resetPassword: {
    en: {
      subject: 'Reset your UmmahFlow password',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password - UmmahFlow</title>
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
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Reset Your Password</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        We received a request to reset your password for your UmmahFlow account.
      </p>
      
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Click the button below to create a new password:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{CONFIRMATION_URL}}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
          Reset Password
        </a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        <strong>Security tip:</strong> This link will expire in 24 hours for your security.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #F5F5F5; padding: 24px 32px; text-align: center; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555;">
        Best regards,<br>
        <strong style="color: #232323;">The UmmahFlow Team</strong>
      </p>
    </div>
  </div>
</body>
</html>`
    },
    de: {
      subject: 'UmmahFlow-Passwort zurücksetzen',
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Passwort zurücksetzen - UmmahFlow</title>
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
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Passwort zurücksetzen</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Wir haben eine Anfrage zum Zurücksetzen Ihres UmmahFlow-Passworts erhalten.
      </p>
      
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Klicken Sie auf die Schaltfläche unten, um ein neues Passwort zu erstellen:
      </p>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="{{CONFIRMATION_URL}}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
          Passwort zurücksetzen
        </a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        Falls Sie keine Passwort-Zurücksetzung angefordert haben, können Sie diese E-Mail ignorieren. Ihr Passwort bleibt unverändert.
      </p>
      
      <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        <strong>Sicherheitstipp:</strong> Dieser Link läuft aus Sicherheitsgründen in 24 Stunden ab.
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #F5F5F5; padding: 24px 32px; text-align: center; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555;">
        Mit freundlichen Grüßen,<br>
        <strong style="color: #232323;">Das UmmahFlow Team</strong>
      </p>
    </div>
  </div>
</body>
</html>`
    }
  }
};

export const sendAuthEmail = async (
  to: string,
  type: 'confirmSignup' | 'resetPassword',
  language: 'en' | 'de',
  confirmationUrl: string
) => {
  const template = templates[type][language];
  const resend = getResendClient();
  
  return await resend.emails.send({
    from: 'noreply@ummahflow.com',
    to,
    subject: template.subject,
    html: template.html.replace('{{CONFIRMATION_URL}}', confirmationUrl)
  });
};
