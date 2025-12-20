'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/Button';

interface WaitlistSuccessScreenProps {
  onContinue: () => void;
  autoDismiss?: boolean;
  autoDismissDelay?: number;
}

export function WaitlistSuccessScreen({ 
  onContinue, 
  autoDismiss = false,
  autoDismissDelay = 5000 
}: WaitlistSuccessScreenProps) {
  
  // Auto-dismiss after delay if enabled
  useEffect(() => {
    if (autoDismiss) {
      const timer = setTimeout(() => {
        onContinue();
      }, autoDismissDelay);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissDelay, onContinue]);

  return (
    <div className="flex h-screen w-full items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="flex w-full max-w-md flex-col items-center gap-8"
        initial={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Success Icon */}
        <motion.div
          animate={{ scale: 1, opacity: 1 }}
          className="flex size-20 items-center justify-center rounded-full bg-primary/10"
          initial={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        >
          <Icon 
            className="size-10 text-primary" 
            icon="material-symbols:check-circle-rounded" 
          />
        </motion.div>

        {/* Heading */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
        >
          <h1 className="font-inter-tight text-3xl font-semibold leading-tight text-content-heading sm:text-4xl">
            You&apos;re on the list!
          </h1>
          <p className="font-inter text-base leading-normal text-content sm:text-lg">
            Check your email for confirmation
          </p>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-col items-center gap-4 rounded-2xl bg-neutral-muted px-6 py-4"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.4, ease: 'easeOut' }}
        >
          <p className="text-center font-inter text-sm leading-relaxed text-content">
            We&apos;ll notify you as soon as we launch. In the meantime, feel free to share UmmahFlow with others who might benefit from our platform.
          </p>
        </motion.div>

        {/* Continue Button */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
        >
          <Button
            fullWidth
            aria-label="Continue to app"
            size="lg"
            variant="primary"
            onClick={onContinue}
          >
            Continue
          </Button>
        </motion.div>

        {/* Auto-dismiss indicator */}
        {autoDismiss && (
          <motion.p
            animate={{ opacity: 1 }}
            className="text-center font-inter text-xs text-content-muted"
            initial={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            Continuing automatically in {autoDismissDelay / 1000} seconds...
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

