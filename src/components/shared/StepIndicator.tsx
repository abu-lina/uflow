'use client';

import { Icon } from '@iconify/react';

export interface StepIndicatorProps {
  currentStep: number;
  steps: { title: string; icon: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex w-full items-center justify-between px-4">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStep;
        const isCurrent = idx === currentStep;
        return (
          <div key={step.title} className="flex flex-1 flex-col items-center">
            <div
              className={[
                'flex size-10 items-center justify-center rounded-full border-2',
                isCompleted
                  ? 'border-mint bg-mint text-white'
                  : isCurrent
                    ? 'border-mint bg-white text-mint'
                    : 'border-gray-300 bg-white text-gray-400',
              ].join(' ')}
            >
              {isCompleted ? (
                <Icon className="size-6" icon="mdi:check" />
              ) : (
                <Icon className="size-6" icon={step.icon} />
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
                isCurrent ? 'text-mint' : isCompleted ? 'text-mint' : 'text-gray-400'
              }`}
            >
              {step.title}
            </span>
            {idx < steps.length - 1 && (
              <div className="absolute left-1/2 top-5 z-0 h-0.5 w-full -translate-x-1/2 bg-gray-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}
