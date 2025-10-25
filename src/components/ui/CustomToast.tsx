'use client';

import { toast } from 'sonner';

interface CustomToastProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  type: 'warning' | 'success' | 'info';
}

export const showCustomToast = ({ title, description, actionLabel, onAction, type }: CustomToastProps) => {
  const getToastConfig = () => {
    switch (type) {
      case 'warning':
        return {
          className: 'bg-warning-soft border-warning-light text-warning-dark',
          action: actionLabel ? {
            label: actionLabel,
            onClick: onAction || (() => window.location.href = '/login')
          } : undefined
        };
      case 'success':
        return {
          className: 'bg-success-light border-success text-success-dark'
        };
      case 'info':
        return {
          className: 'bg-info border-info text-white'
        };
      default:
        return {};
    }
  };

  const config = getToastConfig();

  if (type === 'warning') {
    toast.warning(title, {
      description,
      ...config,
      duration: 5000,
    });
  } else if (type === 'success') {
    toast.success(title, {
      description,
      ...config,
      duration: 3000,
    });
  } else if (type === 'info') {
    toast.info(title, {
      description,
      ...config,
      duration: 3000,
    });
  }
};
