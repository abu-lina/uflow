/**
 * Error Types
 * 
 * This file contains all error-related types and interfaces.
 */

export interface ErrorDetails {
  message: string;
  statusCode: number;
  isOperational: boolean;
  stack?: string;
  digest?: string;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
} 