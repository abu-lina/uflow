import { useRef, useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';

import { OrnamentIcon } from '@/components/ui/OrnamentIcon';

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  label: string;
  size?: 'lg' | 'md';
  onAnimationComplete?: () => void;
}

export function ActionButton({
  className = '',
  label,
  size = 'lg',
  type = 'button',
  onAnimationComplete,
  ...props
}: ActionButtonProps) {
  // Size variants following Rule of 8
  const sizeClasses = {
    lg: {
      button: 'h-14 px-4 gap-2 rounded-[16.8px] text-xl',
      icon: 'size-6',
    },
    md: {
      button: 'h-12 px-4 gap-2 rounded-[14px] text-lg',
      icon: 'size-5',
    },
  };

  // Bismillah animation state (only for the special CTA)
  const isBismillahCTA = label === 'Entdecke deine Ummah';
  const [active, setActive] = useState(false);
  const [ariaText, setAriaText] = useState(label);
  const timeoutRef = useRef<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [fixedWidth, setFixedWidth] = useState<number | undefined>(undefined);

  const handleTap = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isBismillahCTA) return props.onClick?.(e);
    if (active) return; // Debounce
    if (buttonRef.current) {
      setFixedWidth(buttonRef.current.offsetWidth);
    }
    setActive(true);
    setAriaText('Bismillah');
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    timeoutRef.current = window.setTimeout(() => {
      setActive(false);
      setAriaText(label);
      props.onClick?.(e);
      if (onAnimationComplete) onAnimationComplete();
    }, 900);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isBismillahCTA && buttonRef.current && !fixedWidth) {
      setFixedWidth(buttonRef.current.offsetWidth);
    }
  }, [isBismillahCTA, fixedWidth]);

  if (isBismillahCTA) {
    return (
      <button
        ref={buttonRef}
        aria-label={ariaText}
        aria-live="polite"
        className={`
          inline-flex items-center justify-center
          ${active ? 'border border-[#D2B581] bg-white' : 'bg-primary'}
          font-medium
          ${active ? 'bg-gold-gradient bg-clip-text text-transparent' : 'text-white'}
          transition-colors duration-200
          hover:bg-primary-dark
          focus:outline-none focus:ring-2 ${active ? 'focus:ring-[#D2B581]' : 'focus:ring-primary'} focus:ring-offset-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${sizeClasses[size].button}
          ${className}
          growth-effect
        `.trim()}
        style={fixedWidth ? { width: fixedWidth } : undefined}
        type={type}
        onClick={handleTap}
        {...props}
      >
        <span className="sr-only">{ariaText}</span>
        <AnimatePresence initial={false} mode="wait">
          {!active ? (
            <motion.span
              key="cta"
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 whitespace-nowrap"
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
              initial={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              Entdecke deine Ummah
              <OrnamentIcon
                aria-hidden="true"
                className={`${active ? 'text-[#D2B581]' : 'text-white'} ${sizeClasses[size].icon}`}
              />
            </motion.span>
          ) : (
            <motion.span
              key="bismillah"
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 whitespace-nowrap"
              exit={{ opacity: 0, scale: 1.1, transition: { duration: 0.2 } }}
              initial={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <span className="bg-gold-gradient bg-clip-text font-inter-tight text-xl text-transparent">
                Bismillah
              </span>
              <OrnamentIcon
                aria-hidden="true"
                className={`text-[#D2B581] ${sizeClasses[size].icon}`}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }

  return (
    <button
      aria-label={label}
      className={`
        inline-flex items-center justify-center
        bg-primary font-medium
        text-white
        transition-colors duration-200
        hover:bg-primary-dark
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${sizeClasses[size].button}
        ${className}
        growth-effect
      `.trim()}
      type={type}
      onClick={handleTap}
      {...props}
    >
      <span>{label}</span>
      <OrnamentIcon aria-hidden="true" className={`text-white ${sizeClasses[size].icon}`} />
    </button>
  );
}

ActionButton.displayName = 'ActionButton';
