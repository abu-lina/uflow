import Link from 'next/link';

import { X } from 'lucide-react';

export function CloseButton() {
  return (
    <Link
      className="absolute right-6 top-6 flex size-8 items-center justify-center rounded-full bg-neutral-100 text-content-muted transition-colors hover:bg-neutral-200"
      href="/"
    >
      <X className="size-4" />
    </Link>
  );
}
