'use client';

import Image from 'next/image';

interface OrigamiBirdIconProps {
  alt?: string;
  className?: string;
  height?: number;
  width?: number;
}

export function OrigamiBirdIcon({ 
  alt = 'Origami Bird Icon', 
  className = '', 
  height = 176, 
  width = 144 
}: OrigamiBirdIconProps) {
  return (
    <Image
      alt={alt}
      className={className}
      height={height}
      src="/images/origami-bird.png"
      width={width}
    />
  );
}
