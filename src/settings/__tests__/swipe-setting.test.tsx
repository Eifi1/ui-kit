import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { Hand } from "lucide-react";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_SWIPE_SETTING_LABELS, SWIPE_SETTING_ANCHOR, SwipeSetting } from "../swipe-setting";
import {
  FEEDBACK_SWIPE_SURFACE,
  SWIPE_NONE,
  TRANSLATION_REVIEW_SWIPE_SURFACE,
  createSwipeSettingsStore,
} from "../swipe-settings-store";
import { SettingsLayout } from "../settings-layout";
import type { SettingsEntry, SettingsGroup } from "../settings-catalogue";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";

/**
 * `SwipeSetting` (0.61): keksdose's swipe settings card, in the kit — one list at a time
 * from a NavPills strip, two pickers a side, the kit's lists named in the kit's words and
 * an app's own in its, the list in the URL inside a settings layout, and "my defaults".
 */

const L = DEFAULT_SWIPE_SETTING_LABELS;

let n = 0;
const makeStore = (extra = {}) =>
  createSwipeSettingsStore({
    storageKey: `test-swipe-card-${++n}`,
    surfaces: {
      feedback: FEEDBACK_SWIPE_SURFACE,
      translations: TRANSLATION_REVIEW_SWIPE_SURFACE,
      ...extra,
    },
  });

afterEach(() => localStorage.clear());

const side = (name: string) => screen.getByRole("group", { name });
const picker = (sideName: string, stage: string) =>
  within(side(sideName)).getByRole("combobox", { name: stage }) as HTMLSelectElement;
const optionsOf = (select: HTMLSelectElement) => [...select.options].filter((o) => !o.hidden).map((o) => o.text);

describe("SwipeSetting — the pickers", () => {
  it("names each side's two pickers by the side, so the right's are not the left's", () => {
    render(<SwipeSetting store={makeStore()} />);
    expect(picker(L.right, L.primary)).toHaveValue("advance");
    expect(picker(L.right, L.secondary)).toHaveValue("done");
    expect(picker(L.left, L.primary)).toHaveValue("postpone");
    expect(picker(L.left, L.secondary)).toHaveValue("wont_do");
  });

  it("names the feedback list's actions as its swipe panels do: the statuses they set", () => {
    render(<SwipeSetting store={makeStore()} />);
    expect(optionsOf(picker(L.right, L.primary))).toEqual([L.none, L.nextStatus, "Done", "Postponed", "Won't do"]);
  });

  it("names the translation review's as the review panel's buttons", () => {
    render(<SwipeSetting store={makeStore()} />);
    fireEvent.click(screen.getByRole("button", { name: L.surfaces.translationReview }));
    expect(optionsOf(picker(L.left, L.primary))).toEqual([L.none, "Approve", "Needs a change", "Mark unreviewed"]);
    expect(picker(L.left, L.primary)).toHaveValue("edit");
    expect(picker(L.left, L.secondary)).toHaveValue(SWIPE_NONE);
  });

  it("binds the list on screen, the stage picked", () => {
    const store = makeStore();
    render(<SwipeSetting store={store} />);
    fireEvent.click(screen.getByRole("button", { name: L.surfaces.translationReview }));
    fireEvent.change(picker(L.right, L.secondary), { target: { value: "clear" } });
    const { surfaces } = store.useSwipeSettings.getState();
    expect(surfaces.translations).toEqual({ right: ["approve", "clear"], left: ["edit", SWIPE_NONE] });
    expect(surfaces.feedback).toEqual(FEEDBACK_SWIPE_SURFACE.defaults);
    expect(picker(L.right, L.secondary)).toHaveValue("clear");
  });
});

describe("SwipeSetting — the lists", () => {
  it("shows one list at a time; the strip says which", () => {
    render(<SwipeSetting store={makeStore()} />);
    const strip = screen.getByRole("group", { name: L.surfacePicker });
    expect(within(strip).getByRole("button", { name: L.surfaces.feedback })).toHaveAttribute("aria-current", "true");
    // Only the feedback list's four pickers are mounted.
    expect(screen.getAllByRole("combobox")).toHaveLength(4);
    expect(screen.queryByRole("option", { name: "Approve" })).toBeNull();
  });

  it("draws no strip for a store with one list", () => {
    const store = createSwipeSettingsStore({
      storageKey: `test-swipe-card-${++n}`,
      surfaces: { feedback: FEEDBACK_SWIPE_SURFACE },
    });
    render(<SwipeSetting store={store} />);
    expect(screen.queryByRole("group", { name: L.surfacePicker })).toBeNull();
    expect(picker(L.right, L.primary)).toHaveValue("advance");
  });

  it("offers the lists `surfaces` names, in its order, skipping one the store lacks", () => {
    render(<SwipeSetting store={makeStore()} surfaces={["translations", "nonsense", "feedback"]} />);
    const strip = screen.getByRole("group", { name: L.surfacePicker });
    expect(
      within(strip)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual([L.surfaces.translationReview, L.surfaces.feedback]);
    expect(picker(L.right, L.primary)).toHaveValue("approve");
  });

  it("renders nothing when it is offered no list", () => {
    const { container } = render(<SwipeSetting store={makeStore()} surfaces={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names an app's own list and its actions in the app's words, an id where it gave none", () => {
    const store = makeStore({
      budget: { actions: ["fund", "goal"], defaults: { right: ["fund", SWIPE_NONE], left: ["goal", SWIPE_NONE] } },
    });
    render(
      <SwipeSetting
        store={store}
        surfaceLabels={{ budget: { name: "Budget categories", actions: { fund: "Fund it" } } }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Budget categories" }));
    expect(optionsOf(picker(L.right, L.primary))).toEqual([L.none, "Fund it", "goal"]);
  });
});

describe("SwipeSetting — my defaults (keksdose dev#472)", () => {
  it("resets to the shipped bindings until defaults are saved, then to those", () => {
    const store = makeStore();
    render(<SwipeSetting store={store} />);
    fireEvent.change(picker(L.right, L.primary), { target: { value: "wont_do" } });
    fireEvent.click(screen.getByRole("button", { name: L.reset }));
    expect(picker(L.right, L.primary)).toHaveValue("advance");

    fireEvent.change(picker(L.right, L.primary), { target: { value: "wont_do" } });
    fireEvent.click(screen.getByRole("button", { name: L.saveDefault }));
    expect(screen.getByText(L.defaultSaved, { exact: false })).toBeInTheDocument();
    fireEvent.change(picker(L.right, L.primary), { target: { value: "postpone" } });
    fireEvent.click(screen.getByRole("button", { name: L.resetMine }));
    expect(picker(L.right, L.primary)).toHaveValue("wont_do");

    fireEvent.click(screen.getByRole("button", { name: L.resetShipped }));
    expect(picker(L.right, L.primary)).toHaveValue("advance");
    expect(store.useSwipeSettings.getState().baseline).toBeNull();
    expect(screen.getByRole("button", { name: L.reset })).toBeInTheDocument();
  });

  it("follows the store when something else rebinds it", () => {
    const store = makeStore();
    render(<SwipeSetting store={store} />);
    act(() => store.useSwipeSettings.getState().bind("feedback", "left", 1, SWIPE_NONE));
    expect(picker(L.left, L.secondary)).toHaveValue(SWIPE_NONE);
  });
});

describe("SwipeSetting — in a settings layout (keksdose live #235)", () => {
  const GROUPS: SettingsGroup<"interaction">[] = [
    { id: "interaction", icon: <Hand />, title: "Interaction", help: "How the lists respond." },
  ];
  const ENTRIES: SettingsEntry<"interaction">[] = [
    { id: "swipe", group: "interaction", anchor: SWIPE_SETTING_ANCHOR, title: L.title, keywords: L.keywords },
  ];

  function Where() {
    return <output data-testid="where">{useLocation().pathname}</output>;
  }

  function inLayout(url: string, store = makeStore()) {
    return render(
      <MemoryRouter initialEntries={[url]}>
        <SettingsLayout<"interaction">
          title="Settings"
          groups={GROUPS}
          entries={ENTRIES}
          basePath="/settings"
          renderGroup={() => <SwipeSetting store={store} />}
        />
        <Where />
      </MemoryRouter>,
    );
  }

  it("is the catalogue entry's card, titled at the layout's level", () => {
    inLayout("/settings/interaction");
    const card = document.getElementById(SWIPE_SETTING_ANCHOR);
    expect(card).not.toBeNull();
    expect(within(card!).getByRole("heading", { name: L.title })).toBeInTheDocument();
  });

  it("opens on the list the path names", () => {
    inLayout("/settings/interaction/translations");
    expect(picker(L.right, L.primary)).toHaveValue("approve");
  });

  it("falls back to the first list for a path that names none", () => {
    inLayout("/settings/interaction/nonsense");
    expect(picker(L.right, L.primary)).toHaveValue("advance");
  });

  it("writes the list into the path through the layout", async () => {
    inLayout("/settings/interaction");
    fireEvent.click(screen.getByRole("button", { name: L.surfaces.translationReview }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/settings/interaction/translations"));
    expect(picker(L.right, L.primary)).toHaveValue("approve");
  });
});

describe("SwipeSetting — words", () => {
  it("speaks the provider's catalogue, the actions in its status and review words", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <SwipeSetting store={makeStore()} />
      </UiKitProvider>,
    );
    const de = UI_KIT_LABELS_DE_CH;
    expect(screen.getByText(de.swipeSetting.title)).toBeInTheDocument();
    expect(optionsOf(picker(de.swipeSetting.right, de.swipeSetting.primary))).toEqual([
      de.swipeSetting.none,
      de.swipeSetting.nextStatus,
      de.feedbackStatus.DONE,
      de.feedbackStatus.POSTPONED,
      de.feedbackStatus.WONT_DO,
    ]);
  });

  it("takes a per-instance override over the catalogue", () => {
    render(<SwipeSetting store={makeStore()} labels={{ right: "Drag right", surfaces: { feedback: "Inbox" } }} />);
    expect(screen.getByRole("group", { name: "Drag right" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
    // The keys it did not pass stay English.
    expect(screen.getByRole("group", { name: L.left })).toBeInTheDocument();
  });
});
