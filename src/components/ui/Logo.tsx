import Image from 'next/image';

interface LogoProps {
  className?: string;
  height?: number;
  width?: number;
}

export function Logo({ className = '', height = 32, width = 32 }: LogoProps) {
  return (
    <Image
      alt="U-Flow Logo"
      className={className}
      height={height}
      priority={true}
      quality={95}
      src="/icons/icon-round-512.png"
      width={width}
    />
  );
}