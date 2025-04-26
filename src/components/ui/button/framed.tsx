import { ButtonHTMLAttributes, forwardRef } from "react"
import { cn } from "@/lib/utils"

interface FramedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const FramedButton = forwardRef<HTMLButtonElement, FramedButtonProps>(
  ({ className, isLoading, leftIcon, rightIcon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex flex-row items-center",
          "w-[100px] h-10 px-[14px]",
          "border border-[#CDCDCD] rounded-[12px]",
          "bg-transparent",
          "flex-none order-0 flex-grow-0",
          "focus:outline-none focus:ring-0 focus-visible:outline-none",
          className
        )}
        disabled={isLoading}
        {...props}
      >
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        <span 
          className={cn(
            "w-[72px] h-[19px]",
            "font-['Inter_Tight'] text-base leading-[19px] font-medium",
            "flex items-center text-center",
            "text-[#232323]",
            "flex-none order-0 flex-grow-0"
          )}
        >
          {children}
        </span>
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    )
  }
)

FramedButton.displayName = "FramedButton"

export { FramedButton } 