import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { createServerWake, serverWake } from "../../lib/server-wake";
import { FloatingActionButton } from "../floating-panel";
import { DEFAULT_SERVER_WAKE_LABELS, ServerWakeNotice, useServerWakeStage } from "../server-wake";
import type { ServerWakeWatcher } from "../../lib/server-wake";

/**
 * keksdose's cold-start notice, as the kit's: one polite live region at the top
 * centre, silent while idle, "still loading" past 2 s and the explanation past 7 s.
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

  /**
   * keksdose live #399: *"Move the notification to the top where it can be better seen
   * and not block any sticky elements."* jsdom lays nothing out, so this reads the
   * placement off the classes: anchored to the top under the status bar, centred inside
   * the side insets, never to the bottom where a phone keeps its floating actions and a
   * dialog's sticky footer — and taking no taps in any stage, so whatever it covers
   * still answers.
   */
  it.each(["idle", "slow", "waking"] as const)("sits centred at the top and takes no taps (%s, live #399)", (stage) => {
    const w = createServerWake();
    render(<ServerWakeNotice watcher={w} />);
    act(() => {
      if (stage !== "idle") w.start();
    });
    advance(stage === "waking" ? 7000 : 2000);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("data-stage", stage);
    expect(region).toHaveClass("fixed", "pointer-events-none", "mx-auto", "w-fit");
    expect(region.className).toContain("top-[calc(env(safe-area-inset-top,0px)+0.375rem)]");
    expect(region.className).toContain("left-[max(1rem,env(safe-area-inset-left,0px))]");
    expect(region.className).toContain("right-[max(1rem,env(safe-area-inset-right,0px))]");
    expect(region.className).not.toMatch(/(^|\s)(md:)?(bottom-|start-)/);
    expect(region.style.bottom).toBe("");
  });

  it("lets a caller move it under its top bar or narrow it, and ignores the old navOffset", () => {
    render(<ServerWakeNotice watcher={createServerWake()} navOffset={64} className="top-16 max-w-xs" />);
    const region = screen.getByRole("status");
    expect(region).toHaveClass("top-16", "max-w-xs");
    expect(region.className).not.toContain("top-[calc(");
    expect(region.className).not.toContain("max-w-[24rem]");
    expect(region.style.bottom).toBe("");
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

describe("ServerWakeNotice beside a FloatingActionButton", () => {
  // Until 0.34 the notice shared the bottom-start corner with kastlan's offline pill and
  // measured its way above it (kastlan 0.18). At the top it shares no corner with any
  // FAB, so a FAB that comes and goes no longer moves it.
  it("stays where it is when a FAB appears under the start corner", () => {
    const w = createServerWake();
    render(
      <>
        <FloatingActionButton label="Offline" icon={null} corner="bottom-start" extended />
        <ServerWakeNotice watcher={w} />
      </>,
    );
    act(() => {
      w.start("get", "/x");
    });
    advance(2000);
    const notice = document.querySelector<HTMLElement>("[data-stage]")!;
    expect(notice.style.bottom).toBe("");
    expect(notice.className).toContain("top-[calc(");
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
