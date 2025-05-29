'use client';

import { usePathname } from 'next/navigation';
import { MobileLayoutWrapper } from '@/components/layout/MobileLayoutWrapper';

export function RootClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/landing';

  return isLanding ? <>{children}</> : <MobileLayoutWrapper>{children}</MobileLayoutWrapper>;
}
