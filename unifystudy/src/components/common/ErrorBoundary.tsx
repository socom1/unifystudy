
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#121212',
          color: '#e0e0e0',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#ff6b6b' }}>Something went wrong</h2>
          <p style={{ marginBottom: '2rem', opacity: 0.8 }}>We encountered an unexpected error.</p>
          <div style={{ 
            padding: '1rem', 
            background: '#1e1e1e', 
            borderRadius: '8px', 
            marginBottom: '2rem',
            maxWidth: '600px',
            overflow: 'auto',
            fontFamily: 'monospace',
            color: '#fd7e14' 
          }}>
             {this.state.error?.message}
          </div>
          <button 
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4dabf7',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
              transition: 'opacity 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
