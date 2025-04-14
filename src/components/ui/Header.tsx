import Link from 'next/link';
import { Search, MapPin } from 'lucide-react';

export default function Header() {
  return (
    <header className="w-full border-b">
      <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left section - About Us */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600" />
          <div className="flex flex-col">
            <span className="text-sm">Über</span>
            <span className="text-sm">Uns</span>
          </div>
        </div>

        {/* Middle section - Categories and Search */}
        <div className="flex items-center gap-8">
          <Link href="/categories" className="text-gray-700 hover:text-emerald-600">
            Kategorien &gt;
          </Link>
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
            <Search className="w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="In Stuttgart suchen"
              className="bg-transparent border-none outline-none w-64"
            />
          </div>
        </div>

        {/* Right section - Auth */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
          </div>
          <Link href="/login" className="text-gray-700 hover:text-emerald-600">
            Anmelden
          </Link>
          <Link href="/register" className="text-gray-700 hover:text-emerald-600">
            Registrieren
          </Link>
        </div>
      </div>
    </header>
  );
} 