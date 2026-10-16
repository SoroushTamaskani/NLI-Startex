import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** What to show instead of the crashed part. `reset` tries rendering it again. */
  fallback: (error: Error, reset: () => void) => ReactNode;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Stops one broken screen from blanking the whole app. Without this, any
 * error while rendering removes everything and leaves kids staring at nothing.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[nli] a screen crashed:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}
