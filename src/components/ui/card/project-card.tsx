import { HTMLAttributes, forwardRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { FilledButton } from '../button/filled';

// Simple inline SVG placeholder
const PlaceholderSvg = () => (
  <svg width="100%" height="100%" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
    <rect width="100%" height="100%" fill="#E5E7EB" />
    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="#6B7280" fontSize="8" fontWeight="bold">No Image</text>
  </svg>
);

interface ProjectCardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  imageSrc?: string | null; // Allow null to explicitly use placeholder
  progress?: number;
  goal?: number;
  raised?: number;
}

export const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(
  ({ 
    className, 
    title = "Zakat Project", 
    description = "Support our community initiatives",
    imageSrc = null, // Default to null to trigger placeholder
    progress = 0,
    goal = 1000,
    raised = 0,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md',
          className
        )}
        {...props}
      >
        <div className="relative h-48 w-full bg-gray-200"> { /* Added background for placeholder container */ }
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <PlaceholderSvg />
          )}
        </div>
        
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Raised: €{raised.toLocaleString()}</span>
              <span className="text-gray-600">Goal: €{goal.toLocaleString()}</span>
            </div>
            
            <div className="w-full h-2 bg-gray-200 rounded-full">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-2">
            <FilledButton className="flex-1">
              Donate Now
            </FilledButton>
            <FilledButton 
              variant="outline" 
              className="flex-1"
            >
              Learn More
            </FilledButton>
          </div>
        </div>
      </div>
    );
  }
);

ProjectCard.displayName = 'ProjectCard'; 