import { HTMLAttributes, forwardRef } from 'react';

import Image from 'next/image';

import { cn } from '@/lib/utils';

import { FilledButton } from '../button/filled';

// Simple inline SVG placeholder
const PlaceholderSvg = () => (
  <svg
    fill="none"
    height="100%"
    preserveAspectRatio="none"
    viewBox="0 0 100 50"
    width="100%"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect fill="#E5E7EB" height="100%" width="100%" />
    <text
      dominantBaseline="middle"
      fill="#6B7280"
      fontSize="8"
      fontWeight="bold"
      textAnchor="middle"
      x="50%"
      y="50%"
    >
      No Image
    </text>
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
  (
    {
      className,
      title = 'Zakat Project',
      description = 'Support our community initiatives',
      imageSrc = null, // Default to null to trigger placeholder
      progress = 0,
      goal = 1000,
      raised = 0,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-300 hover:shadow-md',
          className
        )}
        {...props}
      >
        <div className="relative h-48 w-full bg-gray-200">
          {' '}
          {/* Added background for placeholder container */}
          {imageSrc ? (
            <Image fill alt={title} className="object-cover" src={imageSrc} />
          ) : (
            <PlaceholderSvg />
          )}
        </div>

        <div className="space-y-4 p-6">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="line-clamp-2 text-sm text-gray-600">{description}</p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Raised: €{raised.toLocaleString()}</span>
              <span className="text-gray-600">Goal: €{goal.toLocaleString()}</span>
            </div>

            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <FilledButton className="flex-1">Donate Now</FilledButton>
            <FilledButton className="flex-1" variant="outline">
              Learn More
            </FilledButton>
          </div>
        </div>
      </div>
    );
  }
);

ProjectCard.displayName = 'ProjectCard';
