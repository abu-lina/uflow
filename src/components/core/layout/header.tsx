'use client';

import { Menu, MapPin, ChevronDown } from 'lucide-react';
import { useState, useEffect, HTMLAttributes, forwardRef } from 'react';
import Logo from "@/components/core/visuals/logo";
import { ButtonLink, FramedButton, FilledButton } from "@/components/core/button";
import { SearchBar } from "@/components/core/input";
import { cn } from "@/lib";

interface HeaderBaseProps extends HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'transparent';
}

const Header = forwardRef<HTMLElement, HeaderBaseProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
      const controlHeader = () => {
        const currentScrollY = window.scrollY;
        
        // Update visibility
        if (currentScrollY < lastScrollY || currentScrollY < 10) {
          setIsVisible(true);
        } 
        else if (currentScrollY > 10 && currentScrollY > lastScrollY) {
          setIsVisible(false);
        }

        // Update scroll state
        setIsScrolled(currentScrollY > 10);
        setLastScrollY(currentScrollY);
      };

      const handleScroll = () => {
        window.requestAnimationFrame(controlHeader);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return (
      <header
        ref={ref}
        className={cn(
          'fixed top-0 left-0 right-0 w-full z-50',
          'transition-all duration-300 ease-in-out',
          {
            'translate-y-0': isVisible,
            '-translate-y-full': !isVisible,
          },
          className
        )}
      >
        {/* Background */}
        <div 
          className={cn(
            "absolute inset-0 z-0",
            "transition-colors duration-300 ease-in-out",
            {
              'bg-transparent': !isScrolled || lastScrollY === 0,
              'bg-background/70': isScrolled && lastScrollY > 0,
            }
          )}
        />
        
        {/* Content Container */}
        <div className="relative z-10">
          {/* Content */}
          <div className="container max-w-[1280px] h-[72px] flex items-center justify-between mx-auto px-4">
            {/* Left Section */}
            <div className="flex items-center gap-16">
              <Logo width={32} height={32} />
              <ButtonLink href="/about">
                Über uns
              </ButtonLink>
            </div>

            {/* Center Section - Search Bar */}
            <div className="flex-1 max-w-[640px]">
              <SearchBar />
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              <FramedButton>
                Anmelden
              </FramedButton>
              <FilledButton>
                Registrieren
              </FilledButton>
            </div>
          </div>
        </div>
      </header>
    );
  }
);

Header.displayName = 'Header';

export default Header; 