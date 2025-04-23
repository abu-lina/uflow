import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ProjectCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ className, title = "Zakat Project", description = "Support our community initiatives", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg shadow-sm p-6 space-y-4',
          className
        )}
        {...props}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    );
  }
);

ProjectCard.displayName = 'ProjectCard'; 