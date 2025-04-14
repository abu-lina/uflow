interface WhiteBoxProps {
  children: React.ReactNode;
  className?: string;
}

export default function WhiteBox({ children, className = '' }: WhiteBoxProps) {
  return (
    <div className="relative w-[720px] h-[482px]">
      <div 
        className={`absolute left-[44.22px] top-[42.21px] w-[631.13px] h-[397.98px] rounded-[28.1397px] ${className}`}
      >
        <svg
          className="absolute inset-0 w-full h-full"
          width="634"
          height="401"
          viewBox="0 0 634 401"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M357.204 1.20898H604.431C619.972 1.20898 632.571 13.8076 632.571 29.3487V179.092V223.312V371.045C632.571 386.586 619.972 399.185 604.431 399.185H357.204M275.799 1.20898H29.5772C14.0361 1.20898 1.4375 13.8075 1.4375 29.3487V371.045C1.4375 386.586 14.0361 399.185 29.5772 399.185H275.799"
            stroke="white"
            strokeWidth="2.00998"
          />
        </svg>
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
} 