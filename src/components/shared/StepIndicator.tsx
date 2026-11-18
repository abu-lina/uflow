'use client';

import { Icon } from '@iconify/react';

export interface StepIndicatorProps {
  currentStep: number;
  steps: { title: string; icon: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2 md:gap-4">
      {/* Step circles with unified progress line */}
      <div className="relative w-full">
        {/* Base line - from center of first to center of last circle */}
        <div
          className="absolute top-4 h-px bg-neutral-200 md:top-6 md:h-0.5"
          style={{
            left: `${50 / steps.length}%`,
            right: `${50 / steps.length}%`,
          }}
        />
        {/* Progress line - proportional within the inset line */}
        <div
          className="absolute top-4 h-px bg-primary transition-all duration-300 md:top-6 md:h-0.5"
          style={{
            left: `${50 / steps.length}%`,
            width: `${steps.length > 0 ? (Math.min(Math.max(currentStep, 0), steps.length - 1) / steps.length) * 100 : 0}%`,
          }}
        />
        {/* Circles laid out in equal columns */}
        <div
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
        >
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <div key={step.title} className="relative z-10 flex items-center justify-center">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-200 md:h-10 md:w-10 md:text-base',
                    isCompleted
                      ? 'border-primary bg-primary text-white'
                      : isCurrent
                        ? 'border-primary bg-white text-primary md:shadow-md'
                        : 'border-border bg-neutral-200 text-content-muted',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Icon className="h-4 w-4 text-white md:h-5 md:w-5" icon="lucide:check" />
                  ) : (
                    idx + 1
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step labels aligned under circles */}
      <div
        className="grid w-full"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          return (
            <span
              key={step.title}
              className={[
                'mx-auto text-center text-xs font-semibold transition-colors duration-200 md:text-sm',
                isCompleted || isCurrent ? 'text-primary' : 'text-content-muted',
              ].join(' ')}
            >
              {step.title}
            </span>
          );
        })}
      </div>
    </div>
  );
}
