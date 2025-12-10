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
          className="absolute top-4 md:top-6 h-px md:h-0.5 bg-[#D7D7D7]"
          style={{
            left: `${(50 / steps.length)}%`,
            right: `${(50 / steps.length)}%`,
          }}
        />
        {/* Progress line - proportional within the inset line */}
        <div
          className="absolute top-4 md:top-6 h-px md:h-0.5 bg-primary transition-all duration-300"
          style={{
            left: `${(50 / steps.length)}%`,
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
                    'flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border text-sm md:text-base font-semibold transition-all duration-200',
                    isCompleted
                      ? 'border-primary bg-primary text-white'
                      : isCurrent
                      ? 'border-primary bg-white text-primary md:shadow-md'
                      : 'border-[#999999] bg-[#D7D7D7] text-[#999999]',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Icon className="h-4 w-4 md:h-5 md:w-5 text-white" icon="lucide:check" />
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
                'mx-auto text-xs md:text-sm font-semibold text-center transition-colors duration-200',
                (isCompleted || isCurrent) ? 'text-primary' : 'text-[#999999]'
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
