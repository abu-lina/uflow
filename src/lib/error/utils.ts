/**
 * Error Utilities
 * 
 * This file contains utility functions for error handling.
 */

import { AppError } from './classes';
import type { ErrorDetails } from './types';

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500, false);
  }

  return new AppError('An unexpected error occurred', 500, false);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorDetails(error: unknown): ErrorDetails {
  const appError = handleError(error);
  return appError.toJSON();
}

export function logError(error: unknown, context?: string): void {
  const details = getErrorDetails(error);
  console.error('Error:', {
    context,
    ...details,
  });
} 