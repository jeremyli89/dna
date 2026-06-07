import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-dna-bg flex items-center justify-center p-8">
          <div className="card max-w-md w-full text-center space-y-4">
            <p className="text-3xl">⚠️</p>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-sm text-dna-muted font-mono break-all">
              {this.state.error.message}
            </p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
