import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Tabs } from "../tabs";

/**
 * A strip with NO tab open (refactor audit 2026-10-30, DSP-1).
 *
 * "No sheet open is a real state": Kurvenschmiede's ride-level and hysteresis sheet strips
 * start with nothing open and pass `active=""`, an id no tab has. The roving tab stop
 * followed the selection only, so with no selection every tab was `tabindex="-1"` and
 * the keyboard could not reach the strip at all — the only way to open a sheet. And
 * deleting the open sheet drops the tab and the selection in one render, so the removal's
 * focus target was an index of -1 and focus fell to `<body>`.
 */
const SHEETS = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

/** KS's sheet strip: `activeId ?? ""`, and a delete of the open sheet clears it. */
function Sheets({ initial = null }: { initial?: string | null }) {
  const [tabs, setTabs] = useState(SHEETS);
  const [open, setOpen] = useState<string | null>(initial);
  return (
    <>
      <button type="button">before</button>
      <Tabs
        aria-label="Sheets"
        tabs={tabs}
        active={open ?? ""}
        onChange={setOpen}
        onRemove={(id) => {
          setTabs((t) => t.filter((x) => x.id !== id));
          if (id === open) setOpen(null);
        }}
      />
      <button type="button">after</button>
    </>
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("a tab strip with no tab open", () => {
  it("keeps one tab stop, on the first tab", async () => {
    const user = userEvent.setup();
    render(<Sheets />);
    expect(tab("One")).toHaveAttribute("tabindex", "0");
    expect(tab("Two")).toHaveAttribute("tabindex", "-1");
    expect(tab("Three")).toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(screen.getByRole("button", { name: "before" })).toHaveFocus();
    await user.tab();
    expect(tab("One")).toHaveFocus();
  });

  it("puts focus on the removed tab's neighbour when the removal leaves nothing open", async () => {
    const user = userEvent.setup();
    render(<Sheets initial="two" />);
    tab("Two").focus();
    await user.keyboard("{Delete}");
    expect(screen.queryByRole("tab", { name: "Two" })).toBeNull();
    expect(screen.getAllByRole("tab").map((t) => t.getAttribute("aria-selected"))).toEqual(["false", "false"]);
    expect(tab("Three")).toHaveFocus();
    // …and the strip still has its stop for the next visit.
    expect(tab("One")).toHaveAttribute("tabindex", "0");
  });
});
