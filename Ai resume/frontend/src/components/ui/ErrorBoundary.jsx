import React from 'react';
import { AlertTriangle, RotateCcw, ArrowLeft, Home } from 'lucide-react';
import Button from './Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[320px] p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-sm flex flex-col items-center justify-center text-center my-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            {this.props.title || 'Something went wrong in this section'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4">
            {this.state.error?.message ||
              'An unexpected runtime error occurred while rendering this component. Your data is safe.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={this.handleReset}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Try Again
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/dashboard';
                }
              }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
