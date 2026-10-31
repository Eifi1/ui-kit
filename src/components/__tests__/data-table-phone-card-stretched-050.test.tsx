import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "../data-table";
import type { DataTableColumn, DataTableProps } from "../data-table";
import { rowActionsColumn } from "../row-actions";
import { applyTextSize } from "../../theme/text-size";
import { viewportMatchMedia } from "../../test/viewport";

/**
 * 0.50 K4 (kastlan): a phone card whose fields keep their own clicks — a tel: / mailto:
 * link (`noRowLink`), the row's actions (`role: "actions"`) — still opens the row. Its
 * title is the row's link (`rowHref`) or button (`onRowClick` only), stretched over the
 * card with `::after`, and the own-click cells sit above it. jsdom does no hit testing, so
 * a tap on a field (which lands on the stretched `::after` in a browser) is the Chromium
 * check's; these pin the structure, the semantics and the handlers.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

interface Contact {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
}

const ROWS: Contact[] = [
  { id: 1, name: "Ada Example", company: "Example AG", phone: "+41 44 000 00 01", email: "ada@example.com" },
  { id: 2, name: "Ben Sample", company: "Sample GmbH", phone: "+41 44 000 00 02", email: "ben@example.com" },
];

const onDelete = vi.fn();
const actions = rowActionsColumn<Contact>({
  actions: (r) => [{ key: "delete", label: `Delete ${r.name}`, onSelect: () => onDelete(r.id) }],
});

const PLAIN: DataTableColumn<Contact>[] = [
  { key: "name", header: "Name", cell: (r) => r.name, mobilePrimary: true },
  { key: "company", header: "Company", cell: (r) => r.company },
];

const CONTACT: DataTableColumn<Contact>[] = [
  ...PLAIN,
  { key: "phone", header: "Phone", cell: (r) => <a href={`tel:${r.phone}`}>{r.phone}</a>, noRowLink: true },
  { key: "email", header: "Email", cell: (r) => <a href={`mailto:${r.email}`}>{r.email}</a>, noRowLink: true },
];

function renderTable(extra: Partial<DataTableProps<Contact>> = {}, columns = CONTACT) {
  return render(
    <MemoryRouter>
      <DataTable rows={ROWS} columns={columns} rowKey={(r) => r.id} {...extra} />
    </MemoryRouter>,
  );
}

const phone = () => vi.stubGlobal("matchMedia", viewportMatchMedia(390));
const cardOf = (title: string) => screen.getByText(title).closest("li") as HTMLElement;
const titleControl = (card: HTMLElement) => card.querySelector("[data-card-link]") as HTMLElement;

const INTERACTIVE =
  'a[href],button,[role="button"],[role="link"],input,select,textarea,[tabindex]:not([tabindex="-1"])';

/** No interactive element of the card holds another. */
function expectNoNesting(card: HTMLElement) {
  for (const el of card.querySelectorAll(INTERACTIVE)) {
    expect(el.querySelector(INTERACTIVE), `${el.outerHTML.slice(0, 80)} nests a control`).toBeNull();
  }
}

describe("a stretched phone card (0.50 K4)", () => {
  it("with onRowClick only: the title is a button named by the title, the links keep their own taps", () => {
    phone();
    const onRowClick = vi.fn();
    renderTable({ onRowClick });
    const card = cardOf("Ada Example");
    // The card is a plain box now, not a div role="button" around the links.
    expect(card.querySelector('[role="button"]')).toBeNull();
    expect(card.querySelector("[data-card-stretched]")).not.toBeNull();
    const title = within(card).getByRole("button", { name: "Ada Example" });
    expect(title).toBe(titleControl(card));
    expect(title.tagName).toBe("BUTTON");
    expectNoNesting(card);

    fireEvent.click(title);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);

    const tel = within(card).getByRole("link", { name: "+41 44 000 00 01" });
    expect(tel).toHaveAttribute("href", "tel:+41 44 000 00 01");
    fireEvent.click(tel);
    fireEvent.click(within(card).getByRole("link", { name: "ada@example.com" }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("with rowHref: the title is the row's link, a plain click opens the row once", async () => {
    phone();
    const onRowClick = vi.fn();
    renderTable({ onRowClick, rowHref: (r) => `/contacts/${r.id}` });
    const card = cardOf("Ada Example");
    const link = within(card).getByRole("link", { name: "Ada Example" });
    expect(link).toBe(titleControl(card));
    expect(link).toHaveAttribute("href", "/contacts/1");
    expectNoNesting(card);
    fireEvent.click(link);
    expect(onRowClick).toHaveBeenCalledTimes(1);
    // Space opens the row too (Enter is the link's own click).
    link.focus();
    await userEvent.keyboard(" ");
    expect(onRowClick).toHaveBeenCalledTimes(2);
    // A ⌘-click is the browser's: no row opening.
    fireEvent.click(link, { metaKey: true });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("lifts the own-click cells above the title's overlay, and only those", () => {
    phone();
    renderTable({ onRowClick: vi.fn() }, [...CONTACT, actions]);
    const card = cardOf("Ada Example");
    expect(titleControl(card).className).toMatch(/after:absolute/);
    expect(titleControl(card).className).toMatch(/after:inset-0/);
    const dd = (label: string) =>
      Array.from(card.querySelectorAll("dt")).find((dt) => dt.textContent === label)!.nextElementSibling as HTMLElement;
    expect(dd("Phone").className).toMatch(/\brelative\b.*z-\[2\]/);
    expect(dd("Company").className).not.toMatch(/z-\[2\]/);
    const actionCell = within(card)
      .getByRole("button", { name: "Delete Ada Example" })
      .closest("[data-card-actions] > div")!;
    expect(actionCell.className).toMatch(/z-\[2\]/);
    // The keyboard's frame is the card's, drawn while the title control has the focus.
    const box = card.querySelector("[data-card-stretched]")!;
    expect(box.className).toMatch(/\brelative\b/);
    expect(box.className).toContain("has-[[data-card-link]:focus-visible]:ring-focus");
  });

  it("puts the title first in the keyboard order, then the cells' own controls", async () => {
    phone();
    const onRowClick = vi.fn();
    renderTable({ onRowClick }, [...CONTACT, actions]);
    const card = cardOf("Ada Example");
    const user = userEvent.setup();
    titleControl(card).focus();
    await user.tab();
    expect(document.activeElement).toBe(within(card).getByRole("link", { name: "+41 44 000 00 01" }));
    await user.tab();
    expect(document.activeElement).toBe(within(card).getByRole("link", { name: "ada@example.com" }));
    await user.tab();
    expect(document.activeElement).toBe(within(card).getByRole("button", { name: "Delete Ada Example" }));
    onDelete.mockClear();
    fireEvent.click(document.activeElement!);
    expect(onDelete).toHaveBeenCalledWith(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("carries the open state on the title control, and opens the details under the card", () => {
    phone();
    function Harness() {
      const [open, setOpen] = useState<number | null>(null);
      return (
        <MemoryRouter>
          <DataTable
            rows={ROWS}
            columns={[...CONTACT, { key: "notes", header: "Notes", cell: () => "Call after 5" }]}
            rowKey={(r) => r.id}
            mobileDetailsInRow
            isExpanded={(r) => r.id === open}
            onRowClick={(r) => setOpen((o) => (o === r.id ? null : r.id))}
          />
        </MemoryRouter>
      );
    }
    render(<Harness />);
    const card = cardOf("Ada Example");
    const title = titleControl(card);
    expect(title).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(title);
    expect(titleControl(cardOf("Ada Example"))).toHaveAttribute("aria-expanded", "true");
    expect(within(cardOf("Ada Example")).getByText("Call after 5")).toBeInTheDocument();
  });

  it("keeps the long press and selection mode: a press on the title enters it, the card becomes the toggle", () => {
    vi.useFakeTimers();
    phone();
    const onRowClick = vi.fn();
    function Harness() {
      const [picked, setPicked] = useState<Set<number>>(new Set());
      return (
        <MemoryRouter>
          <DataTable
            rows={ROWS}
            columns={CONTACT}
            rowKey={(r) => r.id}
            onRowClick={onRowClick}
            selection={{
              isSelected: (r) => picked.has(r.id),
              onToggle: (r, on) =>
                setPicked((prev) => {
                  const next = new Set(prev);
                  if (on) next.add(r.id);
                  else next.delete(r.id);
                  return next;
                }),
              allSelected: picked.size === ROWS.length,
              someSelected: picked.size > 0,
              onToggleAll: (on) => setPicked(on ? new Set(ROWS.map((r) => r.id)) : new Set()),
            }}
          />
        </MemoryRouter>
      );
    }
    render(<Harness />);
    expect(titleControl(cardOf("Ben Sample"))).not.toBeNull();
    fireEvent.pointerDown(screen.getByText("Ben Sample"), { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: 50, clientY: 50 });
    fireEvent.click(screen.getByText("Ben Sample"));
    expect(onRowClick).not.toHaveBeenCalled();
    expect(document.querySelectorAll("[data-card-selecting]")).toHaveLength(2);
    expect(document.querySelector("[data-card-link]")).toBeNull();
    expect(screen.getByRole("button", { pressed: true })).toHaveTextContent("Ben Sample");
  });

  it("a press on the tel: link does not arm the long press", () => {
    vi.useFakeTimers();
    phone();
    const onToggle = vi.fn();
    renderTable({
      onRowClick: vi.fn(),
      selection: { isSelected: () => false, onToggle, allSelected: false, someSelected: false, onToggleAll: () => {} },
    });
    fireEvent.pointerDown(screen.getByText("+41 44 000 00 01"), { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onToggle).not.toHaveBeenCalled();
    expect(document.querySelector("[data-card-selecting]")).toBeNull();
  });

  it("lifts an own-click field at Large too (stacked fields)", () => {
    phone();
    applyTextSize("large");
    renderTable({ onRowClick: vi.fn() });
    const card = cardOf("Ada Example");
    expect(card.querySelector('[data-card-fields="stacked"]')).not.toBeNull();
    const tel = within(card).getByRole("link", { name: "+41 44 000 00 01" });
    expect(tel.closest("dd")!.className).toMatch(/z-\[2\]/);
    expect(within(card).getByText("Example AG").closest("dd")!.className).not.toMatch(/z-\[2\]/);
  });
});

describe("cards that stay as they were (0.50 K4)", () => {
  it("a card without own-click cells is still the row's one link, or one button", () => {
    phone();
    const { unmount } = renderTable({ onRowClick: vi.fn(), rowHref: (r) => `/contacts/${r.id}` }, PLAIN);
    let card = cardOf("Ada Example");
    expect(card.querySelector("[data-card-link]")).toBeNull();
    expect(within(card).getByRole("link")).toHaveTextContent("Ada ExampleCompanyExample AG");
    unmount();
    renderTable({ onRowClick: vi.fn() }, PLAIN);
    card = cardOf("Ada Example");
    expect(card.querySelector("[data-card-link]")).toBeNull();
    expect(within(card).getByRole("button")).toHaveTextContent(/Ada Example.*Example AG/);
  });

  it('a mobileCard renderer keeps the role="button" fallback', () => {
    phone();
    renderTable({ onRowClick: vi.fn(), rowHref: (r) => `/contacts/${r.id}`, mobileCard: (r) => <span>{r.name}</span> });
    const card = cardOf("Ada Example");
    expect(card.querySelector("[data-card-link]")).toBeNull();
    expect(card.querySelector("a[href]")).toBeNull();
    expect(within(card).getByRole("button")).toBeInTheDocument();
  });

  it("a title that keeps its own clicks keeps the fallback", () => {
    phone();
    const cols = CONTACT.map((c) => (c.key === "name" ? { ...c, noRowLink: true } : c));
    renderTable({ onRowClick: vi.fn() }, cols);
    expect(cardOf("Ada Example").querySelector("[data-card-link]")).toBeNull();
  });

  it("without onRowClick the title is the row's link, and a tap follows it (0.52, audit 2026-10-30 DSP-23 b)", () => {
    // It was no link at all: nothing opened the row in place, and nothing opened it.
    phone();
    renderTable({ rowHref: (r) => `/contacts/${r.id}` });
    const link = document.querySelector<HTMLAnchorElement>("[data-card-link]")!;
    expect(link).toHaveAttribute("href", "/contacts/1");
    expect(link).not.toHaveAttribute("aria-expanded");
    expect(fireEvent.click(link)).toBe(true);
  });
});
