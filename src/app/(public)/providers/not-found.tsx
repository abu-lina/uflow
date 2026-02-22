import Link from 'next/link';
import { Icon } from '@/components/ui/Icon';

/**
 * Not found page for providers section
 * Displays when a provider ID doesn't exist in the database
 */
export default function ProviderNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <Icon className="h-16 w-16 text-gray-400" icon="lucide:search" />
        </div>
        
        <h1 className="mb-2 text-3xl font-bold text-gray-900">
          Anbieter nicht gefunden
        </h1>
        
        <p className="mb-8 text-lg text-gray-600">
          Der gesuchte Anbieter existiert nicht oder wurde entfernt.
        </p>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2F4538] px-6 py-3 text-white transition-colors hover:bg-[#3d5847]"
            href="/providers"
          >
            <Icon className="h-5 w-5" icon="lucide:building-2" />
            Alle Anbieter durchsuchen
          </Link>
          
          <Link
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#2F4538] px-6 py-3 text-[#2F4538] transition-colors hover:bg-gray-50"
            href="/"
          >
            <Icon className="h-5 w-5" icon="lucide:home" />
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
