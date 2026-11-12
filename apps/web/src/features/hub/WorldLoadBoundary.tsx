import { Component, type ReactNode } from 'react';

/** Keep surrounding navigation usable when a lazy scene cannot be opened. */
export class WorldLoadBoundary extends Component<{ children: ReactNode; onError?: () => void; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? this.props.fallback ?? null : this.props.children; }
}
