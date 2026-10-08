import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Chip } from "../chip";
import { NumberInput } from "../number-input";
import { CompactControls, FieldHint, Input, TOUCH_TARGET_LARGE } from "../ui";
import { ToggleGroup } from "../toggle-group";
import { LineItems, type LineItemsColumn } from "../line-items";
import { ConfirmProvider } from "../confirm-dialog";
import { ShareCard } from "../share-card";
import type { ShareRole } from "../share-card";
import { TranslationReviewPanel } from "../translation-review";
import { translationRows } from "../../lib/translation-review";
import { DemoBanner } from "../../demo/demo-banner";
import { InvitationsPanel } from "../../admin/invitations-panel";
import type { InvitationRow } from "../../admin/invitations-panel";
import { applyTextSize, type TextSize } from "../../theme/text-size";

/**
 * The text-size follow-ups of 0.32 (docs/text-size-harmonization.md §4, §10.8): Chip's
 * touch target and reason line, NumberInput's FieldHint as a caption, the kit's own
 * IconButtons that keep their icon or collapse into RowActions at Large, and a
 * ToggleGroup field of four options wrapping inside its frame.
 *
 * jsdom has no layout and compiles no CSS: a `large:` class is checked as a class
 * contract, and what JS decides (a label drawn, a menu instead of icons, a line instead
 * of a bubble) in the DOM, with `<html data-text-size>` set as the store sets it. The
 * Lightbox's toolbar is tested beside its harness, in lightbox.test.tsx.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

/** A `matchMedia` for a viewport `width` px wide whose pointer is a finger when `coarse`
 *  (as text-size-behaviours-032 stubs it). */
function media({ width = 1280, coarse = false }: { width?: number; coarse?: boolean } = {}) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = /min-width:\s*(\d+)px/.exec(query);
    const max = /max-width:\s*(\d+)px/.exec(query);
    const matches = /pointer:\s*coarse/.test(query)
      ? coarse
      : min
        ? width >= Number(min[1])
        : max
          ? width <= Number(max[1])
          : false;
    return { matches, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

function size(s: TextSize) {
  act(() => applyTextSize(s));
}

const iconLabel = (button: HTMLElement) => button.querySelector("[data-slot=icon-button-label]");

describe("Chip at Large (§4 touch targets)", () => {
  it("a toggle and a link chip reach 48 px; an inert or disabled one keeps its size", () => {
    render(
      <>
        <Chip onClick={() => {}}>Toggle</Chip>
        <Chip href="/somewhere">Link</Chip>
        <Chip>Tag</Chip>
        <Chip onClick={() => {}} disabled>
          Off
        </Chip>
      </>,
    );
    expect(screen.getByRole("button", { name: "Toggle" }).className).toContain(TOUCH_TARGET_LARGE);
    expect(screen.getByRole("link", { name: "Link" }).className).toContain(TOUCH_TARGET_LARGE);
    expect(screen.getByText("Tag").parentElement!.className).not.toContain("large:min-h-[48px]");
    expect(screen.getByRole("button", { name: "Off" }).className).not.toContain("large:min-h-[48px]");
  });

  it("a removable toggle grows its pill (the body stretches to it); the × gets a 48 px hit area", () => {
    render(
      <Chip onClick={() => {}} onRemove={() => {}}>
        Groceries
      </Chip>,
    );
    const body = screen.getByRole("button", { name: "Groceries" });
    const pill = body.parentElement!;
    expect(pill.className).toContain(TOUCH_TARGET_LARGE);
    expect(body.className).toContain("self-stretch");
    const remove = screen.getByRole("button", { name: /Remove/ });
    // IconButton 2xs's pattern: the box keeps its size, an invisible ::after takes the taps.
    expect(remove.className).toContain("relative");
    expect(remove.className).toContain("large:after:inset-[calc((100%-48px)/2)]");
    expect(remove.className).toContain("large:after:content-['']");
  });

  it("an inert removable chip (ChipInput's values) keeps its size; only its × is a target", () => {
    render(<Chip onRemove={() => {}}>Ada</Chip>);
    const remove = screen.getByRole("button", { name: /Remove/ });
    expect(remove.className).toContain("large:after:inset-[calc((100%-48px)/2)]");
    expect(remove.parentElement!.className).not.toContain("large:min-h-[48px]");
  });
});

describe("Chip's disabledReason in the layout (§4 'No fact only in a tooltip')", () => {
  const reason = "Shared with you to read.";

  it("is the tooltip at Normal with a mouse", () => {
    media();
    render(
      <Chip onClick={() => {}} disabledReason={reason}>
        Groceries
      </Chip>,
    );
    const chip = screen.getByRole("button", { name: "Groceries" });
    expect(chip).toHaveAccessibleDescription(reason);
    expect(document.querySelector("[data-slot=disabled-reason]")).toBeNull();
  });

  it("is a visible line under the chip at Large, which describes the chip and its ×", () => {
    media();
    size("large");
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(
      <Chip onClick={onClick} onRemove={onRemove} disabledReason={reason}>
        Groceries
      </Chip>,
    );
    const chip = screen.getByRole("button", { name: "Groceries" });
    const line = screen.getByText(reason);
    expect(line).toBeVisible();
    expect(line.closest("[data-slot=disabled-reason]")).toContainElement(chip);
    expect(chip.getAttribute("aria-describedby")).toBe(line.id);
    expect(screen.getByRole("button", { name: /Remove/ })).toHaveAccessibleDescription(reason);
    fireEvent.click(chip);
    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onClick).not.toHaveBeenCalled();
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("is a line on a touch screen at Normal too", () => {
    media({ coarse: true });
    render(
      <Chip onClick={() => {}} disabledReason={reason}>
        Groceries
      </Chip>,
    );
    expect(screen.getByText(reason)).toBeVisible();
  });

  it("follows disabledReasonDisplay, and stays the tooltip in a compact region", () => {
    media();
    size("large");
    render(
      <>
        <Chip onClick={() => {}} disabledReason="A" disabledReasonDisplay="tooltip">
          One
        </Chip>
        <CompactControls>
          <Chip onClick={() => {}} disabledReason="B">
            Two
          </Chip>
        </CompactControls>
      </>,
    );
    expect(document.querySelector("[data-slot=disabled-reason]")).toBeNull();
    expect(screen.getByRole("button", { name: "One" })).toHaveAccessibleDescription("A");
    expect(screen.getByRole("button", { name: "Two" })).toHaveAccessibleDescription("B");
  });

  it("`line` shows it at Normal with a mouse", () => {
    media();
    render(
      <Chip onClick={() => {}} disabledReason="Locked." disabledReasonDisplay="line">
        Open
      </Chip>,
    );
    expect(screen.getByText("Locked.")).toBeVisible();
  });
});

describe("NumberInput's FieldHint becomes its caption at Large and on touch (§4)", () => {
  const hint = "Excludes transfers between your own accounts";
  const field = (props: { hint?: ReactElement | string } = {}) => (
    <NumberInput label="Total" value="" onChange={() => {}} calculator={false} hint={<FieldHint label={hint} />} {...props} />
  );

  it("is the '?' on the label line at Normal with a mouse", () => {
    media();
    render(field());
    expect(screen.getByRole("button", { name: hint })).toBeInTheDocument();
    expect(screen.getByLabelText("Total")).not.toHaveAccessibleDescription(hint);
  });

  it("is a caption under the field at Large, describing it — as Input's is", () => {
    media();
    size("large");
    render(
      <>
        {field()}
        <Input label="Other" hint={<FieldHint label="Same rule" />} />
      </>,
    );
    expect(screen.queryByRole("button", { name: hint })).toBeNull();
    expect(screen.getByText(hint)).toBeVisible();
    expect(screen.getByLabelText("Total")).toHaveAccessibleDescription(hint);
    expect(screen.getByLabelText("Other")).toHaveAccessibleDescription("Same rule");
  });

  it("is a caption on a touch screen at Normal", () => {
    media({ coarse: true });
    render(field());
    expect(screen.queryByRole("button", { name: hint })).toBeNull();
    expect(screen.getByLabelText("Total")).toHaveAccessibleDescription(hint);
  });

  it("leaves a text hint the caption it always was", () => {
    media();
    render(field({ hint: "Per month" }));
    expect(screen.getByLabelText("Total")).toHaveAccessibleDescription("Per month");
  });
});

describe("The kit's IconButtons at Large (§10.8)", () => {
  it("LineItems: the remove button stays an icon, through both presses", () => {
    size("xlarge");
    interface Line {
      id: string;
    }
    const columns: LineItemsColumn<Line>[] = [
      { key: "a", header: "Account", render: ({ label }) => <input aria-label={label} /> },
    ];
    render(<LineItems items={[{ id: "1" }, { id: "2" }]} columns={columns} onRemove={() => {}} confirmRemove />);
    const remove = screen.getByRole("button", { name: "Remove row 1" });
    expect(iconLabel(remove)).toBeNull();
    fireEvent.click(remove);
    const confirm = screen.getByRole("button", { name: "Remove row 1? Press again to confirm" });
    expect(iconLabel(confirm)).toBeNull();
  });

  it("ShareCard: a grantee's remove and an invitation's withdraw stay icons", () => {
    size("xlarge");
    const roles: ShareRole[] = [
      { key: "viewer", label: "Viewer" },
      { key: "editor", label: "Editor" },
    ];
    render(
      <ConfirmProvider>
        <ShareCard
          grantees={[{ id: 1, name: "Ada Example", email: "ada@example.com", role: "viewer" }]}
          pending={[{ id: 2, email: "grace@example.com", role: "viewer", link: "https://example.com/i/2" }]}
          roles={roles}
          onRoleChange={() => {}}
          onRemove={() => {}}
          onRevokePending={() => {}}
        />
      </ConfirmProvider>,
    );
    expect(iconLabel(screen.getByRole("button", { name: "Remove access" }))).toBeNull();
    expect(iconLabel(screen.getByRole("button", { name: "Withdraw invitation" }))).toBeNull();
  });

  it("TranslationReviewPanel: a row's Approve stays an icon", () => {
    size("large");
    const rows = translationRows({
      locale: "fr",
      strings: { "common.save": "Enregistrer" },
      reference: { "common.save": "Save" },
      reviews: [],
    });
    render(
      <MemoryRouter>
        <TranslationReviewPanel rows={rows} localeLabel="Français" referenceLabel="English" onSave={vi.fn()} onClear={vi.fn()} />
      </MemoryRouter>,
    );
    const row = within(screen.getByRole("table")).getByText("Enregistrer").closest("tr")!;
    const approve = within(row).getByRole("button", { name: "Approve" });
    expect(iconLabel(approve)).toBeNull();
  });

  it("DemoBanner: the details chevron stays an icon", () => {
    size("xlarge");
    render(
      <DemoBanner
        expiresAt={Date.parse("2026-10-07T13:00:00Z")}
        now={() => Date.parse("2026-10-07T12:00:00Z")}
        model="read-only"
        access={{ kind: "request", email: "support@example.com", app: "Ada's Garden Planner" }}
      />,
    );
    const details = screen.getByRole("button", { name: "Demo details" });
    expect(details).toHaveAttribute("aria-expanded", "true");
    expect(iconLabel(details)).toBeNull();
  });

  describe("InvitationsPanel: resend and revoke are the row's actions", () => {
    type Role = "MEMBER";
    const rows: InvitationRow<Role>[] = [
      { id: 1, email: "ada@example.com", created_at: "2026-10-06T10:00:00Z", status: "open", link: "https://example.com/i/1" },
      { id: 2, email: "grace@example.com", created_at: "2026-09-01T10:00:00Z", status: "accepted" },
    ];
    const rowOf = (email: string) => screen.getByText(email).closest("li")!;

    it("two icons at Normal, beside the copy icon — named as before", () => {
      render(<InvitationsPanel<Role> invitations={rows} onResend={vi.fn()} onRevoke={vi.fn()} />);
      const row = within(rowOf("ada@example.com"));
      expect(row.getByRole("button", { name: "Copy invitation link" })).toBeInTheDocument();
      expect(row.getByRole("button", { name: "Send ada@example.com a new link" })).toBeInTheDocument();
      expect(row.getByRole("button", { name: "Revoke the invitation for ada@example.com" })).toBeInTheDocument();
      // An accepted invitation has nothing to resend or revoke.
      expect(within(rowOf("grace@example.com")).queryAllByRole("button")).toHaveLength(0);
    });

    it("one ⋯ menu at Large, the copy icon kept beside it; a choice runs and the ⋯ is busy meanwhile", async () => {
      size("large");
      const user = userEvent.setup();
      let answer: () => void = () => {};
      const onRevoke = vi.fn(() => new Promise<void>((resolve) => (answer = resolve)));
      render(<InvitationsPanel<Role> invitations={rows} onResend={vi.fn()} onRevoke={onRevoke} />);
      const row = within(rowOf("ada@example.com"));
      expect(row.getByRole("button", { name: "Copy invitation link" })).toBeInTheDocument();
      expect(row.queryByRole("button", { name: "Send ada@example.com a new link" })).toBeNull();
      const more = row.getByRole("button", { name: "Actions for ada@example.com" });
      await user.click(more);
      const menu = await screen.findByRole("dialog", { name: "Actions for ada@example.com" });
      expect(within(menu).getAllByRole("button").map((b) => b.textContent)).toEqual([
        "Send ada@example.com a new link",
        "Revoke the invitation for ada@example.com",
      ]);
      await user.click(within(menu).getByRole("button", { name: "Revoke the invitation for ada@example.com" }));
      expect(onRevoke).toHaveBeenCalledWith(rows[0]);
      expect(more).toHaveAttribute("aria-busy", "true");
      await act(async () => answer());
      expect(more).not.toHaveAttribute("aria-busy", "true");
    });
  });
});

describe("ToggleGroup at Large (§4)", () => {
  const GRAINS = [
    { value: "month", label: "Month" },
    { value: "quarter", label: "Quarter" },
    { value: "half", label: "Half-year" },
    { value: "year", label: "Year" },
  ];

  /** A 390 px phone at 125 % is 312 px of Normal type: the showcase's group overflowed there. */
  const at312 = (ui: ReactElement) => render(<div style={{ width: 312 }}>{ui}</div>);

  it("wraps its segments inside the field's frame from Large up, at a 312 px container", () => {
    size("large");
    at312(<ToggleGroup label="Group by" value="month" onChange={() => {}} options={GRAINS} />);
    const group = screen.getByRole("radiogroup", { name: "Group by" });
    expect(group.className.split(" ")).toContain("large:flex-wrap");
    // Still inside the field's chrome: the bordered box round the segments.
    expect(group.parentElement!.className).toContain("border-[var(--border)]");
    // A label wider than a whole row still truncates as the last resort.
    expect(screen.getByRole("radio", { name: "Half-year" }).className).toContain("truncate");
  });

  it("keeps the radio group's keyboard: one Tab stop, the arrows walk across the rows", () => {
    size("xlarge");
    const onChange = vi.fn();
    at312(<ToggleGroup label="Group by" value="half" onChange={onChange} options={GRAINS} />);
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, -1, 0, -1]);
    radios[2].focus();
    fireEvent.keyDown(radios[2], { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("year");
    expect(radios[3]).toHaveFocus();
    fireEvent.keyDown(radios[3], { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("month");
  });

  it("wraps with three options and outside the field chrome too, but not in the strip (0.32.1)", () => {
    at312(
      <>
        <ToggleGroup label="Three" value="month" onChange={() => {}} options={GRAINS.slice(0, 3)} />
        <ToggleGroup aria-label="Bare" value="month" onChange={() => {}} options={GRAINS} />
        <ToggleGroup label="Above" labelPlacement="above" value="month" onChange={() => {}} options={GRAINS} />
        <ToggleGroup label="Strip" labelPlacement="strip" value="month" onChange={() => {}} options={GRAINS} />
        <ToggleGroup label="Wrap" overflow="wrap" value="month" onChange={() => {}} options={GRAINS} />
      </>,
    );
    for (const name of ["Three", "Bare", "Above"]) {
      expect(screen.getByRole("radiogroup", { name }).className.split(" "), name).toContain("large:flex-wrap");
    }
    // The strip's 26 px group lines up with the 42 px fields beside it: one row.
    expect(screen.getByRole("radiogroup", { name: "Strip" }).className).not.toContain("flex-wrap");
    // overflow="wrap" always wraps, so it needs no Large class.
    const wrap = screen.getByRole("radiogroup", { name: "Wrap" }).className.split(" ");
    expect(wrap).toContain("flex-wrap");
    expect(wrap).not.toContain("large:flex-wrap");
  });
});
