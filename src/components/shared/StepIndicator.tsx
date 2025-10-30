'use client';

import { Icon } from '@iconify/react';

export interface StepIndicatorProps {
  currentStep: number;
  steps: { title: string; icon: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Step circles with unified progress line */}
      <div className="relative w-full">
        {/* Base line - from center of first to center of last circle */}
        <div
          className="absolute top-4 h-px bg-[#D7D7D7]"
          style={{
            left: `${(50 / steps.length)}%`,
            right: `${(50 / steps.length)}%`,
          }}
        />
        {/* Progress line - proportional within the inset line */}
        <div
          className="absolute top-4 h-px bg-[#589D96]"
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
                    'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                    isCompleted
                      ? 'border-[#589D96] bg-[#589D96] text-white'
                      : isCurrent
                      ? 'border-[#589D96] bg-white text-[#589D96]'
                      : 'border-[#999999] bg-[#D7D7D7] text-[#999999]',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Icon className="h-4 w-4 text-white" icon="lucide:check" />
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
                'mx-auto text-xs font-semibold text-center',
                (isCompleted || isCurrent) ? 'text-[#589D96]' : 'text-[#999999]'
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
