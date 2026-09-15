import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught rendering error in React ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-card border border-destructive/40 rounded-xl p-6 sm:p-8 shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while rendering this page.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-muted p-4 rounded-lg text-left overflow-auto max-h-48 border border-border">
                <p className="text-xs font-mono font-semibold text-destructive mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors font-medium"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
