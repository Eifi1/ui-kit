import { useEffect } from "react";
import { act, render } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate, type Location, type NavigateFunction } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SETTINGS_FOCUS_MS, SETTINGS_FOCUS_RING, useSettingsFocus } from "../use-settings-focus";

/*
 * `?focus=` on a page of the app's own (docs/settings-harmonization.md §3.5): the paths
 * SettingsLayout's tests never reach (refactor audit 2026-10-30, TST-2) — a card that mounts
 * after the page (lazy, or behind its data), waited for through a MutationObserver for 5 s,
 * and a second ring asked for while one is on.
 */

let probe: { location: Location; navigate: NavigateFunction } | null = null;

function Page({ cards }: { cards: readonly string[] }) {
  useSettingsFocus();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    probe = { location, navigate };
  }, [location, navigate]);
  return (
    <>
      {cards.map((id) => (
        <section key={id} id={id}>
          <h3>{id}</h3>
        </section>
      ))}
    </>
  );
}

function mount(entry: string, cards: readonly string[] = []) {
  const tree = (shown: readonly string[]) => (
    <MemoryRouter initialEntries={[entry]}>
      <Page cards={shown} />
    </MemoryRouter>
  );
  const view = render(tree(cards));
  return { ...view, show: (shown: readonly string[]) => view.rerender(tree(shown)) };
}

const url = () => `${probe!.location.pathname}${probe!.location.search}`;

/** Resolves once an observer of the test's own has seen `id` arrive. Observers of one node
 *  are told in the order they began observing, so the hook's — were it still watching —
 *  has been told by then: the decision point for "it was not rung" (TST-3's rule). */
function seen(id: string): Promise<void> {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.getElementById(id)) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}

afterEach(() => {
  vi.useRealTimers();
  probe = null;
});

describe("useSettingsFocus — a card that mounts after the page", () => {
  it("waits for it, then rings it, focuses its heading and removes only `focus`", async () => {
    const view = mount("/reports?focus=late-card&tab=matching");
    expect(url()).toBe("/reports?focus=late-card&tab=matching");

    await act(async () => view.show(["late-card"]));

    const card = document.getElementById("late-card")!;
    expect(card).toHaveClass(...SETTINGS_FOCUS_RING);
    expect(card).toHaveAttribute("data-settings-focus");
    expect(document.activeElement).toBe(card.querySelector("h3"));
    expect(url()).toBe("/reports?tab=matching");
  });

  it("gives up after 5 s: a card that comes later is not rung, and the URL keeps `focus`", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const view = mount("/reports?focus=late-card");
    act(() => vi.advanceTimersByTime(5000));

    const arrived = seen("late-card");
    await act(async () => view.show(["late-card"]));
    await arrived;

    expect(document.getElementById("late-card")).not.toHaveClass("ring-2");
    expect(url()).toBe("/reports?focus=late-card");
  });

  it("stops waiting when the page unmounts first", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const view = mount("/reports?focus=late-card");
    view.unmount();
    expect(vi.getTimerCount()).toBe(0); // its 5 s are cleared with it

    const card = document.createElement("section");
    card.id = "late-card";
    const arrived = seen("late-card");
    document.body.append(card);
    await arrived;

    expect(card).not.toHaveClass("ring-2");
    card.remove();
  });
});

describe("useSettingsFocus — a second ring while one is on", () => {
  it("moves the ring at once to another card, which keeps its full 1.8 s", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mount("/settings?focus=a-card", ["a-card", "b-card"]);
    const a = document.getElementById("a-card")!;
    const b = document.getElementById("b-card")!;
    expect(a).toHaveClass(...SETTINGS_FOCUS_RING);

    act(() => vi.advanceTimersByTime(1000));
    act(() => void probe!.navigate("/settings?focus=b-card"));

    expect(a).not.toHaveClass("ring-2");
    // The mark goes with the ring: an app's test (keksdose's matching tab) reads it.
    expect(a).not.toHaveAttribute("data-settings-focus");
    expect(b).toHaveClass(...SETTINGS_FOCUS_RING);
    expect(document.activeElement).toBe(b.querySelector("h3"));
    act(() => vi.advanceTimersByTime(SETTINGS_FOCUS_MS - 1));
    expect(b).toHaveClass("ring-2");
    act(() => vi.advanceTimersByTime(1));
    expect(b).not.toHaveClass("ring-2");
  });

  it("rings the same card for a full 1.8 s again: the first ring's end is called off", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mount("/settings?focus=a-card", ["a-card"]);
    const a = document.getElementById("a-card")!;

    act(() => vi.advanceTimersByTime(1000));
    act(() => void probe!.navigate("/settings?focus=a-card"));

    // The first ring would have ended 800 ms into this one.
    act(() => vi.advanceTimersByTime(SETTINGS_FOCUS_MS - 1));
    expect(a).toHaveClass(...SETTINGS_FOCUS_RING);
    act(() => vi.advanceTimersByTime(1));
    expect(a).not.toHaveClass("ring-2");
    expect(a).not.toHaveAttribute("data-settings-focus");
  });
});
