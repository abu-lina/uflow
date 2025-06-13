'use client';

interface ExploreIconProps {
  className?: string;
  isActive?: boolean;
  height?: number;
  width?: number;
}

export function ExploreIcon({
  className = '',
  isActive = false,
  height = 32,
  width = 32,
}: ExploreIconProps) {
  const color = isActive ? '#589D96' : '#7A7A7A';
  return (
    <svg
      className={className}
      fill="none"
      height={height}
      viewBox="0 0 32 32"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" fillRule="evenodd">
        <path d="m16.79 30.01-.015.003-.095.047-.027.005-.019-.005-.095-.047q-.021-.007-.032.007l-.005.013-.023.573.007.027.013.017.14.1.02.005.017-.005.14-.1.016-.021.005-.022-.023-.572q-.005-.021-.023-.024m.353-.151l-.018.003-.25.125-.013.013-.004.015.025.573.007.016.011.009.272.126q.026.007.04-.01l.005-.019-.046-.818q-.007-.024-.029-.03m-.967.003a.027.027 0 0 0-.037.008l-.008.019-.046.818q.002.024.023.032l.02-.003.272-.126.013-.01.005-.015.025-.573-.004-.016-.013-.013z" />
        <path
          d="M14 4a10 10 0 1 0 6.191 17.848l4.87 4.87a1 1 0 0 0 1.415-1.415l-4.87-4.87A10 10 0 0 0 14 4m-8 10a8 8 0 1 1 16 0a8 8 0 0 1-16 0"
          fill={color}
        />
      </g>
    </svg>
  );
}
