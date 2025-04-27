import { forwardRef } from 'react';

import { Search, Menu, MapPin } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SearchBarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'simple' | 'advanced';
  placeholder?: string;
  showCategory?: boolean;
  showLocation?: boolean;
}

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  (
    {
      className,
      variant = 'simple',
      placeholder = 'In deiner Ummah suchen',
      showCategory = true,
      showLocation = true,
      ...props
    },
    ref
  ) => {
    if (variant === 'simple') {
      return (
        <div ref={ref} className={cn('relative flex items-center', className)} {...props}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm',
              'ring-offset-background placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            placeholder={placeholder}
            type="text"
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'mx-auto flex flex-row items-center gap-4 px-2',
          'h-10 w-[640px]',
          'rounded-[12px] bg-white',
          'order-1 flex-none flex-grow-0',
          'focus-within:outline-none focus:outline-none',
          className
        )}
        {...props}
      >
        {/* Search Icon and Input */}
        <div className="flex flex-1 items-center gap-4">
          <Search className="h-6 w-6 text-[#232323]" />
          <input
            className="flex-1 border-none bg-transparent text-base leading-[19px] text-[#7C7C7C] outline-none ring-0 placeholder:text-[#7C7C7C] focus:outline-none focus:ring-0"
            placeholder={placeholder}
            type="text"
          />
        </div>

        {showCategory && (
          <>
            {/* Divider */}
            <div className="h-6 w-px bg-[#232323]/20" />

            {/* Category Dropdown */}
            <div className="flex items-center gap-4">
              <Menu className="h-6 w-6 text-[#232323]" />
              <span className="text-base leading-[19px] text-[#232323]">Alle</span>
            </div>
          </>
        )}

        {showLocation && (
          <>
            {/* Divider */}
            <div className="h-6 w-px bg-[#232323]/20" />

            {/* Location Dropdown */}
            <div className="flex items-center gap-4">
              <MapPin className="h-6 w-6 text-[#232323]" />
              <span className="text-base leading-[19px] text-[#232323]">Deutschland</span>
            </div>
          </>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
