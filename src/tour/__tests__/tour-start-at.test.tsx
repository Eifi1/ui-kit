import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TourProvider, useTour, type TourLauncher, type TourStep, type TourStepContext } from "../tour";
import { TourGuideButton } from "../tour-guide-button";
import type { TourInfo } from "../tour-info";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * Start inside an open form (docs/tours-harmonization.md §11.5, contract round 054 §5): `at`
 * is the floor, `start(id, { at })` goes through the provider's `launch`, and
 * `TourGuideButton` is the form's "Guide me". A run started with `at` records the completion
 * as a full run does (Marcel, Q2).
 */

type Engine = ReturnType<typeof useTour>;

function Capture({ onEngine }: { onEngine: (engine: Engine) => void }) {
  const engine = useTour();
  useEffect(() => {
    onEngine(engine);
  });
  return (
    <output data-testid="state">
      {engine.active ? `step ${engine.index} (${engine.position} of ${engine.count})` : "idle"}
    </output>
  );
}

function setup(props: Omit<Parameters<typeof TourProvider>[0], "children"> = {}, extra?: ReactNode) {
  const engine: { current: Engine | null } = { current: null };
  render(
    <TourProvider {...props}>
      <Capture
        onEngine={(e) => {
          engine.current = e;
        }}
      />
      {extra}
    </TourProvider>,
  );
  return () => engine.current!;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}
const state = () => screen.getByTestId("state").textContent;

const intro = vi.fn();
const STEPS: TourStep[] = [
  { title: "Intro", body: "Hi.", beforeStep: intro },
  { title: "Add", body: "Click Add.", target: '[data-tour="add-transaction"]' },
  { title: "Mode", body: "Pick one.", target: '[data-tour="txn-entry-mode"]' },
  { title: "Amount", body: "Type it." },
  { title: "Finish", body: "Saved." },
];

afterEach(() => {
  intro.mockClear();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("start at", () => {
  it("a number is the floor: earlier steps never run, Back is hidden there and stops there, the count starts there", async () => {
    const engine = setup();
    act(() => engine().start(STEPS, { at: 3 }));
    await flush();
    expect(state()).toBe("step 3 (1 of 2)");
    expect(intro).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    act(() => engine().prev());
    await flush();
    expect(state()).toBe("step 3 (1 of 2)");
    act(() => engine().next());
    await flush();
    act(() => engine().prev());
    await flush();
    expect(state()).toBe("step 3 (1 of 2)");
    act(() => engine().goToStep(0));
    await flush();
    expect(state()).toBe("step 3 (1 of 2)");
  });

  it("a string is the first step targeting that data-tour anchor", async () => {
    const engine = setup();
    act(() => engine().start(STEPS, { at: "txn-entry-mode" }));
    await flush();
    expect(engine().index).toBe(2);
  });

  it("an unknown anchor starts at 0", async () => {
    const engine = setup();
    act(() => engine().start(STEPS, { at: "nope" }));
    await flush();
    expect(engine().index).toBe(0);
  });

  it("the at step's beforeStep sees via: at, the next ones via: next", async () => {
    const seen: string[] = [];
    const log = (c: TourStepContext) => {
      seen.push(c.via);
    };
    const engine = setup();
    act(() =>
      engine().start(
        STEPS.map((s) => ({ ...s, beforeStep: log })),
        { at: 2 },
      ),
    );
    await flush();
    act(() => engine().next());
    await flush();
    expect(seen).toEqual(["at", "next"]);
  });

  it("an at step whose when is false starts at the next step shown", async () => {
    const engine = setup();
    act(() => engine().start([STEPS[0], { ...STEPS[2], when: () => false }, STEPS[3]], { at: 1 }));
    await flush();
    expect(state()).toBe("step 2 (1 of 1)");
  });

  it("startIndex picks the step, at the floor", async () => {
    const engine = setup();
    act(() => engine().start(STEPS, { at: 2, startIndex: 3 }));
    await flush();
    expect(state()).toBe("step 3 (2 of 3)");
    act(() => engine().prev());
    await flush();
    expect(engine().index).toBe(2);
  });

  it("a run started at the floor records the completion and awards it, as a full run (Q2)", async () => {
    const tour: TourInfo = { id: "create-transaction", title: "Book", group: "start", points: 20 };
    const onComplete = vi.fn();
    const engine = setup({ progress: { storageKey: "test.start-at" }, onComplete });
    act(() => engine().start(STEPS, { at: 3, tour }));
    await flush();
    act(() => engine().next());
    act(() => engine().next());
    expect(onComplete).toHaveBeenCalledWith(tour, { awarded: true });
    expect(localStorage.getItem("test.start-at")).toContain("create-transaction");
  });
});

describe("start by id", () => {
  it("calls the provider's launch with the id and at", async () => {
    const launch = vi.fn<TourLauncher>();
    const engine = setup({ launch });
    act(() => engine().start("create-transaction", { at: "txn-entry-mode" }));
    await flush();
    expect(launch).toHaveBeenCalledWith("create-transaction", { at: "txn-entry-mode" }, engine().start);
  });

  it("hands launch the provider's own start, so a launcher defined above the provider needs no ref (keksdose N4)", async () => {
    // Defined outside the tree, as an app's launcher above its provider is.
    const launch: TourLauncher = (id, opts, start) => start(STEPS, { id, at: opts.at });
    const engine = setup({ launch });
    act(() => engine().start("create-transaction", { at: "txn-entry-mode" }));
    await flush();
    expect(engine().activeId).toBe("create-transaction");
    expect(state()).toBe("step 2 (1 of 3)");
  });

  it("a two-argument launcher (0.50 before N4) still works", async () => {
    const holder: { engine: () => Engine } = { engine: () => null as unknown as Engine };
    const launch = (id: string, opts: { at?: string | number }) => holder.engine().start(STEPS, { id, at: opts.at });
    holder.engine = setup({ launch });
    act(() => holder.engine().start("create-transaction", { at: "txn-entry-mode" }));
    await flush();
    expect(state()).toBe("step 2 (1 of 3)");
  });

  it("does nothing without a launch", async () => {
    const engine = setup();
    act(() => engine().start("create-transaction"));
    await flush();
    expect(engine().active).toBe(false);
  });
});

describe("TourGuideButton", () => {
  it("renders nothing without a provider or without launch", () => {
    const { container } = render(<TourGuideButton tour="create-transaction" />);
    expect(container).toBeEmptyDOMElement();
    setup({}, <TourGuideButton tour="create-transaction" />);
    expect(screen.queryByRole("button", { name: "Guide me" })).toBeNull();
  });

  it("starts the tour by id at the anchor, with its description, and hides while the tour runs", async () => {
    const launch = vi.fn<TourLauncher>((id, opts, start) => start(STEPS, { id, at: opts.at }));
    setup({ launch }, <TourGuideButton tour="create-transaction" at="txn-entry-mode" />);
    const button = screen.getByRole("button", { name: "Guide me" });
    expect(button).toHaveAccessibleDescription("Walks you through this form, field by field");
    fireEvent.click(button);
    await flush();
    expect(launch).toHaveBeenCalledWith("create-transaction", { at: "txn-entry-mode" }, expect.any(Function));
    expect(state()).toBe("step 2 (1 of 3)");
    expect(screen.queryByRole("button", { name: "Guide me" })).toBeNull();
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <TourProvider launch={() => {}}>
          <TourGuideButton tour="x" />
        </TourProvider>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Schritt für Schritt" })).toHaveAccessibleDescription(
      "Führt Sie Feld für Feld durch dieses Formular",
    );
  });
});
