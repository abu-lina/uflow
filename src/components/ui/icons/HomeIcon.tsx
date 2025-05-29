'use client';

interface HomeIconProps {
  className?: string;
  isActive?: boolean;
}

export function HomeIcon({ className = '', isActive = false }: HomeIconProps) {
  const color = isActive ? '#589D96' : '#7A7A7A';
  return (
    <svg
      className={className}
      fill="none"
      height="40"
      viewBox="0 0 33 32"
      width="40"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 14.9051C8.60992 15.3783 7 16 7 16M12 14.0949C12 14.0949 13.6099 13.4732 15 13M17.5 13L20.5 14.0949M22.3419 14.7473L25.3419 15.8422"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 13.0448V23.1628C5 23.8577 5.45281 24.4746 6.12399 24.6941L15.9811 27.9174C16.318 28.0275 16.682 28.0275 17.0189 27.9174L26.876 24.6941C27.5472 24.4746 28 23.8577 28 23.1628V13.0448M5 13.0448V9.44161C5 8.77928 5.41193 8.18419 6.03893 7.94071L15.8961 4.113C16.2841 3.96233 16.7159 3.96233 17.1039 4.113L26.9611 7.94071C27.5881 8.18419 28 8.77928 28 9.44161V13.0448M5 13.0448L15.9522 9.23958C16.3066 9.11643 16.6934 9.11643 17.0478 9.23958L28 13.0448"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}
