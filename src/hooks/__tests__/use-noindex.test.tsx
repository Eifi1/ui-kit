import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useNoIndex } from "../use-noindex";

/**
 * keksdose's noindex marker (feedback #97): there while the page is mounted, gone after —
 * a single-page app keeps its head, so a marker left behind would de-index the app
 * pages a visitor navigates to next.
 */

const markers = () => document.head.querySelectorAll('meta[name="robots"][content="noindex"]');

function Page({ active }: { active?: boolean }) {
  useNoIndex(active);
  return null;
}

afterEach(() => {
  document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove());
});

describe("useNoIndex", () => {
  it("adds the robots meta on mount and removes it on unmount", () => {
    const { unmount } = render(<Page />);
    expect(markers()).toHaveLength(1);
    unmount();
    expect(markers()).toHaveLength(0);
  });

  it("removes only its own marker: two callers, one leaves", () => {
    const first = render(<Page />);
    const second = render(<Page />);
    expect(markers()).toHaveLength(2);
    first.unmount();
    expect(markers()).toHaveLength(1);
    second.unmount();
    expect(markers()).toHaveLength(0);
  });

  it("adds nothing while inactive, and follows the switch", () => {
    const { rerender, unmount } = render(<Page active={false} />);
    expect(markers()).toHaveLength(0);
    rerender(<Page active />);
    expect(markers()).toHaveLength(1);
    rerender(<Page active={false} />);
    expect(markers()).toHaveLength(0);
    unmount();
  });
});
