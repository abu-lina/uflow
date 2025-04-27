/**
 * @fileoverview Form handling hook with validation
 * @module hooks/form
 */

import { useState, useCallback } from 'react';

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
}

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void>;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
  });

  const handleChange = useCallback((name: keyof T, value: T[keyof T]) => {
    setState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        [name]: value,
      },
      touched: {
        ...prev.touched,
        [name]: true,
      },
    }));
  }, []);

  const handleBlur = useCallback((name: keyof T) => {
    setState((prev) => ({
      ...prev,
      touched: {
        ...prev.touched,
        [name]: true,
      },
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        if (validate) {
          const errors = validate(state.values);
          if (Object.keys(errors).length > 0) {
            setState((prev) => ({ ...prev, errors, isSubmitting: false }));
            return;
          }
        }

        await onSubmit(state.values);
        setState((prev) => ({ ...prev, isSubmitting: false }));
      } catch (error) {
        setState((prev) => ({ ...prev, isSubmitting: false }));
        throw error;
      }
    },
    [state.values, validate, onSubmit]
  );

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
