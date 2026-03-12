/**
 * Provider Owner Outreach Email Service
 * Plan 038: Provider Owner Outreach & Claim System
 *
 * Sends localized outreach emails to provider owners via Resend.
 */
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

// ============================================================================
// Types
// ============================================================================

export interface OutreachEmailParams {
  to: string;
  language: 'de' | 'en';
  tokenUrl: string;
  providerName: string;
}

export interface OutreachEmailResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// ============================================================================
// Email Templates
// ============================================================================

const templates = {
  de: {
    subject: 'Ihr Unternehmen auf Ummah Flow – Bitte überprüfen',
    getHtml: (params: { tokenUrl: string; providerName: string }) => `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ihr Unternehmen auf Ummah Flow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #D4D4D4;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #232323; letter-spacing: -0.02em;">Ummah Flow</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #555555; font-weight: 400;">Von Muslimen für Muslime.</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Ihr Unternehmen wurde empfohlen</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Guten Tag,
      </p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Ihr Unternehmen <strong style="color: #232323;">${params.providerName}</strong> wurde von einem Mitglied unserer Community auf Ummah Flow empfohlen – einer Plattform, die muslimische Dienstleister mit der Gemeinschaft verbindet.
      </p>
      
      <div style="background: #F5F5F5; border-left: 4px solid #589D96; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
          <strong style="color: #232323;">Was bedeutet das?</strong><br>
          Ihr Unternehmen ist derzeit als Empfehlung auf unserer Plattform gelistet. Sie haben folgende Optionen:
        </p>
      </div>
      
      <ul style="margin: 24px 0; padding-left: 20px; color: #555555; font-size: 16px; line-height: 1.8;">
        <li><strong style="color: #232323;">Gelistet bleiben</strong> – Ihr Eintrag bleibt sichtbar, ohne weitere Aktion</li>
        <li><strong style="color: #232323;">Eintrag beanspruchen</strong> – Registrieren Sie sich und verwalten Sie Ihren Eintrag</li>
        <li><strong style="color: #232323;">Entfernung beantragen</strong> – Wir entfernen Ihren Eintrag von der Plattform</li>
      </ul>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.tokenUrl}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
          Optionen ansehen
        </a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        Dieser Link ist 7 Tage gültig. Wenn Sie Fragen haben, antworten Sie einfach auf diese E-Mail.
      </p>
    </div>
    
    <!-- WhatsApp Contact Option -->
    <div style="background: #F5F5F5; padding: 24px 32px; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #555555;">
        <strong style="color: #232323;">Kontaktieren Sie uns auch per WhatsApp:</strong>
      </p>
      <a href="https://wa.me/4915123456789" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: #25D366; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
        <span>📱</span>
        <span>WhatsApp öffnen</span>
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background: #F5F5F5; padding: 24px 32px; text-align: center; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555;">
        Mit freundlichen Grüßen,<br>
        <strong style="color: #232323;">Das Ummah Flow Team</strong>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #555555;">
        <a href="https://ummahflow.com" style="color: #589D96; text-decoration: none;">ummahflow.com</a>
        &nbsp;|&nbsp;
        <a href="https://ummahflow.com/impressum" style="color: #589D96; text-decoration: none;">Impressum</a>
        &nbsp;|&nbsp;
        <a href="https://ummahflow.com/privacy-policy" style="color: #589D96; text-decoration: none;">Datenschutz</a>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 11px; color: #888888;">
        Sie erhalten diese E-Mail, weil Ihr Unternehmen auf Ummah Flow empfohlen wurde. 
        Um die Entfernung zu beantragen, klicken Sie auf den Button oben.
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  en: {
    subject: 'Your Business on Ummah Flow – Please Review',
    getHtml: (params: { tokenUrl: string; providerName: string }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Business on Ummah Flow</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); min-height: 100vh;">
  <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(180deg, #F5F5F5 0%, #FBFBFB 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid #D4D4D4;">
      <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #232323; letter-spacing: -0.02em;">Ummah Flow</h1>
      <p style="margin: 8px 0 0 0; font-size: 16px; color: #555555; font-weight: 400;">By Muslims, for Muslims.</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">Your Business Was Recommended</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Hello,
      </p>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Your business <strong style="color: #232323;">${params.providerName}</strong> was recommended by a member of our community on Ummah Flow – a platform connecting Muslim service providers with the community.
      </p>
      
      <div style="background: #F5F5F5; border-left: 4px solid #589D96; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
          <strong style="color: #232323;">What does this mean?</strong><br>
          Your business is currently listed as a recommendation on our platform. You have the following options:
        </p>
      </div>
      
      <ul style="margin: 24px 0; padding-left: 20px; color: #555555; font-size: 16px; line-height: 1.8;">
        <li><strong style="color: #232323;">Stay listed</strong> – Your listing remains visible, no action needed</li>
        <li><strong style="color: #232323;">Claim your listing</strong> – Register and manage your business profile</li>
        <li><strong style="color: #232323;">Request removal</strong> – We'll remove your listing from the platform</li>
      </ul>
      
      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.tokenUrl}" style="display: inline-block; padding: 16px 32px; background: #589D96; color: #FFFFFF; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; letter-spacing: -0.01em;">
          View Options
        </a>
      </div>
      
      <p style="margin: 32px 0 0 0; font-size: 14px; line-height: 1.5; color: #555555;">
        This link is valid for 7 days. If you have questions, simply reply to this email.
      </p>
    </div>
    
    <!-- WhatsApp Contact Option -->
    <div style="background: #F5F5F5; padding: 24px 32px; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 12px 0; font-size: 14px; color: #555555;">
        <strong style="color: #232323;">You can also contact us via WhatsApp:</strong>
      </p>
      <a href="https://wa.me/4915123456789" style="display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: #25D366; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">
        <span>📱</span>
        <span>Open WhatsApp</span>
      </a>
    </div>
    
    <!-- Footer -->
    <div style="background: #F5F5F5; padding: 24px 32px; text-align: center; border-top: 1px solid #D4D4D4;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #555555;">
        Best regards,<br>
        <strong style="color: #232323;">The Ummah Flow Team</strong>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #555555;">
        <a href="https://ummahflow.com" style="color: #589D96; text-decoration: none;">ummahflow.com</a>
        &nbsp;|&nbsp;
        <a href="https://ummahflow.com/impressum" style="color: #589D96; text-decoration: none;">Legal Notice</a>
        &nbsp;|&nbsp;
        <a href="https://ummahflow.com/privacy-policy" style="color: #589D96; text-decoration: none;">Privacy Policy</a>
      </p>
      <p style="margin: 16px 0 0 0; font-size: 11px; color: #888888;">
        You received this email because your business was recommended on Ummah Flow.
        To request removal, click the button above.
      </p>
    </div>
  </div>
</body>
</html>`,
  },
};

// ============================================================================
// Send Function
// ============================================================================

/**
 * Send a provider outreach email.
 */
export async function sendProviderOutreachEmail(
  params: OutreachEmailParams
): Promise<OutreachEmailResult> {
  try {
    const resend = getResendClient();
    const template = templates[params.language] || templates.de;

    const fromEmail = process.env.EMAIL_FROM || 'Ummah Flow <noreply@ummahflow.com>';

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: template.subject,
      html: template.getHtml({
        tokenUrl: params.tokenUrl,
        providerName: params.providerName,
      }),
    });

    if (error) {
      console.error('Resend error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    };
  }
}
