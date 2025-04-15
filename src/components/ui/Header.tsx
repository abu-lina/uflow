'use client';

import { Menu, X, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import Logo from "./Logo";
import Link from 'next/link';
import { Button } from './button';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-200 ${isScrolled ? 'backdrop-blur-md bg-white/30' : 'bg-none'}`}>
      <nav className={`flex items-center justify-between h-[90px] px-20 border-b ${isScrolled ? 'border-gray-light/50' : 'border-transparent'}`}>
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <Logo width={48} height={48} />
          </Link>
          <Button
            variant="unframed"
            size="default"
            className="flex items-center text-[16px] font-medium ml-12"
            asChild
          >
            <Link href="/about">Über Uns</Link>
          </Button>
          <div className="relative ml-6">
            <Button 
              variant="unframed"
              size="default"
              className="flex items-center text-[16px] font-medium"
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            >
              Kategorien
              <svg 
                className={`ml-1 h-4 w-4 transition-transform ${isCategoriesOpen ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
            {isCategoriesOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                {['Lebensmittel', 'Mode', 'Dienstleistungen'].map((category) => (
                  <Button
                    key={category}
                    variant="unframed"
                    size="default"
                    className="w-full flex items-center px-4 text-[16px] text-gray-dark hover:text-primary"
                    asChild
                  >
                    <Link href={`/categories/${category.toLowerCase()}`}>
                      {category}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center">
          <div className="relative flex items-center gap-3">
            <div className="relative w-[640px]">
              <Button
                variant="search"
                size="search"
                className="w-full flex items-center justify-start pl-8 pr-7"
                asChild
              >
                <Link href="/search">
                  <span className="text-[16px] text-[#7A7A7A]">In Stuttgart suchen</span>
                </Link>
              </Button>
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#232323]" />
            </div>
            <Button 
              variant="location"
              size="location"
              className="w-12"
            >
              <svg width="32" height="32" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14.2525 18.9748L25.9125 13.4228C27.6125 12.6128 29.3865 14.3878 28.5775 16.0888L23.0255 27.7478C22.2665 29.3408 19.9665 29.2428 19.3465 27.5898L18.3205 24.8508C18.2203 24.5836 18.064 24.3409 17.8622 24.1391C17.6604 23.9373 17.4177 23.781 17.1505 23.6808L14.4105 22.6538C12.7585 22.0338 12.6595 19.7338 14.2525 18.9748Z" stroke="#232323" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
          </div>
        </div>

        <div className="flex items-center">
          {!isLoading && !user ? (
            <>
              <Button
                variant="framed"
                size="default"
                asChild
              >
                <Link href="/auth/login">Anmelden</Link>
              </Button>
              <Button
                variant="highlight"
                size="default"
                className="ml-6"
                asChild
              >
                <Link href="/auth/signup">Registrieren</Link>
              </Button>
            </>
          ) : (
            <Button
              variant="action"
              size="action"
              asChild
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          )}
        </div>

        <div className="md:hidden">
          <Button
            variant="unframed"
            size="default"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>
        </div>
      </nav>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Button
              variant="unframed"
              size="default"
              className="w-full text-left"
              asChild
            >
              <Link href="/about">Über Uns</Link>
            </Button>
            <Button 
              variant="unframed"
              size="default"
              className="w-full text-left"
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            >
              Kategorien
            </Button>
            {isCategoriesOpen && (
              <div className="pl-4 space-y-1">
                {['Lebensmittel', 'Mode', 'Dienstleistungen'].map((category) => (
                  <Button
                    key={category}
                    variant="unframed"
                    size="default"
                    className="w-full text-left"
                    asChild
                  >
                    <Link href={`/categories/${category.toLowerCase()}`}>
                      {category}
                    </Link>
                  </Button>
                ))}
              </div>
            )}
            {!isLoading && !user ? (
              <>
                <Button
                  variant="framed"
                  size="default"
                  className="w-full"
                  asChild
                >
                  <Link href="/auth/login">Anmelden</Link>
                </Button>
                <Button
                  variant="highlight"
                  size="default"
                  className="w-full mt-2"
                  asChild
                >
                  <Link href="/auth/signup">Registrieren</Link>
                </Button>
              </>
            ) : (
              <Button
                variant="action"
                size="action"
                className="w-full"
                asChild
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
} 