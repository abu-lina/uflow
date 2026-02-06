interface PageIndicatorProps {
  activeIndex: number;
  count: number;
  className?: string;
}

export function PageIndicator({ activeIndex, count, className = '' }: PageIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
            index === activeIndex ? 'bg-primary' : 'bg-border'
          }`}
        />
      ))}
    </div>
  );
}
