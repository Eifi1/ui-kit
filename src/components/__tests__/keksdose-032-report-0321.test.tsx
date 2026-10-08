import { render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "../data-table";
import { TranslationReviewPanel } from "../translation-review";
import { translationRows } from "../../lib/translation-review";
import { StatusDot } from "../status-dot";
import { Chip } from "../chip";
import { InlineEditField } from "../inline-edit-field";
import { SwipeableRow } from "../swipeable-row";
import { usePhoneLayout } from "../../hooks/use-breakpoint";

/**
 * 0.32.1: four items from keksdose's 0.32 adoption report (their numbering).
 *
 *  8. DataTable and TranslationReviewPanel decide "phone" with `usePhoneLayout()`
 *     itself (§10.4: the single answer), and `max-*` is range syntax, so it is the
 *     exact complement of `md` at a fractional width (use-breakpoint-032 holds that).
 * 16. StatusDot's label, Chip's label and InlineEditField's value wrap at Large instead
 *     of truncating (§4 "nothing truncates"); Normal keeps its one line.
 * 18. SwipeableRow's hidden keyboard buttons carry no padding or border until they show.
 * 28. tokens.css's dark scrollbar is painted from the palette tokens.
 *
 * jsdom has no layout and compiles no CSS: the wrapping is checked as a class contract.
 * The synthetic data names nobody real.
 */

afterEach(() => {
  vi.unstubAllGlobals();
});

const classes = (el: Element) => (el.getAttribute("class") ?? "").split(/\s+/);

/** A `matchMedia` evaluating width queries against a viewport `width` px wide, fractions
 *  included, as a browser does: `(min-width: N)`, `(max-width: N)`, `(width < N)`. */
function viewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*([\d.]+)px/.exec(query);
    const maxWidth = /max-width:\s*([\d.]+)px/.exec(query);
    const below = /width\s*<\s*([\d.]+)px/.exec(query);
    const matches = min
      ? width >= Number(min[1])
      : maxWidth
        ? width <= Number(maxWidth[1])
        : below
          ? width < Number(below[1])
          : false;
    return { matches, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

/** A `matchMedia` answering every query with `answer`, as a test stub often does. */
function everyQuery(answer: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: answer,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

describe("8: one phone answer for DataTable, TranslationReviewPanel and usePhoneLayout()", () => {
  interface Row {
    id: number;
    name: string;
  }
  const columns: DataTableColumn<Row>[] = [{ key: "name", header: "Name", cell: (r) => r.name }];
  const table = () =>
    render(
      <MemoryRouter>
        <DataTable rows={[{ id: 1, name: "Ada Example" }]} columns={columns} rowKey={(r) => r.id} />
      </MemoryRouter>,
    );
  const panel = () =>
    render(
      <MemoryRouter>
        <TranslationReviewPanel
          rows={translationRows({
            locale: "fr",
            strings: { "demo.greeting": "Bonjour" },
            reference: { "demo.greeting": "Hello" },
            reviews: [],
          })}
          localeLabel="Français"
          referenceLabel="English"
          onSave={vi.fn()}
          onClear={vi.fn()}
        />
      </MemoryRouter>,
    );
  const phone = () => renderHook(() => usePhoneLayout()).result.current;

  // 767.5 px: a zoomed page, or an Android device-pixel ratio. The old pair
  // `(min-width: 768px)` / `(max-width: 767px)` matched neither, so the table showed its
  // cards while `usePhoneLayout()` said "not a phone".
  for (const [width, isPhone] of [
    [767.5, true],
    [767.99, true],
    [768, false],
    [390, true],
    [1280, false],
  ] as const) {
    it(`at ${width} px both show the ${isPhone ? "phone" : "wide"} layout, as usePhoneLayout() says`, () => {
      viewport(width);
      expect(phone()).toBe(isPhone);
      const t = table();
      expect(screen.queryByRole("table") === null).toBe(isPhone);
      t.unmount();
      const p = panel();
      expect(p.container.querySelector("table") === null).toBe(isPhone);
    });
  }

  // Whatever a stub answers, the table and the hook agree: they ask the same query.
  for (const answer of [true, false]) {
    it(`agrees with usePhoneLayout() when every query answers ${answer}`, () => {
      everyQuery(answer);
      const isPhone = phone();
      expect(isPhone).toBe(answer);
      const t = table();
      expect(screen.queryByRole("table") === null).toBe(isPhone);
      t.unmount();
      const p = panel();
      expect(p.container.querySelector("table") === null).toBe(isPhone);
    });
  }
});

describe("16: labels wrap at Large instead of truncating", () => {
  // `break-words`, not `anywhere`: in a table cell `anywhere` let an auto-sized column
  // squeeze the label to a letter per line.
  const WRAP = ["large:whitespace-normal", "large:break-words"];

  it("StatusDot: the label keeps `truncate` at Normal and wraps at Large", () => {
    render(<StatusDot tone="success" label="Zur Prüfung zurücklegen" />);
    const label = screen.getByText("Zur Prüfung zurücklegen");
    expect(classes(label)).toEqual(expect.arrayContaining(["min-w-0", "truncate", ...WRAP]));
    expect(classes(label)).not.toContain("large:[overflow-wrap:anywhere]");
  });

  it("StatusDot: the dot sits on the label's first line at Large, at every size", () => {
    const offsets = { sm: "0.5rem", md: "0.625rem", lg: "0.75rem" } as const;
    for (const size of ["sm", "md", "lg"] as const) {
      const { container, unmount } = render(<StatusDot size={size} label="Rented" />);
      const outer = container.firstElementChild!;
      expect(classes(outer)).toEqual(expect.arrayContaining(["items-center", "large:items-start"]));
      const dot = outer.querySelector("[aria-hidden]")!;
      // Half of what one line (1lh, inherited from the label's text size) leaves round it.
      expect(classes(dot)).toContain(`large:mt-[calc((1lh_-_${offsets[size]})/2)]`);
      unmount();
    }
  });

  it("StatusDot: a dot without a label gets no first-line offset", () => {
    const { container } = render(<StatusDot aria-label="Online" />);
    expect((container.firstElementChild!.getAttribute("class") ?? "").includes("large:mt-")).toBe(false);
  });

  it("Chip: a text label keeps `truncate` at Normal and wraps at Large, at every size", () => {
    for (const size of ["xs", "sm", "md", "lg"] as const) {
      const { unmount } = render(<Chip size={size}>Zur Prüfung zurücklegen</Chip>);
      const label = screen.getByText("Zur Prüfung zurücklegen");
      expect(classes(label)).toEqual(expect.arrayContaining(["truncate", ...WRAP]));
      // No fixed height anywhere up the pill, so it grows with its lines.
      for (let el: Element | null = label; el && el !== document.body; el = el.parentElement) {
        expect(classes(el).filter((c) => /^h-/.test(c))).toEqual([]);
      }
      unmount();
    }
  });

  it("Chip: an interactive and a removable chip's label wraps too", () => {
    render(
      <div>
        <Chip onClick={() => {}}>Zur Prüfung zurücklegen</Chip>
        <Chip onRemove={() => {}}>Ada Example</Chip>
      </div>,
    );
    expect(classes(screen.getByText("Zur Prüfung zurücklegen"))).toEqual(expect.arrayContaining(WRAP));
    expect(classes(screen.getByText("Ada Example"))).toEqual(expect.arrayContaining(WRAP));
  });

  it("InlineEditField: the display button, the locked button and the read-only text wrap at Large", () => {
    const value = "ada.example@example.org";
    const { unmount } = render(<InlineEditField value={value} onCommit={() => {}} label="E-mail" />);
    expect(classes(screen.getByRole("button", { name: value }))).toEqual(
      expect.arrayContaining(["block", "w-full", "truncate", ...WRAP]),
    );
    unmount();

    const locked = render(
      <InlineEditField value={value} onCommit={() => {}} label="E-mail" disabledReason="The period is closed." />,
    );
    expect(classes(screen.getByRole("button", { name: value }))).toEqual(expect.arrayContaining(["truncate", ...WRAP]));
    locked.unmount();

    render(<InlineEditField value={value} onCommit={() => {}} label="E-mail" readOnly />);
    expect(classes(screen.getByText(value))).toEqual(expect.arrayContaining(["truncate", ...WRAP]));
  });
});

describe("18: SwipeableRow's hidden keyboard buttons take no room until they show", () => {
  it("puts the padding and the border behind `focus:`, beside `focus:not-sr-only`", () => {
    render(
      <SwipeableRow
        left={[{ onCommit: vi.fn(), label: "Delete", className: "bg-[var(--danger)]", armedClassName: "bg-[var(--danger)]" }]}
      >
        <span>Ada Example</span>
      </SwipeableRow>,
    );
    const button = screen.getByRole("button", { name: "Delete" });
    const own = classes(button);
    expect(own).toEqual(expect.arrayContaining(["sr-only", "focus:not-sr-only", "focus:px-2", "focus:py-1", "focus:border"]));
    // Unconditional, each beat sr-only's `padding: 0` / `border-width: 0`: a 26 px box
    // past the row's end at Extra large, counted in the page's scroll width.
    for (const box of ["px-2", "py-1", "border", "p-1", "p-2"]) expect(own).not.toContain(box);
  });
});

describe("28: the dark scrollbar is painted from the palette tokens", () => {
  const CSS = Object.values(
    import.meta.glob<string>("../../../tokens.css", { query: "?raw", import: "default", eager: true }),
  )[0];
  const start = CSS.indexOf("/* Scrollbars:");
  const end = CSS.indexOf("}", CSS.indexOf(".dark ::-webkit-scrollbar-corner")) + 1;
  const rules = CSS.slice(CSS.indexOf("*/", start) + 2, end);

  it("holds no colour literal, so a preset and More contrast carry through", () => {
    expect(start).toBeGreaterThan(-1);
    expect(rules).toContain(".dark ::-webkit-scrollbar-thumb");
    expect(rules).not.toMatch(/rgb|hsl|#[0-9a-f]{3,8}\b|slate/i);
  });

  it("is a border-coloured thumb on the page, `--border-strong` under the pointer", () => {
    expect(rules).toMatch(/scrollbar-color:\s*var\(--border\)\s+var\(--bg-page\);/);
    expect(rules).toMatch(/-webkit-scrollbar-track\s*\{\s*background-color:\s*var\(--bg-page\);/);
    expect(rules).toMatch(/-webkit-scrollbar-thumb\s*\{\s*background-color:\s*var\(--border\);/);
    expect(rules).toMatch(/border:\s*2px solid var\(--bg-page\);/);
    expect(rules).toMatch(/-webkit-scrollbar-thumb:hover\s*\{\s*background-color:\s*var\(--border-strong\);/);
    expect(rules).toMatch(/-webkit-scrollbar-corner\s*\{\s*background-color:\s*var\(--bg-page\);/);
  });
});
