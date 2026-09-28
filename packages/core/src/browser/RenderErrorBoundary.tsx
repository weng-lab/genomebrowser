import { Component, type ErrorInfo, type ReactNode } from "react";

type RenderErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  resetKeys?: readonly unknown[];
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

  componentDidUpdate(previous: RenderErrorBoundaryProps) {
    if (
      this.state.hasError &&
      this.props.resetKeys?.some((key, index) => key !== previous.resetKeys?.[index])
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
