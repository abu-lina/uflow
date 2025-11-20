'use client';

import { motion, AnimatePresence } from 'motion/react';

import { AnimatedHeartIcon } from '@/components/ui/AnimatedHeartIcon';
import { BarikButton } from '@/components/ui/BarikButton';
import { COLORS, COLORS_RGBA } from '@/constants/colors';
import { usePressedState } from '@/hooks/usePressedState';

export type BookmarkButtonState = 'idle' | 'loading' | 'saved' | 'barik';

interface BookmarkButtonProps {
  state: BookmarkButtonState;
  isHovered?: boolean;
  wasBookmarked?: boolean;
  savedText?: string;
  saveText?: string;
  onClick?: (e?: React.MouseEvent) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  shouldAnimateFill?: boolean; // Trigger fill animation on user interaction
  isTransiting?: boolean; // Whether we're in a transition (barik/loading), not just saved
  className?: string;
}

/**
 * Reusable bookmark button component
 * Handles three states: Save (idle), Allahuma Barik (barik), and Saved (saved)
 */
export function BookmarkButton({
  state,
  isHovered = false,
  wasBookmarked = false,
  savedText = 'Saved',
  saveText = 'Save',
  onClick,
  onHoverStart,
  onHoverEnd,
  shouldAnimateFill = false,
  isTransiting: _isTransiting = false, // Reserved for future use
  className = '',
}: BookmarkButtonProps) {
  const { isPressed, ...pressedHandlers } = usePressedState();

  return (
    <div 
      className={`relative flex-1 h-12 ${className}`}
      style={{
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
      }}
    >
      <motion.div
        className="size-full cursor-pointer relative"
        style={{
          pointerEvents: state === 'loading' ? 'none' : 'auto',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
        transition={{ duration: 0.15 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        onHoverEnd={onHoverEnd}
        onHoverStart={onHoverStart}
        {...pressedHandlers}
      >
        {/* Pressed state overlay */}
        <motion.div
          animate={{ opacity: isPressed ? 0.7 : 0 }}
          className="absolute inset-0 z-10 pointer-events-none"
          style={{
            background: COLORS.mintPressed,
            borderRadius: state === 'saved' ? '9.6px' : '12px',
            WebkitTransform: 'translateZ(0)',
            transform: 'translateZ(0)',
            WebkitBackfaceVisibility: 'hidden',
            backfaceVisibility: 'hidden',
          }}
          transition={{ duration: 0.1 }}
        />

        {state === 'barik' ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="barik"
              animate={{ scale: 1 }}
              className="size-full"
              exit={{ opacity: 0, scale: 1.02 }}
              initial={{ scale: 0.98 }}
              style={{ opacity: 1 }}
              transition={{
                duration: 0.5,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <BarikButton />
            </motion.div>
          </AnimatePresence>
        ) : state === 'loading' ? (
          <motion.div
            key="loading"
            animate={{ opacity: [0.5, 1, 0.5] }}
            className="flex h-full items-center justify-center gap-1.5 px-4"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <span className="text-base font-medium text-white">...</span>
          </motion.div>
        ) : state === 'saved' ? (
          <div
            className="size-full"
            style={{
              WebkitTapHighlightColor: 'transparent',
              WebkitTouchCallout: 'none',
            }}
          >
              <div 
                className="relative rounded-[9.6px] size-full overflow-hidden"
                style={{
                  backgroundColor: COLORS.mintPressed,
                  isolation: 'isolate',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  WebkitMaskImage: '-webkit-radial-gradient(white, white)',
                  maskImage: 'radial-gradient(white, white)',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: COLORS.mintPressed,
                    borderRadius: '9.6px',
                    opacity: 1,
                  }}
                />
                <div
                  className="relative size-full"
                  style={{
                    boxShadow: isHovered
                      ? `0 2px 8px ${COLORS_RGBA.mint.shadowHover}`
                      : `0 1px 4px ${COLORS_RGBA.mint.shadow}`,
                  }}
                >
                  <div className="flex flex-row items-center justify-center size-full">
                    <div
                      className="box-border content-stretch flex gap-[4.8px] items-center justify-center overflow-clip px-[16px] py-0 relative size-full"
                    >
                      <AnimatedHeartIcon 
                        animate={false}
                        animateFill={shouldAnimateFill}
                        className=""
                        filled={true}
                        size={24}
                        useFigmaPath={true}
                      />
                      <div
                        className="flex flex-col font-inter-tight font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white"
                      >
                        <p className="leading-[normal] whitespace-pre">{savedText}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <motion.div
              key="idle"
              animate={{ opacity: 1, scale: 1 }}
              className="size-full"
              exit={{ opacity: 0, scale: 0.97, zIndex: 0 }}
              initial={false}
              style={{ 
                zIndex: 1,
                WebkitTransform: 'translateZ(0)',
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div 
                className="relative rounded-[9.6px] size-full overflow-hidden"
                style={{
                  WebkitTransform: 'translateZ(0)',
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  WebkitMaskImage: '-webkit-radial-gradient(white, white)',
                  maskImage: 'radial-gradient(white, white)',
                  isolation: 'isolate',
                  WebkitBackfaceVisibility: 'hidden',
                  backfaceVisibility: 'hidden',
                }}
              >
                <motion.div
                  animate={{
                    opacity: 1,
                  }}
                  className="absolute inset-0"
                  style={{
                    background: COLORS.mint,
                    borderRadius: '9.6px',
                    WebkitTransform: 'translateZ(0)',
                    transform: 'translateZ(0)',
                  }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                />
                <motion.div
                  animate={{
                    boxShadow: isHovered
                      ? `0 2px 8px ${COLORS_RGBA.mintOld.shadowHover}`
                      : `0 1px 4px ${COLORS_RGBA.mintOld.shadow}`,
                  }}
                  className="relative size-full"
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-row items-center justify-center size-full">
                    <div
                      className="box-border content-stretch flex gap-[4.8px] items-center justify-center overflow-clip px-[16px] py-0 relative size-full"
                    >
                      <AnimatedHeartIcon
                        animate={wasBookmarked}
                        filled={false}
                        size={24}
                        useFigmaPath={true}
                      />
                      <div
                        className="flex flex-col font-inter-tight font-medium justify-center leading-[0] relative shrink-0 text-[16px] text-center text-nowrap text-white"
                      >
                        <p className="leading-[normal] whitespace-pre">{saveText}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
      </motion.div>
    </div>
  );
}

