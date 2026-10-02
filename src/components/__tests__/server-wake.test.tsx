import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { createServerWake, serverWake } from "../../lib/server-wake";
import { DEFAULT_SERVER_WAKE_LABELS, ServerWakeNotice, useServerWakeStage } from "../server-wake";
import type { ServerWakeWatcher } from "../../lib/server-wake";

/**
 * keksdose's cold-start notice, as the kit's: one polite live region in the start
 * corner, silent while idle, "still loading" past 2 s and the explanation past 7 s.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  serverWake.reset();
});

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("ServerWakeNotice", () => {
  it("keeps one polite live region mounted, empty while idle", () => {
    const w = createServerWake();
    render(<ServerWakeNotice watcher={w} />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
    expect(region.className).toContain("pointer-events-none");
  });

  it("says it is still loading at 2 s and why at 7 s, then goes away", () => {
    const w = createServerWake();
    render(<ServerWakeNotice watcher={w} appName="Keksdose" />);
    act(() => {
      w.start("get", "/budgets");
    });
    advance(2000);
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent(DEFAULT_SERVER_WAKE_LABELS.slow);
    expect(region).toHaveAttribute("data-stage", "slow");
    advance(5000);
    expect(region).toHaveTextContent("when nobody is using Keksdose");
    expect(region).toHaveTextContent("nothing is lost");
    act(() => w.end());
    expect(region).toBeEmptyDOMElement();
  });

  it("says 'the app' when no name is given", () => {
    const w = createServerWake();
    render(<ServerWakeNotice watcher={w} />);
    act(() => {
      w.start();
    });
    advance(7000);
    expect(screen.getByRole("status")).toHaveTextContent("when nobody is using the app,");
  });

  it("has exactly one live region — the spinner is decoration", () => {
    const w = createServerWake();
    const { container } = render(<ServerWakeNotice watcher={w} />);
    act(() => {
      w.start();
    });
    advance(2000);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });

  it("clears the bottom nav by --app-nav-h by default, or by navOffset", () => {
    const { rerender } = render(<ServerWakeNotice watcher={createServerWake()} />);
    expect(screen.getByRole("status").style.bottom).toContain("var(--app-nav-h, 0px)");
    rerender(<ServerWakeNotice watcher={createServerWake()} navOffset={64} />);
    expect(screen.getByRole("status").style.bottom).toContain("64px");
  });

  it("follows the shared instance when no watcher is passed", () => {
    render(<ServerWakeNotice />);
    act(() => {
      serverWake.start("get", "/x");
    });
    advance(2000);
    expect(screen.getByRole("status")).toHaveTextContent(DEFAULT_SERVER_WAKE_LABELS.slow);
  });

  it("takes its words from UiKitProvider, and a labels prop over those", () => {
    const w = createServerWake();
    const { rerender } = render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ServerWakeNotice watcher={w} appName="Kastlan" />
      </UiKitProvider>,
    );
    act(() => {
      w.start();
    });
    advance(2000);
    expect(screen.getByRole("status")).toHaveTextContent("Lädt noch – das dauert länger als sonst.");
    advance(5000);
    expect(screen.getByRole("status")).toHaveTextContent("wenn Kastlan gerade niemand benutzt");
    rerender(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <ServerWakeNotice watcher={w} appName="Kastlan" labels={{ waking: (name) => `${name} wacht auf.` }} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Kastlan wacht auf.");
  });
});

describe("useServerWakeStage", () => {
  function Probe({ watcher }: { watcher: ServerWakeWatcher }) {
    return <span data-testid="stage">{useServerWakeStage(watcher)}</span>;
  }

  it("re-renders on every stage", () => {
    const w = createServerWake();
    render(<Probe watcher={w} />);
    expect(screen.getByTestId("stage")).toHaveTextContent("idle");
    act(() => {
      w.start();
    });
    advance(2000);
    expect(screen.getByTestId("stage")).toHaveTextContent("slow");
    advance(5000);
    expect(screen.getByTestId("stage")).toHaveTextContent("waking");
    act(() => w.end());
    expect(screen.getByTestId("stage")).toHaveTextContent("idle");
  });
});
