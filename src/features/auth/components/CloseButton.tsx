import Link from 'next/link';

import { X } from 'lucide-react';

export function CloseButton() {
  return (
    <Link
      className="absolute right-6 top-6 flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
      href="/"
    >
      <X className="size-4" />
    </Link>
  );
}
