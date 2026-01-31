import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="mx-auto max-w-md text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-bold">Terjadi Kesalahan</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Aplikasi mengalami error. Silakan muat ulang halaman.
            </p>
            {this.state.error && (
              <p className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground font-mono">
                {this.state.error.message}
              </p>
            )}
            <Button
              className="mt-4"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/app';
              }}
            >
              Muat Ulang
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
