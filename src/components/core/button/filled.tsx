import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface FilledButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const FilledButton = forwardRef<HTMLButtonElement, FilledButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-2 rounded-[12px]",
          "bg-[#589D96]",
          "focus:outline-none",
          {
            "h-6 px-4 text-sm": size === "sm",
            "h-10 px-[14px] text-base": size === "md",
            "h-14 px-5 text-lg": size === "lg",
          },
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        <span className="w-[85px] h-[19px] flex items-center justify-center font-['Inter_Tight'] text-base leading-[19px] font-medium text-white">
          {children}
        </span>
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

FilledButton.displayName = "FilledButton"

export { FilledButton } 