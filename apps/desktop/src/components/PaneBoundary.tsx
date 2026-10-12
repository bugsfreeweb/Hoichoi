import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Per-pane error boundary. Every desk view is mounted at once (hidden panes stay
 * in the tree), so a render throw in any one screen used to unmount the whole
 * window and leave a blank white frame. This keeps a fault local to its tab and
 * offers a retry that re-mounts the subtree.
 */
export default class PaneBoundary extends Component<
  { name: string; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[desk:pane:${this.props.name}]`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="pane-fallback">
          <p className="pf-title bn">এই ট্যাবে একটি সমস্যা হয়েছে</p>
          <p className="pf-sub mono">PANE ERROR · {this.props.name.toUpperCase()}</p>
          <pre className="pf-detail mono">{String(this.state.error)}</pre>
          <button type="button" className="pf-retry mono" onClick={() => this.setState({ error: null })}>
            আবার চেষ্টা করুন
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
