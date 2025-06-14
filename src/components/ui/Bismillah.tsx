import { forwardRef, useEffect, useState } from 'react';

import { motion, useAnimation } from 'framer-motion';

import { cn } from '@/lib/utils';

interface BismillahProps extends React.SVGAttributes<SVGSVGElement> {
  className?: string;
  height?: number;
  width?: number;
  showTranslation?: boolean;
  shouldAnimate?: boolean;
}

const SVG_WIDTH = 390;
const SVG_HEIGHT = 70;
const TRANSLATION_TEXT = 'Im Namen Allahs des Allerbarmers, des Allbarmherzigen';

// Typewriter effect hook
function useTypewriter(text: string, speed = 40, shouldAnimate: boolean) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!shouldAnimate) {
      setDisplayed(text);
      return;
    }

    let i = 0;
    let cancelled = false;
    function type() {
      if (cancelled) return;
      setDisplayed(text.slice(0, i + 1));
      if (i < text.length - 1) {
        i++;
        setTimeout(type, speed);
      }
    }
    type();
    return () => {
      cancelled = true;
    };
  }, [text, speed, shouldAnimate]);
  return displayed;
}

const Bismillah = forwardRef<SVGSVGElement, BismillahProps>(
  ({ className, showTranslation = false, shouldAnimate = true, ...props }, ref) => {
    const controls = useAnimation();
    const [revealDone, setRevealDone] = useState(false);
    const [typeDone, setTypeDone] = useState(false);
    const [pulse, setPulse] = useState(false);
    const typewriter = useTypewriter(TRANSLATION_TEXT, 40, shouldAnimate);

    // Start reveal animation
    useEffect(() => {
      if (shouldAnimate) {
        controls
          .start({
            x: 0,
            width: SVG_WIDTH,
            transition: { delay: 0.2, duration: 3, ease: 'easeInOut' },
          })
          .then(() => setRevealDone(true));
      } else {
        controls.set({ x: 0, width: SVG_WIDTH }); // Ensure it's fully revealed if not animating
        setRevealDone(true);
      }
    }, [controls, shouldAnimate]);

    // Detect when typewriter is done
    useEffect(() => {
      if (typewriter.length === TRANSLATION_TEXT.length) {
        setTypeDone(true);
      }
    }, [typewriter]);

    // Pulse when both are done
    useEffect(() => {
      if (revealDone && typeDone) {
        setPulse(true);
        const timeout = setTimeout(() => setPulse(false), 600);
        return () => clearTimeout(timeout);
      }
    }, [revealDone, typeDone]);

    return (
      <div className={cn('flex flex-col items-center', className)}>
        <svg
          ref={ref}
          className={cn('text-foreground h-auto w-full', pulse && 'animate-pulse')}
          fill="none"
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          xmlns="http://www.w3.org/2000/svg"
          {...props}
        >
          <defs>
            <clipPath id="bismillah-reveal">
              <motion.rect
                animate={controls}
                fill="#fff"
                height={SVG_HEIGHT}
                initial={{ x: SVG_WIDTH, width: 0 }}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#bismillah-reveal)">
            <path
              d="M377.493 18.7609C381.274 20.2424 383.819 23.9806 385.432 27.6183C386.684 30.6274 387.491 33.6534 386.669 36.9089C386.145 38.1752 385.576 39.1787 384.315 39.7958C382.859 39.9846 381.621 39.9997 380.282 39.3694C380.112 39.2287 379.942 39.088 379.767 38.9431C379.69 39.1483 379.614 39.3535 379.536 39.5649C378.906 41.0562 378.384 41.9401 376.896 42.7172C376.023 43.0491 375.284 43.0266 374.366 42.9227C373.985 42.7375 373.605 42.5488 373.229 42.3541C372.297 42.4972 371.619 42.8952 370.812 43.3668C369.139 44.2058 367.682 44.3987 365.838 44.0597C364.901 43.6836 364.041 43.2538 363.164 42.755C362.242 42.2534 361.663 41.9948 360.615 42.2058C360.362 42.2862 360.109 42.3667 359.848 42.4496C359.553 42.54 359.258 42.6303 358.954 42.7233C358.628 42.8243 358.303 42.9252 357.968 43.0293C339.813 48.4047 320.671 50.619 301.845 51.9833C301.64 51.9982 301.435 52.0131 301.224 52.0284C293.962 52.553 286.704 52.903 279.424 53.0493C279.109 53.0557 278.794 53.0621 278.469 53.0686C270.385 53.2233 262.309 53.0679 254.227 52.8916C253.111 52.8683 251.995 52.8489 250.879 52.8303C233.631 52.5399 215.884 51.1241 199.091 47.0272C198.361 46.8931 197.729 46.8309 196.99 46.9022C196.808 47.1368 196.626 47.3713 196.439 47.6129C195.853 48.3235 195.853 48.3235 195.085 48.4212C193.974 48.3055 193.194 47.9613 192.193 47.4708C191.865 47.3125 191.538 47.1542 191.2 46.9911C190.953 46.868 190.706 46.7448 190.452 46.618C190.372 46.8793 190.292 47.1405 190.21 47.4097C189.299 49.9584 187.105 51.1619 184.767 52.3031C183.032 53.0155 181.539 53.5098 179.65 53.4401C179.65 53.1587 179.65 52.8773 179.65 52.5874C179.942 52.4496 180.234 52.3118 180.535 52.1699C185.724 49.7509 185.724 49.7509 189.315 45.481C189.475 44.5338 189.528 43.626 189.552 42.6662C189.625 41.2938 190.002 40.1719 190.783 39.0252C191.642 38.4216 192.272 38.5239 193.294 38.6588C194.002 39.1011 194.572 39.5079 195.195 40.0446C197.328 41.8131 199.014 42.3152 201.715 42.8694C202.078 42.9439 202.44 43.0184 202.814 43.0951C207.193 43.9782 211.608 44.6043 216.035 45.1967C216.347 45.2395 216.659 45.2824 216.98 45.3265C221.848 45.9857 226.737 46.3051 231.637 46.6176C232.033 46.643 232.033 46.643 232.437 46.6689C232.933 46.7005 233.429 46.7315 233.925 46.7618C235.038 46.8322 236.143 46.9209 237.25 47.0509C238.368 47.1805 239.475 47.2383 240.601 47.2665C240.79 47.2717 240.98 47.2769 241.175 47.2823C241.773 47.2988 242.37 47.3139 242.968 47.3286C247.338 47.4378 247.338 47.4378 249.366 47.6118C251.908 47.8219 254.454 47.8621 257.003 47.9149C257.28 47.9208 257.557 47.9268 257.843 47.9329C271.227 48.2114 284.618 48.1599 297.99 47.4885C298.208 47.4779 298.426 47.4672 298.651 47.4562C301.448 47.3169 304.218 47.0731 307 46.748C308.311 46.595 309.624 46.488 310.941 46.387C328.737 44.8999 346.113 41.7616 363.393 37.2903C364.586 36.9819 365.78 36.6818 366.975 36.3848C366.833 37.4464 366.726 38.037 366.122 38.9431C367.369 39.6449 368.413 39.6909 369.818 39.5116C371.674 38.9744 372.972 37.6458 374.337 36.3359C374.934 35.8162 374.934 35.8162 375.503 35.8162C375.409 36.6605 375.315 37.5047 375.218 38.3745C376.322 38.6172 377.032 38.7175 378.114 38.3568C379.637 37.3075 380.239 35.7725 380.904 34.1107C381.185 34.1107 381.466 34.1107 381.756 34.1107C381.956 34.398 382.155 34.6853 382.36 34.9812C382.702 35.4709 382.702 35.4709 383.178 35.8162C384.068 35.8836 384.871 35.7392 385.736 35.532C384.497 31.9917 382.812 27.3554 379.184 25.5827C378.527 25.2524 378.02 24.9608 377.493 24.446C377.213 23.4565 377.276 22.5328 377.35 21.5146C377.361 21.2498 377.371 20.9851 377.381 20.7123C377.408 20.0606 377.446 19.4114 377.493 18.7609Z"
              fill="#D2B581"
            />
          </g>
        </svg>
        {showTranslation && (
          <motion.span
            animate={false}
            aria-label={TRANSLATION_TEXT}
            className={cn(
              'mt-2 block text-center font-baskerville text-base text-content',
              pulse && 'animate-pulse',
            )}
            initial={false}
          >
            {shouldAnimate ? typewriter : TRANSLATION_TEXT}
          </motion.span>
        )}
      </div>
    );
  },
);

Bismillah.displayName = 'Bismillah';

export { Bismillah };
