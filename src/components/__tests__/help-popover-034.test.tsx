import type { FormEvent, ReactNode } from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldHint, FOCUS_RING, Input, Select } from "../ui";
import { HelpPopover } from "../help-popover";
import { NumberInput } from "../number-input";
import { AmountInput } from "../amount-input";
import { ToggleGroup } from "../toggle-group";
import { applyTextSize } from "../../theme/text-size";

/**
 * keksdose K3 (live #400): paragraph-long HELP behind a "?" that opens on a tap — the
 * kit Popover — rather than a FieldHint, which since 0.32 prints its words under the
 * field at Large and on a touch screen (§4 "No fact only in a tooltip"). That rule stays
 * for a FieldHint, a fact; a HelpPopover is help, and stays a "?" at every size
 * (docs/text-size-harmonization.md §10.23).
 */

const QUESTION = "What do the statuses mean?";
const HELP =
  "Pending: entered, not yet seen by the bank. Accepted: the bank has it. Cleared: it is on the statement. Reconciled: checked against the statement.";

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

/** A `matchMedia` whose primary pointer is a finger when `coarse` (the §4 test's). */
function media({ coarse = false }: { coarse?: boolean } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: /pointer:\s*coarse/.test(query) ? coarse : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

function help() {
  return <HelpPopover label={QUESTION}>{HELP}</HelpPopover>;
}

describe("HelpPopover", () => {
  it("is a '?' button named by its question, closed until pressed", () => {
    render(help());
    const button = screen.getByRole("button", { name: QUESTION });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-haspopup", "dialog");
    expect(button.className).toContain(FOCUS_RING);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The help is not on the page until asked for.
    expect(screen.queryByText(HELP)).toBeNull();
  });

  it("opens on a click: a dialog named by the question, described by the help, holding the focus", async () => {
    const user = userEvent.setup();
    render(help());
    const button = screen.getByRole("button", { name: QUESTION });
    await user.click(button);
    const panel = screen.getByRole("dialog", { name: QUESTION });
    expect(panel).toHaveAccessibleDescription(HELP);
    expect(within(panel).getByText(HELP)).toBeVisible();
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveFocus();
  });

  it("closes on a second press, and on Escape with the focus back on the '?'", async () => {
    const user = userEvent.setup();
    render(help());
    const button = screen.getByRole("button", { name: QUESTION });
    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(button).toHaveFocus();
  });

  it("opens from the keyboard (Enter, Space), and reaches a keyboard at all", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        {help()}
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Before" }));
    await user.tab();
    const button = screen.getByRole("button", { name: QUESTION });
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.keyboard(" ");
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
  });

  it("never submits the form its field stands in", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Input label="Status" hint={help()} />
      </form>,
    );
    await user.click(screen.getByRole("button", { name: QUESTION }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
  });

  it("takes the panel's width, a paragraph's measure by default", async () => {
    const user = userEvent.setup();
    render(
      <HelpPopover label={QUESTION} width={200}>
        {HELP}
      </HelpPopover>,
    );
    await user.click(screen.getByRole("button", { name: QUESTION }));
    // Capped by the viewport (jsdom: 1024 px), so a px width shows as given.
    expect(screen.getByRole("dialog").style.width).toBe("200px");
  });
});

describe("a HelpPopover stays on the label line where a FieldHint becomes a caption (§10.23)", () => {
  /** Each kit field that takes a `hint`, with the HelpPopover and a FieldHint (a fact). */
  const fields = (hint: ReactNode) => [
    ["Input", <Input key="i" label="Status" hint={hint} />],
    [
      "Select",
      <Select key="s" label="Status" hint={hint} defaultValue="a">
        <option value="a">Pending</option>
      </Select>,
    ],
    ["NumberInput", <NumberInput key="n" label="Status" value="1" onChange={() => {}} hint={hint} />],
    ["AmountInput", <AmountInput key="a" label="Status" value="1" onChange={() => {}} hint={hint} />],
    [
      "ToggleGroup",
      <ToggleGroup
        key="t"
        label="Status"
        hint={hint}
        value="a"
        onChange={() => {}}
        options={[
          { value: "a", label: "Pending" },
          { value: "b", label: "Cleared" },
        ]}
      />,
    ],
  ] as const;

  for (const where of ["touch", "large"] as const) {
    for (const [name] of fields(null)) {
      it(`${name}: on ${where === "touch" ? "a touch screen" : "Large"} the '?' stays and nothing is printed`, async () => {
        media({ coarse: where === "touch" });
        if (where === "large") act(() => applyTextSize("large"));
        const element = fields(help()).find(([n]) => n === name)![1];
        const user = userEvent.setup();
        render(element);
        expect(screen.queryByText(HELP)).toBeNull();
        await user.click(screen.getByRole("button", { name: QUESTION }));
        expect(screen.getByRole("dialog", { name: QUESTION })).toHaveAccessibleDescription(HELP);
      });
    }
  }

  it("while a FieldHint on the same fields is printed as their caption on touch — AmountInput too (0.34)", () => {
    media({ coarse: true });
    const fact = "Excludes transfers between your own accounts";
    for (const [, element] of fields(<FieldHint label={fact} />)) {
      const { unmount } = render(element);
      expect(screen.queryByRole("button", { name: fact })).toBeNull();
      expect(screen.getByText(fact)).toBeVisible();
      unmount();
    }
  });

  it("on an unlabelled field, at the end edge outside the box", () => {
    render(<Input aria-label="Status" hint={help()} />);
    const input = screen.getByRole("textbox", { name: "Status" });
    const button = screen.getByRole("button", { name: QUESTION });
    // EndHintRow: one flex row, the field first and the "?" after it.
    const row = button.parentElement!.parentElement!;
    expect(row).toHaveClass("flex");
    expect(row).toContainElement(input);
    expect(input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(button);
    expect(screen.getByRole("dialog", { name: QUESTION })).toBeInTheDocument();
  });
});
