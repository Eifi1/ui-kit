import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/**
 * One boundary per section.
 *
 * The showcase mounts every export in the package in a single tree, which is what
 * makes it a useful smoke test and also what makes it fragile: without this, one
 * component throwing takes the whole page to a white screen, and the reader learns
 * nothing about the other fifteen sections. A red box that names the section and
 * prints the message is strictly more informative — and in the render test it is
 * the difference between "Combobox is broken" and "the page is broken".
 */
export class SectionBoundary extends Component<
  { title: string; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept: the stack is the only thing that says WHICH component in the section
    // threw, and the boundary swallows the default overlay in a production build.
    console.error(`[showcase] section "${this.props.title}" threw`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          // The render test asserts on THIS attribute, not on role="alert": components
          // legitimately render alerts of their own (FieldSyncIndicator's error state is
          // one), so the role alone cannot distinguish "a section crashed" from "a
          // section is demonstrating an error affordance".
          data-section-error={this.props.title}
          className="rounded-lg border border-[var(--money-expense)] bg-[var(--bg-surface-2)] p-4"
        >
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {this.props.title} failed to render
          </p>
          <pre className="mt-2 overflow-x-auto font-mono text-xs text-[var(--text-secondary)]">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
