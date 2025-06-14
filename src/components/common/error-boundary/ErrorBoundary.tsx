'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            aria-live="assertive"
            className="flex min-h-[400px] flex-col items-center justify-center rounded-lg bg-background p-8"
            role="alert"
          >
            <h2 className="mb-4 text-2xl font-bold text-danger">Something went wrong</h2>
            <p className="text-text-secondary mb-4">{this.state.error?.message}</p>
            <button
              aria-label="Try again"
              className="rounded-lg bg-danger px-4 py-2 text-white hover:bg-danger/90 focus:outline-none focus:ring-2 focus:ring-danger focus:ring-offset-2"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
