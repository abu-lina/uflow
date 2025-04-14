'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function Header() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isKategorienOpen, setIsKategorienOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  return (
    <header className="w-full border-b bg-transparent">
      <nav className="flex items-center justify-between px-4 py-3 md:px-12">
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center">
            <Image
              src="/placeholder.svg?height=40&width=40"
              alt="Ummah Flow Logo"
              width={40}
              height={40}
              className="text-primary"
            />
          </Link>
          <Link href="/about" className="text-sm font-medium text-gray-dark hover:text-primary transition-colors">
            Über Uns
          </Link>
          <div className="relative">
            <button 
              className="flex items-center text-sm font-medium text-gray-dark hover:text-primary transition-colors"
              onClick={() => setIsKategorienOpen(!isKategorienOpen)}
            >
              Kategorien
              <svg
                className={`ml-1 h-4 w-4 transition-transform ${isKategorienOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isKategorienOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                <Link href="/categories/food" className="block px-4 py-2 text-sm text-gray-dark hover:bg-gray-50">
                  Lebensmittel
                </Link>
                <Link href="/categories/fashion" className="block px-4 py-2 text-sm text-gray-dark hover:bg-gray-50">
                  Mode
                </Link>
                <Link href="/categories/services" className="block px-4 py-2 text-sm text-gray-dark hover:bg-gray-50">
                  Dienstleistungen
                </Link>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative flex w-full max-w-md items-center mx-4">
          <input
            type="text"
            placeholder="In Stuttgart suchen"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-gray-light bg-white py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-colors"
          />
          <svg
            className="absolute left-3 h-5 w-5 text-gray-medium"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <button type="button" className="absolute right-3 hover:text-primary transition-colors">
            <svg
              className="h-5 w-5 text-gray-medium"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </form>

        <div className="flex items-center space-x-3">
          <Link href="/favorites" className="rounded-full p-2 hover:text-primary transition-colors">
            <svg
              className="h-5 w-5 text-gray-dark"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </Link>
          {user ? (
            <Link 
              href="/profile" 
              className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
            >
              {user.email}
            </Link>
          ) : (
            <>
              <Link 
                href="/auth/login" 
                className="rounded-md border border-gray-light px-4 py-1.5 text-sm font-medium text-gray-dark hover:border-primary hover:text-primary transition-colors"
              >
                Anmelden
              </Link>
              <Link 
                href="/auth/signup"
                className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                Registrieren
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
} 