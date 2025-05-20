'use client';

import { Icon } from '@/components/ui/Icon';

export interface StepIndicatorProps {
  currentStep: number;
  steps: { title: string; icon: string }[];
}

export function StepIndicator({ currentStep, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center space-x-4">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className={`flex flex-col items-center ${
            index <= currentStep ? 'text-primary' : 'text-gray-400'
          }`}
        >
          <div
            className={`flex size-10 items-center justify-center rounded-full ${
              index <= currentStep ? 'bg-primary text-white' : 'bg-gray-100'
            }`}
          >
            <Icon className="size-5" icon={step.icon} />
          </div>
          <span className="mt-2 text-sm font-medium">{step.title}</span>
        </div>
      ))}
    </div>
  );
}
