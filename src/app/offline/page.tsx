import { APP_CONFIG } from '@/config/constants/app';
import { offlineMetadata } from '@/config/metadata';

export const metadata = offlineMetadata;

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-4xl font-bold">You&apos;re Offline</h1>
      <p className="mb-8 text-center text-gray-600">
        {APP_CONFIG.name} requires an internet connection. Please check your connection and try
        again.
      </p>
      <button
        className="rounded-lg bg-primary px-6 py-2 text-white hover:bg-primary/90"
        onClick={() => window.location.reload()}
      >
        Try Again
      </button>
    </div>
  );
}
