'use client';

import { useEffect, useState } from 'react';

import dynamic from 'next/dynamic';

const IconifyIcon = dynamic(() => import('@iconify/react').then((mod) => mod.Icon), {
  ssr: false,
});

interface IconProps {
  icon: string;
  className?: string;
  width?: number | string;
  height?: number | string;
}

export function Icon({ icon, className, width, height }: IconProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <IconifyIcon className={className} height={height} icon={icon} width={width} />;
}
