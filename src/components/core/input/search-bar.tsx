import { Search, Menu, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface SearchBarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export const SearchBar = forwardRef<HTMLDivElement, SearchBarProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-row items-center px-2 gap-4 mx-auto",
          "w-[640px] h-10",
          "bg-white rounded-[12px]",
          "flex-none order-1 flex-grow-0",
          "focus-within:outline-none focus:outline-none",
          className
        )}
        {...props}
      >
        {/* Search Icon and Input */}
        <div className="flex items-center gap-4 flex-1">
          <Search className="w-6 h-6 text-[#232323]" />
          <input
            type="text"
            placeholder="In deiner Ummah suchen"
            className="flex-1 text-base leading-[19px] text-[#7C7C7C] placeholder:text-[#7C7C7C] bg-transparent border-none outline-none ring-0 focus:ring-0 focus:outline-none"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#232323]/20" />

        {/* Category Dropdown */}
        <div className="flex items-center gap-4">
          <Menu className="w-6 h-6 text-[#232323]" />
          <span className="text-base leading-[19px] text-[#232323]">Alle</span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-[#232323]/20" />

        {/* Location Dropdown */}
        <div className="flex items-center gap-4">
          <MapPin className="w-6 h-6 text-[#232323]" />
          <span className="text-base leading-[19px] text-[#232323]">Deutschland</span>
        </div>
      </div>
    )
  }
)

SearchBar.displayName = "SearchBar" 