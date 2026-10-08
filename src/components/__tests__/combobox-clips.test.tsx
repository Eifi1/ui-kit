import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Combobox } from "../combobox";
import { EntityCombobox } from "../entity-combobox";
import { PickerSheet } from "../picker-sheet";
import { Tooltip } from "../tooltip";
import { CLIPS_ATTRIBUTE } from "../../lib/clipping";

/**
 * keksdose E8: the option lists are scrollers, and now say so where jsdom can see it
 * (`data-clips`, like DataTable's body). A Tooltip in an option — Combobox's
 * `optionAdornment`, an EntityCombobox option's `icon` — therefore portals out in a
 * test as it does in the browser, rather than leaving its always-mounted bubble inside
 * the option to join its accessible name ("Wohnen Translatable"). keksdose's
 * category-name-combobox pinned `portal` to get that.
 */

function mockPhone() {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("width < 768px"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

const badge = (
  <Tooltip label="Translatable">
    <svg aria-hidden data-testid="badge" />
  </Tooltip>
);

describe("option lists are marked as clipping", () => {
  it("PickerSheet's scrolling body carries the marker", () => {
    render(
      <PickerSheet open onClose={() => {}} query="" onQueryChange={() => {}} title="Pick">
        <ul role="listbox" aria-label="Rows">
          <li role="presentation">
            <button type="button" role="option" aria-selected={false}>
              Wohnen {badge}
            </button>
          </li>
        </ul>
      </PickerSheet>,
    );
    const list = screen.getByRole("listbox");
    expect(list.closest(`[${CLIPS_ATTRIBUTE}]`)).not.toBeNull();
    // The bubble is not inside the option, so the name is the row's own text.
    expect(screen.getByRole("option", { name: "Wohnen" })).toBeInTheDocument();
    expect(within(screen.getByRole("option")).queryByText("Translatable")).toBeNull();
  });

  it("the phone Combobox's option keeps its name with a Tooltip adornment (no `portal` pinned)", () => {
    mockPhone();
    render(
      <Combobox
        label="Name"
        value=""
        onChange={() => {}}
        options={["Wohnen", "Essen"]}
        optionAdornment={(o) => (o === "Wohnen" ? badge : null)}
      />,
    );
    fireEvent.focus(screen.getByRole("combobox", { name: /Name/ }));
    expect(screen.getByRole("option", { name: "Wohnen" })).toBeInTheDocument();
    expect(screen.getByTestId("badge").closest(`[${CLIPS_ATTRIBUTE}]`)).not.toBeNull();
  });

  it("ComboboxPanel's listbox carries the marker (desktop), so a Tooltip in an option icon portals", () => {
    render(
      <EntityCombobox<string>
        label="Account"
        value={null}
        onChange={() => {}}
        options={[
          { value: "a", label: "Checking", icon: badge },
          { value: "b", label: "Savings" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("combobox", { name: /Account/ }));
    const list = screen.getByRole("listbox");
    expect(list).toHaveAttribute(CLIPS_ATTRIBUTE);
    expect(screen.getByRole("option", { name: "Checking" })).toBeInTheDocument();
  });

  it("the desktop free-text Combobox's suggestion list carries the marker (keksdose category-name-combobox)", () => {
    render(
      <Combobox
        label="Name"
        value=""
        onChange={() => {}}
        options={["Wohnen", "Essen"]}
        optionAdornment={(o) => (o === "Wohnen" ? badge : null)}
      />,
    );
    fireEvent.focus(screen.getByRole("combobox", { name: /Name/ }));
    expect(screen.getByRole("listbox")).toHaveAttribute(CLIPS_ATTRIBUTE);
    expect(screen.getByRole("option", { name: "Wohnen" })).toBeInTheDocument();
  });
});
