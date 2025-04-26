import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface FormErrorProps extends HTMLAttributes<HTMLParagraphElement> {}

export function FormError({ className, children, ...props }: FormErrorProps) {
  return (
    <p
      className={cn("text-sm font-medium text-red-500", className)}
      {...props}
    >
      {children}
    </p>
  )
} 