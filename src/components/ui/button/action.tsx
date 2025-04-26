import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"
import { ButtonHTMLAttributes, forwardRef } from "react"

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-2 font-medium transition-colors",
          {
            "h-6 px-4 text-sm rounded-[7.4px]": size === "sm",
            "h-10 px-5 text-base rounded-[12px]": size === "md",
            "h-14 px-5 text-lg rounded-[16.8px]": size === "lg",
          },
          {
            "bg-[#589D96] text-white hover:bg-[#589D96]/90": variant === "primary",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === "secondary",
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
            "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
          },
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
        {!rightIcon && <ChevronRight className="ml-2 h-5 w-5" />}
      </button>
    )
  }
)

ActionButton.displayName = "ActionButton"

export { ActionButton } 