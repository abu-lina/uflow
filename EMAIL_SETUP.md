# Email Setup for ummahflow.com

This guide will help you set up professional email for your domain using Resend (transactional) and Cloudflare Email Routing (receiving).

## 🎯 **Overview**

**Setup:**
- **Resend** - Sending transactional emails (auth, notifications)
- **Cloudflare Email Routing** - Receiving emails (forwarding to your personal email)

**Benefits:**
- ✅ Free tier covers most needs
- ✅ Professional email addresses
- ✅ Excellent deliverability
- ✅ Easy Supabase integration
- ✅ No email server management

---

## 📧 **Part 1: Resend Setup (Sending Emails)**

### **Step 1: Create Resend Account**

1. Go to https://resend.com
2. Click "Sign Up" or "Get Started"
3. Sign up with GitHub (recommended) or email
4. Verify your email

### **Step 2: Add Your Domain**

1. In Resend Dashboard, click **"Domains"**
2. Click **"Add Domain"**
3. Enter: `ummahflow.com`
4. Click **"Add"**

### **Step 3: Configure DNS Records in Cloudflare**

Resend will show you 3 DNS records to add:

#### **Record 1: Domain Verification (TXT)**
```
Type: TXT
Name: @ (or leave blank for root domain)
Value: resend_verify_[your-verification-code]
TTL: Auto
```

#### **Record 2: DKIM Authentication (TXT)**
```
Type: TXT
Name: resend._domainkey
Value: [Long DKIM key provided by Resend]
TTL: Auto
```

#### **Record 3: SPF Record (TXT)**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
TTL: Auto
```

**How to add in Cloudflare:**
1. Go to Cloudflare Dashboard
2. Select your domain: `ummahflow.com`
3. Click **DNS** → **Records**
4. Click **Add record**
5. Add each record above
6. Click **Save**

### **Step 4: Verify Domain in Resend**

1. Wait 5-10 minutes for DNS propagation
2. In Resend Dashboard, click **"Verify"** next to your domain
3. Status should change to **"Verified"** ✅

### **Step 5: Get API Key**

1. In Resend Dashboard, click **"API Keys"**
2. Click **"Create API Key"**
3. Name: `UmmahFlow Production`
4. Permission: **"Sending access"**
5. Click **"Add"**
6. **Copy the API key** (you won't see it again!)
7. Store it securely

---

## 📬 **Part 2: Cloudflare Email Routing (Receiving Emails)**

### **Step 1: Enable Email Routing**

1. Go to Cloudflare Dashboard
2. Select your domain: `ummahflow.com`
3. Click **Email** → **Email Routing**
4. Click **"Get Started"** or **"Enable Email Routing"**

### **Step 2: Add Destination Email**

1. Click **"Destination addresses"**
2. Click **"Add destination address"**
3. Enter your personal email (e.g., `your-email@gmail.com`)
4. Click **"Send verification email"**
5. Check your email and click the verification link

### **Step 3: Create Custom Email Addresses**

Create forwarding rules for professional addresses:

1. Click **"Routing rules"**
2. Click **"Create address"**

**Recommended addresses:**

```
noreply@ummahflow.com → your-email@gmail.com
(For auth emails, no-reply notifications)

support@ummahflow.com → your-email@gmail.com
(For user support inquiries)

hello@ummahflow.com → your-email@gmail.com
(For general inquiries)

admin@ummahflow.com → your-email@gmail.com
(For admin notifications)
```

3. For each address:
   - Custom address: `noreply@ummahflow.com`
   - Action: **Forward to**
   - Destination: Select your verified email
   - Click **"Save"**

### **Step 4: Verify DNS Records**

Cloudflare automatically adds required DNS records:
- MX records (for receiving mail)
- TXT records (for SPF)

Check in **DNS** → **Records** to confirm they're added.

---

## 🔧 **Part 3: Integrate with Supabase**

### **Step 1: Configure Supabase SMTP**

1. Go to Supabase Dashboard
2. Select your project
3. Click **Settings** → **Auth**
4. Scroll to **SMTP Settings**
5. Click **"Enable Custom SMTP"**

### **Step 2: Enter Resend SMTP Details**

```
SMTP Host: smtp.resend.com
SMTP Port: 465 (SSL) or 587 (TLS)
SMTP Username: resend
SMTP Password: [Your Resend API Key]

Sender Email: noreply@ummahflow.com
Sender Name: UmmahFlow
```

### **Step 3: Test Email**

1. In Supabase Auth settings, click **"Send test email"**
2. Enter your email address
3. Click **"Send"**
4. Check your inbox for the test email

If successful, you'll see: ✅ **"Email sent successfully"**

---

## 🔐 **Part 4: Update Environment Variables**

Add these to your `.env.local` (if needed for custom email features):

```bash
# Resend API Key (for sending emails from your app)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Email addresses
EMAIL_FROM=noreply@ummahflow.com
EMAIL_SUPPORT=support@ummahflow.com
```

**Add to GitHub Secrets:**
1. GitHub Repository → Settings → Secrets and variables → Actions
2. Click **"New repository secret"**
3. Name: `RESEND_API_KEY`
4. Value: [Your Resend API Key]
5. Click **"Add secret"**

---

## 📊 **Part 5: Email Templates (Optional)**

### **Create Custom Auth Email Templates**

In Supabase Dashboard → Auth → Email Templates:

#### **Confirm Signup Template:**
```html
<h2>Welcome to UmmahFlow! 🎉</h2>
<p>Thank you for signing up. Please confirm your email address by clicking the button below:</p>
<a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
  Confirm Email
</a>
<p>If you didn't create an account, you can safely ignore this email.</p>
<p>Best regards,<br>The UmmahFlow Team</p>
```

#### **Reset Password Template:**
```html
<h2>Reset Your Password</h2>
<p>We received a request to reset your password. Click the button below to create a new password:</p>
<a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
  Reset Password
</a>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>Best regards,<br>The UmmahFlow Team</p>
```

---

## ✅ **Verification Checklist**

### **DNS Records (in Cloudflare):**
- [ ] Resend TXT verification record
- [ ] Resend DKIM record (resend._domainkey)
- [ ] SPF record for Resend
- [ ] MX records (auto-added by Cloudflare Email Routing)
- [ ] SPF record for Cloudflare (auto-added)

### **Resend:**
- [ ] Domain verified ✅
- [ ] API key created and saved
- [ ] Test email sent successfully

### **Cloudflare Email Routing:**
- [ ] Email routing enabled
- [ ] Destination email verified
- [ ] Custom addresses created (noreply, support, hello, admin)
- [ ] Test email received

### **Supabase:**
- [ ] Custom SMTP enabled
- [ ] Resend credentials configured
- [ ] Test email sent from Supabase
- [ ] Email templates customized (optional)

---

## 🧪 **Testing Your Setup**

### **Test 1: Send Email via Resend**

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "noreply@ummahflow.com",
    "to": "your-email@gmail.com",
    "subject": "Test Email from UmmahFlow",
    "html": "<p>This is a test email!</p>"
  }'
```

### **Test 2: Receive Email**

Send an email to `support@ummahflow.com` from your personal email and verify it forwards correctly.

### **Test 3: Auth Email**

1. Go to your app: https://ummahflow.com
2. Try to sign up with a new email
3. Check that you receive the confirmation email
4. Verify the email looks professional and works

---

## 📈 **Monitoring & Limits**

### **Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day
- All features included

### **When to Upgrade:**
- If you exceed 3,000 emails/month
- Need higher daily limits
- Want dedicated IP address

### **Monitoring:**
- Resend Dashboard shows email delivery stats
- Track opens, clicks, bounces
- View logs for debugging

---

## 🐛 **Troubleshooting**

### **Emails Not Sending:**
1. Check DNS records are properly configured
2. Verify domain in Resend is "Verified" ✅
3. Check API key is correct in Supabase
4. Look at Resend logs for errors
5. Check spam folder

### **Emails Going to Spam:**
1. Ensure SPF and DKIM records are set
2. Add DMARC record (optional but recommended):
   ```
   Type: TXT
   Name: _dmarc
   Value: v=DMARC1; p=none; rua=mailto:admin@ummahflow.com
   ```
3. Warm up your domain (send gradually increasing emails)
4. Avoid spam trigger words

### **Not Receiving Forwarded Emails:**
1. Check Cloudflare Email Routing is enabled
2. Verify destination email is confirmed
3. Check spam folder in destination email
4. Test with Cloudflare's test email feature

---

## 🔐 **Security Best Practices**

1. **Never commit API keys** to Git
2. **Use environment variables** for secrets
3. **Rotate API keys** periodically
4. **Monitor email logs** for suspicious activity
5. **Use different API keys** for dev/staging/production
6. **Enable 2FA** on Resend and Cloudflare accounts

---

## 💰 **Cost Breakdown**

| Service | Cost | What You Get |
|---------|------|--------------|
| **Resend** | Free | 3,000 emails/month, all features |
| **Cloudflare Email Routing** | Free | Unlimited forwarding |
| **Total** | **$0/month** | Professional email setup |

**If you need more:**
- Resend Pro: $20/month (50,000 emails)
- Google Workspace: $6/user/month (full Gmail)

---

## 📚 **Additional Resources**

- [Resend Documentation](https://resend.com/docs)
- [Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/)
- [Supabase SMTP Setup](https://supabase.com/docs/guides/auth/auth-smtp)
- [Email Deliverability Best Practices](https://resend.com/docs/knowledge-base/deliverability)

---

## 🎯 **Next Steps**

After setup:
1. ✅ Test all email flows (signup, reset password, notifications)
2. ✅ Customize email templates in Supabase
3. ✅ Monitor deliverability in Resend dashboard
4. ✅ Set up email notifications for your app
5. ✅ Consider adding DMARC for better deliverability

---

**Setup Time:** ~30 minutes  
**Difficulty:** Easy  
**Cost:** Free

Need help? Email support@ummahflow.com (once set up! 😄)

