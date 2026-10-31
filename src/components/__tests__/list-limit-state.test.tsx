import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { List, ListItem } from "../list";

/**
 * A `limit`ed List keeps its first rows mounted across Show all / Show fewer (refactor
 * audit 2026-10-30, DSP-20). Folded it rendered `Children.toArray(children).slice(…)`,
 * open the raw `children`; `toArray` re-keys every element (`.$a`), so each toggle
 * remounted the first `limit` rows and dropped their state with them — an expandable
 * row's open state, an uncontrolled input, an app row's own. One array both ways now.
 */
describe("List limit keeps the first rows' state (audit 2026-10-30 DSP-20)", () => {
  const rows = ["a", "b", "c", "d"].map((id) => (
    <ListItem key={id} title={`Row ${id}`} expandedContent={<input aria-label={`Note ${id}`} />} />
  ));

  it("an opened row stays open, and its input keeps what was typed, through Show all and Show fewer", () => {
    render(<List limit={2}>{rows}</List>);
    fireEvent.click(screen.getByRole("button", { name: "Row a" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Note a" }), { target: { value: "kept" } });

    fireEvent.click(screen.getByRole("button", { name: "Show all (4)" }));
    expect(screen.getByRole("button", { name: "Row a" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "Note a" })).toHaveValue("kept");

    fireEvent.click(screen.getByRole("button", { name: "Show fewer" }));
    expect(screen.getByRole("button", { name: "Row a" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "Note a" })).toHaveValue("kept");
  });
});
