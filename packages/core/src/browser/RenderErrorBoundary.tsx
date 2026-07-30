import { Component, type ErrorInfo, type ReactNode } from "react";

type RenderErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: unknown, info: ErrorInfo) => void;
};

type RenderErrorBoundaryState = {
  hasError: boolean;
};

export class RenderErrorBoundary extends Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  state: RenderErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RenderErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
