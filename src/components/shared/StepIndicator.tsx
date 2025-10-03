'use client';

import { Icon } from '@iconify/react';

export interface StepIndicatorProps {
  currentStep: number;
  steps: { title: string; icon: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* Step circles with connecting lines */}
      <div className="flex w-full items-center justify-center">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          
          return (
            <div key={step.title} className="flex items-center">
              {/* Step circle */}
              <div
                className={[
                  'relative flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                  isCompleted
                    ? 'border-[#589D96] bg-[#589D96]'
                    : isCurrent
                    ? 'border-[#589D96] bg-white text-[#589D96]'
                    : 'border-[#999999] bg-[#D7D7D7] text-[#999999]',
                ].join(' ')}
              >
                {isCompleted ? (
                  <Icon 
                    className="h-4 w-4 text-white" 
                    icon="lucide:check" 
                  />
                ) : (
                  idx + 1
                )}
              </div>
              
              {/* Connecting line */}
              {idx < steps.length - 1 && (
                <div 
                  className={[
                    'h-px w-[61px]',
                    isCompleted ? 'bg-[#589D96]' : 'bg-[#999999]'
                  ].join(' ')}
                />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Step labels */}
      <div className="flex w-full justify-between px-3">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          
          return (
            <span
              key={step.title}
              className={[
                'text-xs font-semibold',
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
