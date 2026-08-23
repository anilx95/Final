import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught unhandled React error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 animate-fade-in">
          <div className="card max-w-lg w-full bg-slate-900 border-rose-500/40 p-6 sm:p-8 space-y-6 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-100">
                {this.props.fallbackTitle || 'Application Notice'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.props.fallbackDescription ||
                  'An unexpected rendering issue occurred in this component. You can reload or return to dashboard.'}
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto max-h-36">
                <span className="font-bold text-rose-400">Error: </span>
                {this.state.error.message || 'Unknown error'}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleReset}
                className="btn-primary w-full sm:w-auto text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary w-full sm:w-auto text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reload Page
              </button>
              <a
                href="/"
                className="btn-secondary w-full sm:w-auto text-xs flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route-level Error Boundary for React Router v6
 */
export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage = 'An unexpected error occurred while loading this view.';
  let errorStatus = 'Error';

  if (isRouteErrorResponse(error)) {
    errorStatus = `${error.status} ${error.statusText}`;
    errorMessage = error.data?.message || error.statusText || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 animate-fade-in">
      <div className="card max-w-xl w-full bg-slate-900 border-sky-500/30 p-8 space-y-6 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/30 uppercase">
            {errorStatus}
          </span>
          <h1 className="text-2xl font-extrabold text-slate-100 mt-2">ClassAbly View Recovery</h1>
          <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
            The requested page encountered an issue. You can navigate back or return to the main dashboard.
          </p>
        </div>

        <div className="text-left bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-40">
          <div className="text-rose-400 font-bold mb-1">Details:</div>
          <div>{errorMessage}</div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary text-xs flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-primary text-xs flex items-center gap-2"
          >
            <Home className="w-4 h-4" /> Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
