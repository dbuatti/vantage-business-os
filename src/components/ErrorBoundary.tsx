"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center min-h-[60vh] p-8">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-danger-bg flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-danger" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
              </p>
            </div>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload Page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
