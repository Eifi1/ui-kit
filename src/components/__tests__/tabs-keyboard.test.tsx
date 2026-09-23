import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Tabs } from "../ui";

/**
 * The tab strip's keyboard: the ARIA tabs pattern, pressed rather than read.
 *
 * `tabs.test.tsx` beside this one asserts the CLASS STRINGS — deliberately, because
 * the wrap/no-wrap split is a breakpoint decision that jsdom cannot render and the
 * class string is the only honest evidence. What no test had pressed was the
 * keyboard, and the strip's comment makes two promises that only a keystroke can
 * check: the arrows walk the strip in DOM order (so a WRAPPED strip stays navigable
 * across rows), and activation stays MANUAL — "a tab here can be a real route and
 * moving focus must not navigate".
 *
 * Manual activation is the half that would rot silently. Switch to the automatic
 * flavour of the pattern and nothing looks wrong in a screenshot: arrowing past four
 * report tabs would just fetch four reports, and on a routed strip it would push four
 * entries onto the history stack the Back button then has to walk out of.
 *
 * Driven with `user-event`, because every claim here is about where focus IS.
 */
const TABS = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

/** Controlled, as the component is: the caller owns `active`. */
function Harness({ onChange, wrap = false }: { onChange?: (id: string) => void; wrap?: boolean }) {
  const [active, setActive] = useState("two");
  return (
    <>
      <button type="button">before</button>
      <Tabs
        tabs={TABS}
        active={active}
        wrap={wrap}
        label="Reports"
        onChange={(id) => {
          setActive(id);
          onChange?.(id);
        }}
      />
      <button type="button">after</button>
    </>
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("the tab strip's keyboard", () => {
  it("is one stop in the page's tab order, and that stop is the open tab", async () => {
    // Ten report tabs otherwise cost ten Tab presses to step over on the way to the
    // table below them (live #262).
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(screen.getByRole("button", { name: "before" })).toHaveFocus();
    await user.tab();
    expect(tab("Two")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
  });

  it("walks the strip with Left/Right and wraps around the ends", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.tab();

    await user.keyboard("{ArrowRight}");
    expect(tab("Three")).toHaveFocus();
    // Off the end and round to the front: the strip is a ring, so there is no dead
    // key at either edge.
    await user.keyboard("{ArrowRight}");
    expect(tab("One")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(tab("Three")).toHaveFocus();
  });

  it("jumps to the ends with Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.tab();

    await user.keyboard("{End}");
    expect(tab("Three")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(tab("One")).toHaveFocus();
  });

  it("does not activate the tab it moves onto", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await user.tab();
    await user.tab();

    await user.keyboard("{ArrowRight}{ArrowRight}{Home}{End}");
    expect(onChange).not.toHaveBeenCalled();
    // The selection has not moved either — `aria-selected` still names the open tab,
    // not the one the keyboard is looking at.
    expect(tab("Two")).toHaveAttribute("aria-selected", "true");
    expect(tab("Three")).toHaveAttribute("aria-selected", "false");
  });

  it("activates the focused tab on Enter and on Space", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    await user.tab();
    await user.tab();

    await user.keyboard("{ArrowRight}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith("three");
    expect(tab("Three")).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowRight}[Space]");
    expect(onChange).toHaveBeenLastCalledWith("one");
    expect(tab("One")).toHaveAttribute("aria-selected", "true");
  });

  it("moves the single tab stop to whatever the user activated", async () => {
    // The roving stop follows the SELECTION rather than the focus, so Tab out and
    // back must return to the tab the user chose — not to the one they arrowed past.
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.tab();
    await user.keyboard("{ArrowRight}{Enter}");

    await user.tab();
    expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(tab("Three")).toHaveFocus();
  });

  it("keeps the same keyboard when the strip wraps onto several rows", async () => {
    // The wrapped strip is the reason the handler walks DOM order instead of
    // geometry: the rows flow in DOM order too, so Right off the end of row one
    // lands on the first chip of row two rather than nowhere.
    const user = userEvent.setup();
    render(<Harness wrap />);
    await user.tab();
    await user.tab();
    expect(tab("Two")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(tab("Three")).toHaveFocus();
    await user.keyboard("{Home}");
    expect(tab("One")).toHaveFocus();
  });
});
