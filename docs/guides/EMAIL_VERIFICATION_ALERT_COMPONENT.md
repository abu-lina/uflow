# EmailVerificationAlert Component

## 📋 Overview

A clean, accessible, and animated alert component specifically designed for displaying email verification warnings in the uFlow application. Built with Next.js, Tailwind CSS, and Framer Motion, fully integrated with the uFlow design system.

---

## ✨ Features

- ✅ **uFlow Design System**: Uses mint, warning, grey, and border colors from Tailwind config
- ✅ **Smooth Animation**: Fade-in + slide-up effect using Framer Motion
- ✅ **Accessible**: Includes `role="alert"` and `aria-live="assertive"`
- ✅ **Responsive**: Mobile-first design
- ✅ **Interactive**: Clickable "Resend" button with hover effects
- ✅ **Clean Typography**: Uses `font-inter-tight` and `text-sm`
- ✅ **Icon Integration**: Lucide `MailWarning` icon with warning color
- ✅ **Keyboard Navigation**: Focus-visible ring for accessibility

---

## 📁 File Location

```
src/components/ui/EmailVerificationAlert.tsx
```

---

## 🎨 Design Specifications

### Colors (from uFlow Tailwind config)
- **Background**: `warning-soft` (hsl(35, 100%, 95%) - soft amber)
- **Border**: `warning/20` (20% opacity warning)
- **Icon**: `text-warning/90` (90% opacity warning - hsl(35, 92%, 60%))
- **Text**: `text-content` (#555555)
- **Link**: `text-mint` (#589D96) with `hover:underline`
- **Dark Mode**: `dark:bg-warning/20` (fallback for dark mode)

### Spacing
- **Container padding**: `p-3` (12px)
- **Icon-text gap**: `gap-2` (8px)
- **Message-link gap**: `mt-1.5` (6px)
- **Border radius**: `rounded-md` (14px)

### Typography
- **Font family**: `font-inter-tight`
- **Font size**: `text-sm` (13px / 20px line-height)
- **Message**: Regular weight
- **Link**: Medium weight (`font-medium`)

### Animation
- **Initial state**: `opacity: 0, y: 8`
- **Animated state**: `opacity: 1, y: 0`
- **Duration**: `0.3s`
- **Easing**: `easeOut`

---

## 💻 Component API

### Props

```typescript
interface EmailVerificationAlertProps {
  message: string;      // The warning message to display
  onResend: () => void; // Callback when user clicks "Resend" button
}
```

### Example Usage

```tsx
import EmailVerificationAlert from '@/components/ui/EmailVerificationAlert';

function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isEmailConfirmationError, setIsEmailConfirmationError] = useState(false);

  const handleResendConfirmation = async () => {
    // Your resend logic here
    await fetch('/api/send-confirmation-email', {
      method: 'POST',
      body: JSON.stringify({ email: userEmail })
    });
  };

  return (
    <form>
      {/* Form fields... */}
      
      {error && isEmailConfirmationError && (
        <EmailVerificationAlert
          message={error}
          onResend={handleResendConfirmation}
        />
      )}
      
      {/* Submit button... */}
    </form>
  );
}
```

---

## 🔗 Integration

### Current Integration

The component is already integrated into the **LoginPageContent** component:

**Location**: `src/app/(public)/login/LoginPageContent.tsx`

**Usage**:
```tsx
{error && isEmailConfirmationError && (
  <div className="mt-4">
    <EmailVerificationAlert
      message={error}
      onResend={handleResendConfirmation}
    />
  </div>
)}
```

### Trigger Conditions

The alert appears when:
1. User attempts to log in
2. Email exists in database but is not confirmed
3. `EMAIL_NOT_CONFIRMED` error is returned from `signInWithEmailConfirmation`

---

## 🎬 User Flow

1. **User enters credentials** and clicks "Anmelden"
2. **System checks** email confirmation status via `/api/check-email-exists`
3. **If unconfirmed**, system returns `EMAIL_NOT_CONFIRMED` error
4. **Alert animates in** with message and resend button
5. **Toast notification** also appears for additional feedback
6. **User can click** "Bestätigungs-E-Mail erneut senden" to resend
7. **Email is sent** and success toast confirms action

---

## 🎯 Design Philosophy

### Why This Design?

1. **Soft Warning**: Uses `warning-soft` (hsl(35, 100%, 95%)) - a calm, low-saturation amber background instead of harsh colors
2. **Clear Action**: Resend button is prominent but not aggressive
3. **Visual Hierarchy**: Icon → Message → Action (top to bottom)
4. **Subtle Motion**: Animation draws attention without being jarring
5. **Brand Consistency**: Mint accent color maintains uFlow identity
6. **Reduced Intensity**: Icon at 90% opacity for softer visual impact
7. **Harmonious Border**: 20% opacity warning border creates subtle containment

### Compared to Previous Implementation

| Aspect | Before | After |
|--------|--------|-------|
| **Reusability** | Inline code | Reusable component |
| **Animation** | None | Smooth fade-in + slide |
| **Design** | Blue info box | Soft amber warning box (warning-soft) |
| **Color Harmony** | Harsh contrast | Calm, low-saturation amber |
| **Icon Intensity** | Full opacity | 90% opacity for softer look |
| **Border** | Hard grey | Subtle 20% warning opacity |
| **Spacing** | p-4 (16px) | p-3 (12px) - more compact |
| **Dark Mode** | Not considered | Fallback included |
| **Maintainability** | Duplicated code | Single source of truth |
| **Accessibility** | Basic | Full ARIA support |

---

## 📱 Responsive Behavior

- **Mobile (< 640px)**: Full width, vertical layout maintained
- **Tablet (640px+)**: Same layout, scales naturally
- **Desktop (1024px+)**: Constrained by form width

---

## ♿ Accessibility Features

- **ARIA Role**: `role="alert"` announces content to screen readers
- **Live Region**: `aria-live="assertive"` for immediate announcement
- **Icon Hiding**: `aria-hidden="true"` on decorative icon
- **Focus Visible**: Clear focus ring on resend button
- **Keyboard Nav**: Fully keyboard accessible
- **Semantic HTML**: Uses `<button>` for interactive element

---

## 🧪 Testing Recommendations

### Visual Regression Tests
```typescript
// Test component renders correctly
it('should render with message and resend button', () => {
  render(
    <EmailVerificationAlert
      message="Test message"
      onResend={jest.fn()}
    />
  );
  expect(screen.getByText('Test message')).toBeInTheDocument();
});

// Test animation
it('should animate on mount', () => {
  const { container } = render(
    <EmailVerificationAlert
      message="Test message"
      onResend={jest.fn()}
    />
  );
  expect(container.firstChild).toHaveAttribute('initial');
});

// Test click handler
it('should call onResend when button is clicked', () => {
  const handleResend = jest.fn();
  render(
    <EmailVerificationAlert
      message="Test message"
      onResend={handleResend}
    />
  );
  fireEvent.click(screen.getByText(/erneut senden/i));
  expect(handleResend).toHaveBeenCalledTimes(1);
});
```

---

## 🔄 Future Enhancements

### Potential Improvements
1. **Countdown Timer**: Show time until resend is available
2. **Success State**: Show success message after resend
3. **Loading State**: Disable button during resend
4. **Email Display**: Show which email address needs verification
5. **Dismissible**: Add close button (optional)
6. **Auto-hide**: Fade out after success (optional)

### Example: Loading State
```tsx
const [isSending, setIsSending] = useState(false);

const handleResend = async () => {
  setIsSending(true);
  await onResend();
  setIsSending(false);
};

// In component:
<button disabled={isSending}>
  {isSending ? 'Wird gesendet...' : 'Bestätigungs-E-Mail erneut senden'}
</button>
```

---

## 📚 Related Files

- **Component**: `src/components/ui/EmailVerificationAlert.tsx`
- **Usage**: `src/app/(public)/login/LoginPageContent.tsx`
- **Examples**: `src/components/ui/EmailVerificationAlert.example.tsx`
- **Auth Logic**: `src/lib/auth.ts`
- **API Check**: `src/app/api/check-email-exists/route.ts`
- **Design System**: `tailwind.config.ts`

---

## 🎨 Code Snippet

### Complete Component Code

```tsx
'use client';

import { motion } from 'framer-motion';
import { MailWarning } from 'lucide-react';

interface EmailVerificationAlertProps {
  message: string;
  onResend: () => void;
}

export default function EmailVerificationAlert({
  message,
  onResend,
}: EmailVerificationAlertProps) {
  return (
    <motion.div
      aria-live="assertive"
      className="w-full rounded-md border border-warning/20 bg-warning-soft p-3 shadow-sm dark:bg-warning/20"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      role="alert"
    >
      <div className="flex items-start gap-2">
        {/* Warning Icon */}
        <div className="flex-shrink-0 pt-0.5">
          <MailWarning className="h-5 w-5 text-warning/90" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col">
          {/* Message */}
          <p className="font-inter-tight text-sm leading-[19px] text-content">
            {message}
          </p>

          {/* Resend Link */}
          <button
            className="mt-1.5 w-fit font-inter-tight text-sm font-medium leading-[19px] text-mint hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-mint focus-visible:ring-offset-2"
            onClick={onResend}
            type="button"
          >
            Bestätigungs-E-Mail erneut senden
          </button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

## ✅ Best Practices Applied

- ✅ **Component Isolation**: Single responsibility
- ✅ **TypeScript**: Fully typed props
- ✅ **Accessibility**: WCAG 2.1 AA compliant
- ✅ **Design System**: Uses design tokens
- ✅ **Performance**: Minimal re-renders
- ✅ **Maintainability**: Clean, documented code
- ✅ **Reusability**: Works in any context
- ✅ **User Experience**: Smooth animations

---

## 📝 Notes

- The component uses Framer Motion, ensure it's installed: `npm install framer-motion`
- Lucide React is used for icons: `npm install lucide-react`
- The component is client-side only (`'use client'`)
- Designed to work seamlessly with uFlow's existing design system

---

**Created**: October 17, 2025  
**Version**: 1.0.0  
**Author**: uFlow Development Team  
**Status**: Production Ready ✅

