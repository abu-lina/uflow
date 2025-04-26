'use client';

import React from 'react';

interface FormState {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  error?: string | null;
  loading?: boolean;
  message?: string | null;
}

interface FormLoggerProps {
  formState: FormState;
  formName: string;
}

export const FormLogger: React.FC<FormLoggerProps> = ({ formState, formName }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${formName}] Form State:`, formState);
  }
  return null;
}; 