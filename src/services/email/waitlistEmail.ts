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

// Email templates for waitlist
const waitlistTemplates = {
  provider: {
    subject: "You're on the waitlist! (Provider)",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're on the UmmahFlow Waitlist!</title>
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
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">You're on the list!</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Thank you for joining the UmmahFlow waitlist as a <strong>service provider</strong>! We're excited to help you connect with community members looking for services like yours.
      </p>
      
      <div style="background: #F5F5F5; border-left: 4px solid #589D96; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
          <strong style="color: #232323;">What happens next?</strong><br>
          We'll notify you as soon as we launch. You'll be among the first providers to list your services and connect with the community.
        </p>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.6; color: #555555;">
        In the meantime, feel free to share UmmahFlow with others who might benefit from our platform.
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
  user: {
    subject: "You're on the waitlist!",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're on the UmmahFlow Waitlist!</title>
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
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">You're on the list!</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Thank you for joining the UmmahFlow waitlist! We're building a platform to help you discover and connect with community services.
      </p>
      
      <div style="background: #F5F5F5; border-left: 4px solid #589D96; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
          <strong style="color: #232323;">What happens next?</strong><br>
          We'll notify you as soon as we launch. You'll be among the first to access our platform and discover services in your area.
        </p>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.6; color: #555555;">
        In the meantime, feel free to share UmmahFlow with friends and family who might benefit from connecting with community services.
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
  unknown: {
    subject: "You're on the waitlist!",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>You're on the UmmahFlow Waitlist!</title>
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
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #232323; letter-spacing: -0.01em;">You're on the list!</h2>
      
      <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #555555;">
        Thank you for joining the UmmahFlow waitlist! We're building a platform to connect community services and those who need them.
      </p>
      
      <div style="background: #F5F5F5; border-left: 4px solid #589D96; padding: 16px 20px; margin: 24px 0; border-radius: 8px;">
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
          <strong style="color: #232323;">What happens next?</strong><br>
          We'll notify you as soon as we launch. You'll be among the first to access our platform.
        </p>
      </div>
      
      <p style="margin: 24px 0 0 0; font-size: 16px; line-height: 1.6; color: #555555;">
        In the meantime, feel free to share UmmahFlow with others who might benefit from our platform.
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
  }
};

/**
 * Send waitlist confirmation email
 * @param email User email address
 * @param isProvider Whether user is joining as a provider (null if unknown)
 */
export const sendWaitlistConfirmationEmail = async (
  email: string,
  isProvider: boolean | null
): Promise<void> => {
  try {
    const resend = getResendClient();
    
    // Select appropriate template based on provider status
    let template;
    if (isProvider === true) {
      template = waitlistTemplates.provider;
    } else if (isProvider === false) {
      template = waitlistTemplates.user;
    } else {
      template = waitlistTemplates.unknown;
    }
    
    await resend.emails.send({
      from: 'noreply@ummahflow.com',
      to: email,
      subject: template.subject,
      html: template.html
    });
    
    console.log(`[Waitlist] Confirmation email sent to ${email} (provider: ${isProvider})`);
  } catch (error) {
    // Log error but don't throw - we don't want email failures to block waitlist signup
    console.error('[Waitlist] Failed to send confirmation email:', error);
  }
};







