'use client';

interface CreateIconProps {
  className?: string;
  isActive?: boolean;
}

export function CreateIcon({ className = '', isActive = false }: CreateIconProps) {
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: 48, height: 48 }}
    >
      {/* Active SVG */}
      <svg
        className="absolute inset-0 m-auto text-primary transition-opacity duration-150"
        fill="none"
        height="48"
        style={{ opacity: isActive ? 1 : 0 }}
        viewBox="0 0 49 48"
        width="49"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M25 17.2627V30.7364M18.2632 23.9995H31.7369"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
      {/* Inactive SVG */}
      <svg
        className="absolute inset-0 m-auto text-content-muted transition-opacity duration-150"
        fill="none"
        height="48"
        style={{ opacity: isActive ? 0 : 1 }}
        viewBox="0 0 49 48"
        width="49"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M25 17.2627V30.7364M18.2632 23.9995H31.7369"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.4"
        />
      </svg>
    </div>
  );
}
