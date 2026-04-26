import type { SVGProps } from 'react';

// Prayer Rug icon © 2024 Halal Labs (Hugeicons) — MIT License https://github.com/hugeicons/hugeicons-react/blob/main/LICENSE.md
export function PrayerRug(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6 20V9.5C6 8.67 6.67 8 7.5 8h9c.83 0 1.5.67 1.5 1.5V20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M12 8V5.75M12 5.75c-.84 0-1.52.68-1.52 1.52M12 5.75c.84 0 1.52.68 1.52 1.52"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M8.25 12.5h7.5M8.25 15.75h7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
      <path
        d="M4.75 20H19.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
