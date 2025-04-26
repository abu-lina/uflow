import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface QuoteCardProps extends HTMLAttributes<HTMLDivElement> {}

export function QuoteCard({ className, ...props }: QuoteCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-dark p-8 text-primary-foreground shadow-lg",
        className
      )}
      {...props}
    >
      <blockquote className="space-y-2">
        <p className="text-lg font-medium leading-relaxed">
          &ldquo;Handel ist ein Segen, wenn er auf Vertrauen und Ehrlichkeit basiert.&rdquo;
        </p>
        <footer className="text-sm">
          - Prophet Muhammad (ﷺ)
        </footer>
      </blockquote>
    </div>
  )
} 