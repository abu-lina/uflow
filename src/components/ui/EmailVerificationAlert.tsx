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
      animate={{ opacity: 1, y: 0 }}
      aria-live="assertive"
      className="w-full rounded-md border border-warning/20 bg-warning-soft p-3 shadow-sm dark:bg-warning/20"
      initial={{ opacity: 0, y: 8 }}
      role="alert"
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <div className="flex items-start gap-2">
        {/* Warning Icon */}
        <div className="flex-shrink-0 pt-0.5">
          <MailWarning aria-hidden="true" className="h-5 w-5 text-warning/90" />
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
            type="button"
            onClick={onResend}
          >
            Bestätigungs-E-Mail erneut senden
          </button>
        </div>
      </div>
    </motion.div>
  );
}

