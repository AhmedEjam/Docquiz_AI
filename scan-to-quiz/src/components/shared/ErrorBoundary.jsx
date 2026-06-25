import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-primary p-8">
          <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-red-700 mb-4">{this.state.error.message}</p>
            <details className="text-xs text-red-600 font-mono">
              <summary className="cursor-pointer mb-2">Stack trace</summary>
              <pre className="overflow-auto max-h-48 whitespace-pre-wrap">
                {this.state.error.stack}
              </pre>
            </details>
            <button
              onClick={() => { this.setState({ error: null, errorInfo: null }); }}
              className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
