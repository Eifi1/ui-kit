import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Pagination } from "../data-table-pagination";
import { WizardStepper } from "../wizard-stepper";
import { Button, Card, CardAction, CardHeader, CardTitle, IconButton } from "../ui";
import { ConfirmProvider } from "../confirm-dialog";
import { ShareCard } from "../share-card";
import type { ShareRole } from "../share-card";
import { WriteLockProvider } from "../write-lock";
import { DatePicker, DateRangePicker } from "../date-picker";
import { MonthPicker } from "../month-picker";
import { PhoneInput } from "../phone-input";
import { ButtonGroup } from "../button-group";
import { WizardSummary } from "../../wizard/wizard-summary";
import { applyTextSize, type TextSize } from "../../theme/text-size";

/**
 * The 0.32.1 sweep at 360 px and Extra large (docs/text-size-harmonization.md §3.3, §4:
 * nothing overflows, nothing truncates — a 360 px phone at 150 % is 240 px of layout).
 * The kit parts the sweep found running past the screen, or cut to a letter, now wrap,
 * stack or share their row.
 *
 * jsdom has no layout and compiles no CSS: a `large:` class is checked as a class
 * contract, and what JS decides (the pager's window, a reason line or a tooltip) in the
 * DOM, with `<html data-text-size>` set as the store sets it.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

/** A `matchMedia` for a viewport `width` px wide (as text-size-follow-ups-032 stubs it). */
function media({ width = 1280, coarse = false }: { width?: number; coarse?: boolean } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /width\s*<\s*(\d+)px/.exec(query);
    const matches = /pointer:\s*coarse/.test(query)
      ? coarse
      : min
        ? width >= Number(min[1])
        : max
          ? width < Number(max[1])
          : false;
    return { matches, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

function size(s: TextSize) {
  act(() => applyTextSize(s));
}

const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

describe("Pagination (0.32.1)", () => {
  const pager = () => (
    <Pagination page={0} totalPages={494} pageSize={25} total={12_345} onPage={() => {}} locale="en-GB" />
  );
  const numbers = () =>
    within(document.querySelector("[data-slot=page-numbers]") as HTMLElement)
      .getAllByRole("button")
      .map((b) => b.textContent);

  it("keeps the arrows at the ends and lets the numbers between them wrap", () => {
    render(pager());
    const strip = document.querySelector("[data-slot=page-strip]")!;
    expect(classes(strip)).toEqual(expect.arrayContaining(["min-w-0", "max-w-full"]));
    expect(classes(strip)).not.toContain("flex-wrap");
    const group = document.querySelector("[data-slot=page-numbers]")!;
    expect(classes(group)).toEqual(expect.arrayContaining(["flex-wrap", "min-w-0", "justify-center"]));
    // The arrows are the strip's own children, outside the wrapping numbers.
    expect(within(strip as HTMLElement).getByRole("button", { name: "Previous page" }).parentElement).toBe(strip);
    expect(within(strip as HTMLElement).getByRole("button", { name: "Next page" }).parentElement).toBe(strip);
  });

  it("shows ±2 pages at Normal and on a wide screen at Large, ±1 on a phone at Large", () => {
    media({ width: 390 });
    const { unmount } = render(pager());
    expect(numbers()).toEqual(["1", "2", "3", "494"]);
    unmount();

    size("xlarge");
    media({ width: 1280 });
    const wide = render(pager());
    expect(numbers()).toEqual(["1", "2", "3", "494"]);
    wide.unmount();

    media({ width: 390 });
    render(pager());
    expect(numbers()).toEqual(["1", "2", "494"]);
  });

  it("still lists every page when there are few enough (five on a phone at Large)", () => {
    size("large");
    media({ width: 390 });
    render(<Pagination page={0} totalPages={5} pageSize={10} total={50} onPage={() => {}} />);
    expect(numbers()).toEqual(["1", "2", "3", "4", "5"]);
  });
});

describe("WizardStepper (0.32.1)", () => {
  it("wraps its steps", () => {
    render(
      <WizardStepper
        ariaLabel="Import"
        current="upload"
        steps={[
          { key: "upload", label: "Upload" },
          { key: "map", label: "Map columns" },
          { key: "confirm", label: "Confirm" },
        ]}
      />,
    );
    expect(classes(screen.getByRole("list", { name: "Import" }))).toContain("flex-wrap");
  });
});

describe("CardHeader's action at Large (0.32.1)", () => {
  const header = (stackAction?: boolean) => {
    const { container } = render(
      <Card>
        <CardHeader stackAction={stackAction}>
          <CardTitle>Sessions</CardTitle>
          <CardAction>
            <IconButton label="Refresh sessions">↻</IconButton>
          </CardAction>
        </CardHeader>
      </Card>,
    );
    return classes(container.querySelector("[data-slot=card-header]")!);
  };

  it("unset, stacks the action under the title below sm at Large only", () => {
    const cls = header();
    expect(cls).toContain("large:max-sm:grid-cols-1");
    expect(cls).toContain("large:max-sm:[&>[data-slot=card-action]]:col-start-1");
    expect(cls).not.toContain("max-sm:grid-cols-1");
  });

  it("stackAction stacks at every size; stackAction={false} never", () => {
    const always = header(true);
    expect(always).toContain("max-sm:grid-cols-1");
    expect(always).not.toContain("large:max-sm:grid-cols-1");
    const never = header(false);
    expect(never.some((c) => c.includes("grid-cols-1"))).toBe(false);
  });

  it("WizardSummary's pencil, an icon at every size, stays beside its title", () => {
    const { container } = render(
      <WizardSummary
        sections={[{ label: "Account", stepIndex: 0, items: [{ label: "Name", value: "Ada Example" }] }]}
        onEditStep={() => {}}
      />,
    );
    const cls = classes(container.querySelector("[data-slot=card-header]")!);
    expect(cls.some((c) => c.includes("grid-cols-1"))).toBe(false);
  });
});

describe("ShareCard's row controls (0.32.1)", () => {
  const roles: ShareRole[] = [
    { key: "viewer", label: "Viewer" },
    { key: "editor", label: "Editor" },
  ];
  const card = (withForm: boolean) =>
    render(
      <ConfirmProvider>
        <WriteLockProvider locked reason="Shared with you to read.">
          <ShareCard
            grantees={[{ id: 1, name: "Ada Example", email: "ada@example.com", role: "viewer" }]}
            pending={[{ id: 2, email: "grace@example.com", role: "viewer" }]}
            roles={roles}
            onAdd={withForm ? () => {} : undefined}
            onRoleChange={() => {}}
            onRemove={() => {}}
            onRevokePending={() => {}}
          />
        </WriteLockProvider>
      </ConfirmProvider>,
    );
  const reasonLine = (name: string) => screen.getByRole("button", { name }).closest("[data-slot=disabled-reason]");

  it("hold to the row and wrap inside it", () => {
    card(true);
    const box = screen.getByRole("button", { name: "Remove access" }).closest(".ms-auto")!;
    expect(classes(box)).toEqual(expect.arrayContaining(["flex-wrap", "min-w-0", "max-w-full"]));
    expect(classes(box)).not.toContain("shrink-0");
  });

  it("under a lock at Large, say the reason once, under Share, when the form is there", () => {
    size("large");
    card(true);
    expect(reasonLine("Share")).not.toBeNull();
    expect(reasonLine("Remove access")).toBeNull();
    expect(reasonLine("Withdraw invitation")).toBeNull();
  });

  it("without the form, the rows keep their reason lines — the only place it is said", () => {
    size("large");
    card(false);
    expect(reasonLine("Remove access")).not.toBeNull();
    expect(reasonLine("Withdraw invitation")).not.toBeNull();
  });
});

describe("Date and month fields at Large (0.32.1)", () => {
  it("the trigger's value wraps at Large instead of truncating", () => {
    render(
      <DateRangePicker label="Statement period" from="2026-09-01" to="2026-09-30" onChange={() => {}} locale="en-GB" />,
    );
    const value = screen.getByText(/2026.*2026/);
    // 0.33 (§10.17): the kit's one utility for "truncate at Normal, wrap at Large".
    expect(classes(value)).toContain("truncate-until-large");
  });

  it("the ‹ date › row stacks on a phone at Large: the field on its own line, the buttons under it", () => {
    const { container } = render(
      <DatePicker label="Booking date" value="2026-09-07" onChange={() => {}} step today="2026-10-02" />,
    );
    const field = container.querySelector("[data-slot=date-step-field]")!;
    const row = field.parentElement!;
    expect(classes(row)).toEqual(
      expect.arrayContaining([
        "large:max-sm:flex-wrap",
        "large:max-sm:[&>[data-slot=date-step-field]]:order-first",
        "large:max-sm:[&>[data-slot=date-step-field]]:basis-full",
        "large:max-sm:[&_[role=combobox]]:rounded-md",
        "large:max-sm:[&>span]:flex-1",
      ]),
    );
  });

  it("a bare DatePicker carries no row marker", () => {
    const { container } = render(<DatePicker label="Booking date" value="2026-09-07" onChange={() => {}} />);
    expect(container.querySelector("[data-slot=date-step-field]")).toBeNull();
  });

  it("MonthPicker's stepper puts its buttons on the next line when they do not fit", () => {
    const { container } = render(
      <MonthPicker variant="stepper" value="2026-10" onChange={() => {}} currentMonth="2026-10" locale="en-GB" />,
    );
    expect(classes(container.firstElementChild!)).toContain("flex-wrap");
  });

  it("PhoneInput gives the number its own line on a phone at Large", () => {
    render(<PhoneInput label="Phone" value="" onValueChange={() => {}} />);
    const input = screen.getByRole("textbox", { name: "Phone" });
    const row = screen.getByRole("combobox").closest(".flex")!;
    expect(classes(row)).toContain("large:max-sm:flex-wrap");
    expect(row.contains(input)).toBe(true);
    const cell = Array.from(row.children).find((c) => c.contains(input))!;
    expect(classes(cell)).toContain("large:max-sm:basis-full");
  });
});

describe("ButtonGroup, joined, at Large (0.32.1)", () => {
  it("a row wraps, its frame drawn by the members", () => {
    render(
      <ButtonGroup aria-label="Display pages">
        <Button variant="secondary">Buttons</Button>
        <Button variant="secondary">Chips</Button>
        <Button variant="secondary">Feedback</Button>
      </ButtonGroup>,
    );
    const cls = classes(screen.getByRole("group", { name: "Display pages" }));
    expect(cls).toEqual(
      expect.arrayContaining([
        "large:flex-wrap",
        "large:max-w-full",
        "large:border-0",
        "large:[&>*]:border",
        "large:[&>*]:-ms-px",
        "large:[&>*]:-mt-px",
        "large:[&>*]:grow",
      ]),
    );
    // Normal keeps the group's own frame.
    expect(cls).toContain("border");
    expect(cls).not.toContain("flex-wrap");
  });

  it("a column and a gapped group are left as they were", () => {
    render(
      <>
        <ButtonGroup aria-label="Zoom" orientation="vertical">
          <Button>+</Button>
          <Button>−</Button>
        </ButtonGroup>
        <ButtonGroup aria-label="Discs" variant="gapped">
          <Button>A</Button>
          <Button>B</Button>
        </ButtonGroup>
      </>,
    );
    for (const name of ["Zoom", "Discs"]) {
      expect(classes(screen.getByRole("group", { name })), name).not.toContain("large:flex-wrap");
    }
  });
});
