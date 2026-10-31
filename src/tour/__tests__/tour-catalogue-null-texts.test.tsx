import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TourCatalogue } from "../tour-catalogue";
import type { TourGroup, TourInfo } from "../tour-info";
import type { TourCatalogueFilter } from "../use-tour-url-sync";

/**
 * 0.52 code review, tour-catalogue.tsx: the tours page's search moved onto `matchesSearch`
 * in 0.51.4 (refactor audit 2026-10-30, DUP-4) and lost the `!!text` guard of its own
 * matcher. `matchesSearch` leaves out only `undefined`, so a tour built from server JSON
 * with `"about": null` threw in `foldForSearch` on the first letter typed, and the tours
 * page crashed.
 */

const GROUPS: TourGroup[] = [{ id: "start", title: "Getting started" }];

// As an app's JSON hands them over: `null` where TourInfo says "absent".
const TOURS = [
  { id: "welcome", title: "Welcome", description: null, about: null, group: "start" },
  { id: "budget", title: "Your budget", description: "Plan a month.", about: null, group: "start" },
] as unknown as TourInfo[];

function Page() {
  const [filter, setFilter] = useState<TourCatalogueFilter>({ query: "", group: null, state: "all" });
  return (
    <TourCatalogue
      tours={TOURS}
      groups={GROUPS}
      completed={{}}
      query={filter.query}
      group={filter.group}
      state={filter.state}
      onChange={(patch) => setFilter((f) => ({ ...f, ...patch }))}
      onLaunch={() => {}}
    />
  );
}

describe("TourCatalogue search over texts an app's JSON left null", () => {
  it("skips a null description or about, as an absent one", () => {
    render(<Page />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search tours" }), { target: { value: "month" } });
    expect(screen.getByText("Your budget")).toBeInTheDocument();
    expect(screen.queryByText("Welcome")).toBeNull();
  });
});
