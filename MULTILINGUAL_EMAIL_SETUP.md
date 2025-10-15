# Multilingual Email Setup Guide

This guide will help you set up multilingual email support for UmmahFlow with German and English users.

## 🎯 **What's Been Implemented**

✅ **Email Service** - Professional templates in both languages  
✅ **Language Detection** - Automatic detection from browser settings  
✅ **Language Switching** - Manual language selection  
✅ **Auth Integration** - Custom signup and password reset  
✅ **Email Confirmation** - Custom confirmation page  
✅ **Brand Consistency** - Matches your UmmahFlow design  

---

## 📧 **Email Templates Created**

### **English Templates:**
- **Signup Confirmation** - "Welcome to UmmahFlow! Please confirm your email"
- **Password Reset** - "Reset your UmmahFlow password"

### **German Templates:**
- **Signup Confirmation** - "Willkommen bei UmmahFlow! Bitte bestätigen Sie Ihre E-Mail"
- **Password Reset** - "UmmahFlow-Passwort zurücksetzen"

### **Design Features:**
- ✅ Matches your brand colors (#589D96 mint)
- ✅ Uses your typography (Inter font)
- ✅ Consistent spacing and layout
- ✅ Mobile responsive design
- ✅ Professional appearance

---

## 🔧 **Setup Instructions**

### **Step 1: Environment Variables**

Add these to your `.env.local` file:

```bash
# Site URL for email links
NEXT_PUBLIC_SITE_URL=https://ummahflow.com

# Resend API Key for sending emails
RESEND_API_KEY=re_your_api_key_here
```

**To get your Resend API key:**
1. Go to https://resend.com
2. Sign up or log in
3. Go to API Keys
4. Create a new API key
5. Copy the key (starts with `re_`)

### **Step 2: Disable Supabase Email Templates**

1. **Go to Supabase Dashboard**
2. **Settings** → **Auth** → **Email Templates**
3. **Turn OFF** "Enable custom SMTP"
4. **Save** the changes

### **Step 3: Test the Setup**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test English signup:**
   - Go to your signup page
   - Sign up with a test email
   - Check your email for the English confirmation

3. **Test German signup:**
   - Change browser language to German
   - Or set language manually: `localStorage.setItem('ummahflow-language', 'de')`
   - Sign up with another test email
   - Check for the German confirmation

---

## 🚀 **How to Use in Your Components**

### **Language Switcher Component**

Add this to your header or navigation:

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// In your component
<LanguageSwitcher />
```

### **Signup Form**

Replace your existing signup form with:

```tsx
import { SignUpForm } from '@/components/auth/SignUpForm';

// In your component
<SignUpForm />
```

### **Password Reset Form**

Replace your existing password reset form with:

```tsx
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

// In your component
<ResetPasswordForm />
```

### **Language Detection Hook**

Use in any component that needs language:

```tsx
import { useLanguage } from '@/hooks/useLanguage';

function MyComponent() {
  const { language, updateLanguage } = useLanguage();
  
  return (
    <div>
      <p>{language === 'de' ? 'Hallo' : 'Hello'}</p>
      <button onClick={() => updateLanguage('de')}>
        Switch to German
      </button>
    </div>
  );
}
```

---

## 📧 **Email Flow**

### **Signup Process:**
1. User fills out signup form
2. Language is detected automatically
3. User is created in Supabase
4. Custom email is sent in their language
5. User clicks confirmation link
6. Email is confirmed and user is redirected

### **Password Reset Process:**
1. User requests password reset
2. Language is detected automatically
3. Custom reset email is sent in their language
4. User clicks reset link
5. User is redirected to reset password page

---

## 🎨 **Customization**

### **Adding More Languages**

To add French, for example:

1. **Update the language type:**
   ```typescript
   // In useLanguage.ts
   type Language = 'en' | 'de' | 'fr';
   ```

2. **Add French templates:**
   ```typescript
   // In emailService.ts
   fr: {
     subject: 'Bienvenue chez UmmahFlow! Veuillez confirmer votre email',
     html: `<!-- French template -->`
   }
   ```

3. **Update the language switcher:**
   ```tsx
   <button onClick={() => updateLanguage('fr')}>FR</button>
   ```

### **Customizing Email Templates**

Edit the templates in `src/services/emailService.ts`:

- **Colors:** Change `#589D96` to your preferred color
- **Fonts:** Update the font-family in the style attributes
- **Layout:** Modify the HTML structure
- **Content:** Update the text content

---

## 🔍 **Testing**

### **Local Testing**

1. **Test with different browsers:**
   - Chrome (English)
   - Chrome with German language setting
   - Firefox (English)
   - Firefox with German language setting

2. **Test manual language switching:**
   ```javascript
   // In browser console
   localStorage.setItem('ummahflow-language', 'de');
   // Refresh page and test signup
   ```

3. **Test email delivery:**
   - Check spam folder
   - Verify links work correctly
   - Test on mobile devices

### **Production Testing**

1. **Deploy to production:**
   ```bash
   git add .
   git commit -m "Add multilingual email support"
   git push origin main
   ```

2. **Test on live site:**
   - Go to https://ummahflow.com
   - Test signup in both languages
   - Verify emails are received

---

## 🐛 **Troubleshooting**

### **Emails Not Sending**

1. **Check Resend API key:**
   - Verify it's correct in `.env.local`
   - Check it's not expired
   - Ensure it has sending permissions

2. **Check domain verification:**
   - Verify `ummahflow.com` is verified in Resend
   - Check DNS records are correct

3. **Check console errors:**
   - Look for error messages in browser console
   - Check server logs for errors

### **Language Not Detecting**

1. **Check browser language:**
   - Verify browser is set to German
   - Try manually setting: `localStorage.setItem('ummahflow-language', 'de')`

2. **Check localStorage:**
   - Open browser dev tools
   - Check Application → Local Storage
   - Look for `ummahflow-language` key

### **Email Templates Not Loading**

1. **Check file paths:**
   - Verify all files are in correct locations
   - Check for typos in import statements

2. **Check build process:**
   - Run `npm run build` to check for errors
   - Verify all TypeScript types are correct

---

## 📊 **Monitoring**

### **Resend Dashboard**

Monitor email delivery:
- **Emails sent** - Track volume
- **Delivery rates** - Monitor success
- **Bounces/Complaints** - Check for issues
- **Logs** - Debug problems

### **Supabase Dashboard**

Monitor user activity:
- **Auth logs** - See signup attempts
- **User management** - Manage accounts
- **Real-time** - Monitor active users

---

## 🎯 **Next Steps**

1. **Test thoroughly** in both languages
2. **Customize templates** if needed
3. **Add more email types** (magic link, email change, etc.)
4. **Monitor delivery** in Resend dashboard
5. **Add more languages** if needed

---

## 📚 **Files Created/Modified**

### **New Files:**
- `src/services/emailService.ts` - Email templates and sending
- `src/hooks/useLanguage.ts` - Language detection and switching
- `src/lib/auth.ts` - Custom auth functions with language support
- `src/app/auth/confirm/page.tsx` - Email confirmation page
- `src/components/LanguageSwitcher.tsx` - Language switcher component
- `src/components/auth/SignUpForm.tsx` - Multilingual signup form
- `src/components/auth/ResetPasswordForm.tsx` - Multilingual reset form

### **Modified Files:**
- `env.template` - Added new environment variables
- `package.json` - Added Resend dependency

---

## ✨ **Benefits**

✅ **Professional emails** in both languages  
✅ **Automatic language detection** from browser settings  
✅ **Manual language switching** for user preference  
✅ **Brand-consistent styling** matching your app  
✅ **Full control** over email content and timing  
✅ **Reliable delivery** via Resend  
✅ **Easy to extend** for more languages  

---

**Your multilingual email system is now ready!** 🌍🚀

Need help with any step? Check the troubleshooting section or contact support.
