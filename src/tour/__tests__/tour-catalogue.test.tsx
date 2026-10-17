import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { TourCatalogue, TourCatalogueCard, type TourCatalogueProps } from "../tour-catalogue";
import type { TourCompletions, TourGroup, TourInfo } from "../tour-info";
import type { TourCatalogueFilter } from "../use-tour-url-sync";

/** docs/tours-harmonization.md §2.1, §3, §6 and §8: keksdose's /tours body and card. */

const GROUPS: TourGroup[] = [
  { id: "start", title: "Getting started", help: "The first steps.", icon: <svg data-testid="icon-start" /> },
  { id: "budgeting", title: "Everyday budgeting", help: "Plan the month." },
  { id: "empty", title: "Nothing here" },
];

const TOURS: TourInfo[] = [
  { id: "welcome", title: "Welcome", description: "The tour of tours.", group: "start", points: 20, steps: 5, duration: 2 },
  { id: "budget", title: "Your budget", description: "Plan a month.", about: "Visits the budget page.", group: "budgeting", points: 30, since: "2026-10-05" },
  {
    id: "goals",
    title: "Goals",
    description: "Save towards something.",
    group: "budgeting",
    points: 40,
    updated: { date: "2026-10-10", reason: "The goals editor moved." },
  },
  { id: "orphan", title: "No group", group: "nowhere" },
];

const COMPLETED: TourCompletions = {
  welcome: "2026-09-01T10:00:00Z",
  goals: "2026-09-20T10:00:00Z", // before the update: reset
};

function Harness(props: Partial<TourCatalogueProps> & { initial?: Partial<TourCatalogueFilter> }) {
  const [filter, setFilter] = useState<TourCatalogueFilter>({ query: "", group: null, state: "all", ...props.initial });
  return (
    <TourCatalogue
      tours={TOURS}
      groups={GROUPS}
      completed={COMPLETED}
      joined="2026-10-01T09:00:00Z"
      onLaunch={() => {}}
      onReset={() => {}}
      {...filter}
      onChange={(patch) => setFilter((f) => ({ ...f, ...patch }))}
      {...props}
    />
  );
}

const card = (title: string) => screen.getByRole("heading", { level: 3, name: title }).closest("div.flex.h-full")! as HTMLElement;

describe("TourCatalogue", () => {
  it("draws a section per group with tours, in the app's order — an h2 with its icon and help line", () => {
    render(<Harness header={<p>The page header</p>} />);
    expect(screen.getByText("The page header")).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Getting started", "Everyday budgeting"]);
    expect(screen.getByTestId("icon-start")).toBeInTheDocument();
    expect(screen.getByText("Plan the month.")).toBeInTheDocument();
    // A tour in no listed group is not listed, and not counted.
    expect(screen.queryByText("No group")).toBeNull();
    expect(screen.getByRole("radio", { name: "All (3)" })).toBeInTheDocument();
  });

  it("counts each filter by what the others leave; a reset tour counts as to do (§8)", () => {
    render(<Harness />);
    expect(screen.getByRole("radio", { name: "To do (2)" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Completed (1)" })).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Topic" });
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "All topics (3)",
      "Getting started (1)",
      "Everyday budgeting (2)",
      "Nothing here (0)",
    ]);
    fireEvent.click(screen.getByRole("radio", { name: "To do (2)" }));
    expect(within(select).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "All topics (2)",
      "Getting started (0)",
      "Everyday budgeting (2)",
      "Nothing here (0)",
    ]);
    // The section the filter emptied is hidden.
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Everyday budgeting"]);
    expect(screen.getByRole("status")).toHaveTextContent("Showing 2 of 3 tours");
  });

  it("searches the title, one-liner and about, folding case and accents", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search tours" }), { target: { value: "BUDGET PAGE" } });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Your budget"]);
    expect(screen.getByRole("radio", { name: "All (1)" })).toBeInTheDocument();
  });

  it("picks a group from the select", () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole("combobox", { name: "Topic" }), { target: { value: "start" } });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Welcome"]);
  });

  it("an empty result shows the empty state, and Clear filters resets all three", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} query="zzz" />);
    expect(screen.getByText("No tour matches")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenCalledWith({ query: "", group: null, state: "all" });
  });

  it("an unknown group or state from an old link is no filter at all", () => {
    render(<Harness initial={{ group: "gone", state: "bogus" as never }} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });

  it("marks NEW from since and joined; the taken and the reset are not NEW", () => {
    render(<Harness />);
    expect(within(card("Your budget")).getByText("New")).toBeInTheDocument();
    expect(within(card("Welcome")).queryByText("New")).toBeNull();
    expect(within(card("Goals")).queryByText("New")).toBeNull();
  });

  it("passes launch and reset through", () => {
    const onLaunch = vi.fn();
    const onReset = vi.fn();
    render(<Harness onLaunch={onLaunch} onReset={onReset} />);
    fireEvent.click(within(card("Welcome")).getByRole("button", { name: "Replay" }));
    fireEvent.click(within(card("Welcome")).getByRole("button", { name: "Mark as not done" }));
    expect(onLaunch).toHaveBeenCalledWith("welcome");
    expect(onReset).toHaveBeenCalledWith("welcome");
  });

  it("speaks the provider's language (de-CH)", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH} locale="de-CH">
        <Harness />
      </UiKitProvider>,
    );
    expect(screen.getByRole("radio", { name: "Offen (2)" })).toBeInTheDocument();
    expect(within(card("Goals")).getByText("Aktualisiert")).toBeInTheDocument();
  });
});

describe("TourCatalogueCard", () => {
  const base: TourInfo = { id: "t", title: "Tour", description: "One line.", about: "The long account.", group: "g" };

  it("an untaken tour: the empty state icon, Start, no completion line, no Mark undone", () => {
    render(<TourCatalogueCard tour={{ ...base, icon: <svg data-testid="tour-icon" /> }} onLaunch={() => {}} onReset={() => {}} />);
    expect(screen.getByText("Not completed")).toBeInTheDocument();
    expect(screen.getByTestId("tour-icon")).toBeInTheDocument();
    expect(screen.getByText("One line.")).toBeInTheDocument();
    expect(screen.getByText("The long account.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toHaveAccessibleDescription("Tour");
    expect(screen.queryByRole("button", { name: "Mark as not done" })).toBeNull();
  });

  it("the points chip, the step count and the duration, each only when given", () => {
    const { rerender } = render(<TourCatalogueCard tour={{ ...base, points: 30, steps: 1, duration: 3 }} onLaunch={() => {}} />);
    expect(screen.getByText("+30 pts")).toBeInTheDocument();
    expect(screen.getByText("1 step")).toBeInTheDocument();
    expect(screen.getByText("About 3 min")).toBeInTheDocument();
    rerender(<TourCatalogueCard tour={base} onLaunch={() => {}} />);
    expect(screen.queryByText(/pts|step|min/)).toBeNull();
  });

  it("completed: the date, Replay and Mark undone; without a date just Completed", () => {
    const { rerender } = render(
      <TourCatalogueCard tour={base} completedAt="2026-09-01T10:00:00Z" formatDate={(iso) => `[${iso.slice(0, 10)}]`} onLaunch={() => {}} onReset={() => {}} />,
    );
    expect(screen.getByText("Completed on [2026-09-01]")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replay" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark as not done" })).toBeInTheDocument();
    rerender(<TourCatalogueCard tour={base} completedAt={null} onLaunch={() => {}} onReset={() => {}} />);
    expect(screen.getAllByText("Completed")).toHaveLength(2); // the icon's words and the line
    expect(screen.queryByText(/Completed on/)).toBeNull();
  });

  it("NEW and the app's badge sit beside the title", () => {
    render(<TourCatalogueCard tour={{ ...base, badge: <span>Practice</span> }} isNew onLaunch={() => {}} />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("Practice")).toBeInTheDocument();
  });

  it("reset by an update: the Updated pill, the reason, Start, to do (§8)", () => {
    const tour = { ...base, updated: { date: "2026-10-10", reason: "The screen moved." } };
    render(
      <TourCatalogueCard tour={tour} completedAt="2026-09-01T10:00:00Z" isNew formatDate={(iso) => iso.slice(0, 10)} onLaunch={() => {}} onReset={() => {}} />,
    );
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.queryByText("New")).toBeNull();
    expect(screen.getByText("Reset on 2026-10-10: The screen moved.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as not done" })).toBeNull();
  });

  it("an updated tour never completed shows no reset line; one completed since shows its date", () => {
    const tour = { ...base, updated: { date: "2026-10-10", reason: "The screen moved." } };
    const { rerender } = render(<TourCatalogueCard tour={tour} onLaunch={() => {}} />);
    expect(screen.queryByText(/Reset on/)).toBeNull();
    expect(screen.queryByText("Updated")).toBeNull();
    rerender(<TourCatalogueCard tour={tour} completedAt="2026-10-12T08:00:00Z" formatDate={(i) => i.slice(0, 10)} onLaunch={() => {}} />);
    expect(screen.getByText("Completed on 2026-10-12")).toBeInTheDocument();
  });
  it("an update without a reason shows the day alone (keksdose K-S3)", () => {
    const tour = { ...base, updated: { date: "2026-10-10" } };
    render(<TourCatalogueCard tour={tour} completedAt="2026-09-01T10:00:00Z" formatDate={(iso) => iso.slice(0, 10)} onLaunch={() => {}} />);
    expect(screen.getByText("Reset on 2026-10-10")).toBeInTheDocument();
  });
});
