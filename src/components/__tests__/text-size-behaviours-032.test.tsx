import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Trash2 } from "lucide-react";
import {
  Button,
  Card,
  CompactControls,
  FieldHint,
  FOCUS_RING,
  FOCUS_RING_WIDTH,
  IconButton,
  Input,
  TOUCH_TARGET_LARGE,
} from "../ui";
import { Switch } from "../switch";
import { Checkbox } from "../checkbox";
import { Slider } from "../slider";
import { ToggleGroup } from "../toggle-group";
import { ChoiceCard } from "../choice-card";
import { FormActions } from "../form-actions";
import { StatTile } from "../stat-tile";
import { DateMark } from "../account-chips";
import { SignChip } from "../sign-chip";
import { FieldSyncIndicator } from "../field-sync";
import { applyTextSize, type TextSize } from "../../theme/text-size";

/**
 * The component behaviours of 0.32 at the three text sizes
 * (docs/text-size-harmonization.md §4, §10.8): touch targets, IconButton's visible label,
 * no fact only in a tooltip (disabled reasons, hints, dates, words), FormActions'
 * stack, StatTile's one big number, and the px arithmetic in rem (§3.2).
 *
 * jsdom has no layout and compiles no CSS, so a `large:` class is checked as a class
 * contract; what JS decides (a label rendered, a tooltip dropped, a reason shown) is
 * checked in the DOM, with `<html data-text-size>` set as the store would set it.
 */

afterEach(() => {
  document.documentElement.removeAttribute("data-text-size");
  vi.unstubAllGlobals();
});

/** A `matchMedia` for a viewport `width` px wide (min/max-width evaluated as a browser
 *  would, as use-breakpoint-032 does) whose pointer is a finger when `coarse`. */
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

/** The element a control's `aria-describedby` names (the last id). */
function describer(el: HTMLElement): HTMLElement {
  const ids = el.getAttribute("aria-describedby")!.split(" ");
  return document.getElementById(ids[ids.length - 1])!;
}

describe("Button at Large (§4 touch targets)", () => {
  it("sm grows to md's height and both reach 48 px — never on a link", () => {
    render(
      <>
        <Button size="sm">Small</Button>
        <Button>Medium</Button>
        <Button variant="link">Link</Button>
      </>,
    );
    const sm = screen.getByRole("button", { name: "Small" }).className;
    expect(sm).toContain("large:py-2.5");
    expect(sm).toContain("large:min-h-[48px]");
    expect(screen.getByRole("button", { name: "Medium" }).className).toContain("large:min-h-[48px]");
    expect(screen.getByRole("button", { name: "Link" }).className).not.toContain("large:min-h-[48px]");
  });

  it("draws the kit's focus frame on keyboard focus only (§5)", () => {
    render(<Button>Save</Button>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain(FOCUS_RING_WIDTH);
    expect(cls).toContain("focus-visible:ring-[var(--brand)]");
    expect(cls).not.toMatch(/(^|\s)focus:ring-/);
  });
});

describe("disabledReason in the layout (§4 'No fact only in a tooltip')", () => {
  const reason = "You're offline — changes are kept on this device.";

  it("is the tooltip at Normal with a mouse: a hidden copy describes the button", () => {
    media();
    render(<Button disabledReason={reason}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAccessibleDescription(reason);
    expect(describer(button)).not.toBeVisible();
    expect(document.querySelector("[data-slot=disabled-reason]")).toBeNull();
  });

  it("is a visible line under the button at Large, and that line is the description", () => {
    media();
    size("large");
    render(<Button disabledReason={reason}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    const line = screen.getByText(reason);
    expect(line).toBeVisible();
    expect(line.closest("[data-slot=disabled-reason]")).toContainElement(button);
    expect(button.getAttribute("aria-describedby")).toBe(line.id);
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("is a line on a touch screen at Normal too — a finger cannot hover", () => {
    media({ coarse: true });
    render(<IconButton label="Delete" disabledReason={reason}><Trash2 /></IconButton>);
    expect(screen.getByText(reason)).toBeVisible();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAccessibleDescription(reason);
  });

  it("follows disabledReasonDisplay, and stays the tooltip in a compact region", () => {
    media();
    size("large");
    render(
      <>
        <Button disabledReason="A" disabledReasonDisplay="tooltip">One</Button>
        <CompactControls>
          <IconButton label="Two" disabledReason="B"><Trash2 /></IconButton>
        </CompactControls>
      </>,
    );
    expect(describer(screen.getByRole("button", { name: "One" }))).not.toBeVisible();
    expect(describer(screen.getByRole("button", { name: "Two" }))).not.toBeVisible();
    expect(document.querySelector("[data-slot=disabled-reason]")).toBeNull();
  });

  it("`line` shows it at Normal with a mouse", () => {
    media();
    render(<Button disabledReason="Locked" disabledReasonDisplay="line">Save</Button>);
    expect(screen.getByText("Locked")).toBeVisible();
  });

  it("a locked Switch and Checkbox say why under their words at Large", () => {
    media();
    size("large");
    render(
      <>
        <Switch label="Weekly digest" disabledReason="Read-only workspace" />
        <Checkbox label="Remember me" disabledReason="Set by your administrator" />
      </>,
    );
    const sw = screen.getByRole("switch", { name: "Weekly digest" });
    expect(screen.getByText("Read-only workspace")).toBeVisible();
    expect(sw).toHaveAccessibleDescription("Read-only workspace");
    const box = screen.getByRole("checkbox", { name: "Remember me" });
    expect(screen.getByText("Set by your administrator")).toBeVisible();
    expect(box).toHaveAccessibleDescription("Set by your administrator");
    // The row's fade moves onto its parts, so the reason itself is read at full strength.
    expect(screen.getByText("Read-only workspace").closest(".opacity-60")).toBeNull();
  });

  it("a locked ToggleGroup says why under the group at Large; each segment is described", () => {
    media();
    size("xlarge");
    render(
      <ToggleGroup
        label="Interval"
        value="m"
        onChange={() => {}}
        options={[
          { value: "m", label: "Monthly" },
          { value: "y", label: "Yearly" },
        ]}
        disabledReason="Plan changes are paused"
      />,
    );
    expect(screen.getByText("Plan changes are paused")).toBeVisible();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toHaveAccessibleDescription("Plan changes are paused");
    }
  });
});

describe("IconButton's label at Large (§4, §10.8)", () => {
  it("is only the name and the tooltip at Normal", () => {
    render(<IconButton label="Delete"><Trash2 /></IconButton>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.querySelector("[data-slot=icon-button-label]")).toBeNull();
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Delete");
  });

  it("shows as text beside the icon at Large and Extra large, with no bubble repeating it", () => {
    size("large");
    const { rerender } = render(<IconButton label="Delete"><Trash2 /></IconButton>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(within(button).getByText("Delete")).toHaveAttribute("data-slot", "icon-button-label");
    expect(button.className).toContain("h-9");
    expect(button.className).not.toContain("size-9");
    expect(button.className).toContain(TOUCH_TARGET_LARGE);
    fireEvent.mouseEnter(button);
    expect(screen.queryByRole("tooltip")).toBeNull();
    size("xlarge");
    rerender(<IconButton label="Delete"><Trash2 /></IconButton>);
    expect(within(screen.getByRole("button")).getByText("Delete")).toBeInTheDocument();
  });

  it("follows the text size as it changes", () => {
    render(<IconButton label="Edit"><Trash2 /></IconButton>);
    expect(screen.queryByText("Edit")).toBeNull();
    size("large");
    expect(screen.getByText("Edit")).toBeInTheDocument();
    size("normal");
    expect(screen.queryByText("Edit")).toBeNull();
  });

  it("stays the icon alone: labelVisible={false}, an overlay or shutter, tooltip={false}, a compact region", () => {
    size("large");
    render(
      <>
        <IconButton label="Zoom in" labelVisible={false}><Trash2 /></IconButton>
        <IconButton label="Next photo" variant="overlay"><Trash2 /></IconButton>
        <IconButton label="Take photo" variant="shutter" size="2xl"><Trash2 /></IconButton>
        <IconButton label="Close" tooltip={false}><Trash2 /></IconButton>
        <CompactControls>
          <IconButton label="Notifications"><Trash2 /></IconButton>
        </CompactControls>
      </>,
    );
    for (const name of ["Zoom in", "Next photo", "Take photo", "Close", "Notifications"]) {
      expect(screen.getByRole("button", { name }).querySelector("[data-slot=icon-button-label]")).toBeNull();
    }
  });

  it("shows on the link form as well", () => {
    size("large");
    render(<IconButton href="https://example.com/help" label="Help"><Trash2 /></IconButton>);
    expect(within(screen.getByRole("link", { name: "Help" })).getByText("Help")).toBeInTheDocument();
  });

  it("grows the small squares to the 48 px target; the chip-sized 2xs gets a hit area instead", () => {
    render(
      <>
        <IconButton aria-label="xs" size="xs"><Trash2 /></IconButton>
        <IconButton aria-label="2xs" size="2xs"><Trash2 /></IconButton>
        <IconButton aria-label="lg" size="lg"><Trash2 /></IconButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "xs" }).className).toContain("large:min-h-[48px]");
    const tiny = screen.getByRole("button", { name: "2xs" }).className;
    expect(tiny).toContain("size-6");
    expect(tiny).toContain("large:after:inset-[calc((100%-48px)/2)]");
    expect(screen.getByRole("button", { name: "lg" }).className).not.toContain("large:min-h-[48px]");
  });
});

describe("FieldHint becomes the field's caption at Large and on touch (§4)", () => {
  const hint = "Excludes transfers between your own accounts";

  it("is the '?' on the label line at Normal with a mouse", () => {
    media();
    render(<Input label="Total" hint={<FieldHint label={hint} />} />);
    expect(screen.getByRole("button", { name: hint })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: hint }).className).toContain(FOCUS_RING);
    expect(screen.getByLabelText("Total")).not.toHaveAccessibleDescription(hint);
  });

  it("is a caption under the field at Large, describing it", () => {
    media();
    size("large");
    render(<Input label="Total" hint={<FieldHint label={hint} />} />);
    expect(screen.queryByRole("button", { name: hint })).toBeNull();
    expect(screen.getByText(hint)).toBeVisible();
    expect(screen.getByLabelText("Total")).toHaveAccessibleDescription(hint);
  });

  it("is a caption on a touch screen at Normal", () => {
    media({ coarse: true });
    render(<Input label="Total" hint={<FieldHint label={hint} />} />);
    expect(screen.queryByRole("button", { name: hint })).toBeNull();
    expect(screen.getByLabelText("Total")).toHaveAccessibleDescription(hint);
  });

  it("is a caption under a ToggleGroup at Large", () => {
    media();
    size("large");
    render(
      <ToggleGroup
        label="View"
        hint={<FieldHint label="How the list is grouped" />}
        value="a"
        onChange={() => {}}
        options={[
          { value: "a", label: "Day" },
          { value: "b", label: "Week" },
        ]}
      />,
    );
    expect(screen.queryByRole("button", { name: "How the list is grouped" })).toBeNull();
    expect(screen.getByRole("radiogroup", { name: "View" })).toHaveAccessibleDescription("How the list is grouped");
  });
});

describe("Switch, Slider, ToggleGroup, Checkbox, ChoiceCard in rem (§3.2, §4)", () => {
  it("Switch: the checked offset is track − thumb − 0.125rem, in spacing steps", () => {
    const { container } = render(
      <>
        <Switch aria-label="md" />
        <Switch aria-label="sm" size="sm" />
      </>,
    );
    const thumbs = container.querySelectorAll("[role=switch] + span");
    expect(thumbs[0].getAttribute("class")).toContain("peer-checked:start-4.5");
    expect(thumbs[1].getAttribute("class")).toContain("peer-checked:start-3.5");
    expect(container.innerHTML).not.toMatch(/\[\d+px\]/);
  });

  it("Slider: the thumb's offset is rem, and the box is the 48 px target at Large", () => {
    render(<Slider aria-label="Gain" value={1} min={0} max={10} onChange={() => {}} marks={[0, 5, 10]} />);
    const cls = screen.getByRole("slider").className;
    expect(cls).toContain("[&::-webkit-slider-thumb]:-mt-[0.3125rem]");
    expect(cls).toContain("large:h-[48px]");
    expect(cls).not.toContain("-mt-[5px]");
  });

  it("ToggleGroup: the chrome's line is rem, so it stays a field's height at every size", () => {
    render(
      <ToggleGroup
        label="Group by"
        value="a"
        onChange={() => {}}
        options={[
          { value: "a", label: "Any" },
          { value: "b", label: "All" },
        ]}
      />,
    );
    const radio = screen.getByRole("radio", { name: "Any" });
    expect(radio.className).toContain("leading-[1.125rem]");
    expect(radio.className).toContain(FOCUS_RING_WIDTH);
  });

  it("Checkbox: a rem corner, the focus frame, a caption-size error and a 48 px label target", () => {
    render(<Checkbox label="Terms" error="Accept the terms" />);
    const box = screen.getByRole("checkbox", { name: "Terms" });
    expect(box.className.split(" ")).toContain("rounded");
    expect(box.className).not.toContain("rounded-[4px]");
    // An invalid box turns its ring danger; the width is still the frame's.
    expect(box.className).toContain(FOCUS_RING_WIDTH);
    expect(screen.getByText("Accept the terms").className).toContain("text-caption");
    expect(screen.getByText("Terms").closest("label")!.className).toContain("large:after:-start-6");
  });

  it("ChoiceCard: the radio's dot scales with its box, and the focus mark is the frame's width", () => {
    const { container } = render(<ChoiceCard type="radio" name="plan" title="Monthly" />);
    expect(screen.getByRole("radio").className).toContain("checked:border-[0.3125rem]");
    expect(container.innerHTML).toContain("has-[:focus-visible]:outline-[length:var(--focus-ring-width)]");
  });

  it("Card's strong frame pads one pixel short of p-3 / p-4, in rem", () => {
    const { container } = render(
      <Card tone="danger" toneStrength="strong" padding="sm">
        x
      </Card>,
    );
    expect((container.firstElementChild as HTMLElement).className).toContain("p-[calc(0.75rem-1px)]");
  });
});

describe("FormActions stack on the phone layout at Large (§4)", () => {
  it("stacks full width on a phone at Large, Save last", () => {
    media({ width: 390 });
    size("large");
    const { container } = render(<FormActions onCancel={() => {}} onSubmit={() => {}} />);
    const row = container.firstElementChild as HTMLElement;
    expect(row).toHaveAttribute("data-stacked", "true");
    expect(row.className).toContain("flex-col");
    const buttons = within(row).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Cancel", "Save"]);
    for (const b of buttons) expect(b.className).toContain("w-full");
  });

  it("keeps the row at Normal, on a desktop at Large, and with stack='never'", () => {
    media({ width: 390 });
    const normal = render(<FormActions onCancel={() => {}} onSubmit={() => {}} />);
    expect(normal.container.firstElementChild).not.toHaveAttribute("data-stacked");
    normal.unmount();
    size("large");
    const never = render(<FormActions stack="never" onSubmit={() => {}} />);
    expect(never.container.firstElementChild).not.toHaveAttribute("data-stacked");
    never.unmount();
    media({ width: 1600 });
    const desktop = render(<FormActions onSubmit={() => {}} />);
    expect(desktop.container.firstElementChild).not.toHaveAttribute("data-stacked");
  });

  it("stack='phone' stacks on a phone at Normal too", () => {
    media({ width: 390 });
    const { container } = render(<FormActions stack="phone" onSubmit={() => {}} />);
    expect(container.firstElementChild).toHaveAttribute("data-stacked", "true");
  });

  it("a locked Save keeps its full width with the reason line under it", () => {
    media({ width: 390 });
    size("large");
    render(<FormActions onSubmit={() => {}} submitDisabledReason="Fill in the payee first" />);
    const save = screen.getByRole("button", { name: "Save" });
    expect(save.className).toContain("w-full");
    expect(screen.getByText("Fill in the payee first")).toBeVisible();
  });
});

describe("StatTile at Large: the one big number (§4)", () => {
  const props = {
    label: "Spent this month",
    value: 1234,
    hint: "Excludes transfers",
    truncateLabel: true,
    trend: [1, 3, 2, 4],
    subValues: [{ label: "August", value: 900 }],
  };

  it("at Normal: the hint behind a '?', the sparkline above the rows", () => {
    media();
    const { container } = render(<StatTile {...props} />);
    expect(screen.getByRole("button", { name: "Excludes transfers" })).toBeInTheDocument();
    expect(container.querySelector("[data-slot=stat-tile-hint]")).toBeNull();
    expect(container.querySelector("[data-slot=stat-tile-graphic]")).toBeNull();
  });

  it("at Large: the hint as words, no truncation, the rows stacked and the sparkline below them", () => {
    media();
    size("large");
    const { container } = render(<StatTile {...props} />);
    expect(screen.queryByRole("button", { name: "Excludes transfers" })).toBeNull();
    expect(container.querySelector("[data-slot=stat-tile-hint]")).toHaveTextContent("Excludes transfers");
    expect(container.querySelector(".truncate")).toBeNull();
    const figures = container.querySelector("[data-slot=stat-tile-figures]")!;
    const graphic = container.querySelector("[data-slot=stat-tile-graphic]")!;
    expect(figures.compareDocumentPosition(graphic) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(figures as HTMLElement).getByText("August").parentElement!.className).toContain("flex-col");
  });

  it("on a touch screen at Normal the hint is words too", () => {
    media({ coarse: true });
    const { container } = render(<StatTile label="Users" value={3} hint="Active this week" />);
    expect(container.querySelector("[data-slot=stat-tile-hint]")).toHaveTextContent("Active this week");
  });
});

describe("Words that lived in a tooltip (§4)", () => {
  it("DateMark: the exact date beside a relative one, at every size", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    render(
      <>
        <DateMark value="2026-09-29T12:00:00Z" display="relative" relative={{ now, numeric: "always" }} locale="en-GB" />
        <DateMark
          value="2026-09-29T12:00:00Z"
          display="relative"
          absolute="inline"
          relative={{ now, numeric: "always" }}
          locale="en-GB"
        />
      </>,
    );
    const marks = screen.getAllByText("3 days ago");
    expect(marks).toHaveLength(2);
    const below = marks[0].closest("time")!;
    expect(below.textContent).toMatch(/29 Sept? 2026/);
    expect(below.className).toContain("flex-col");
    expect(marks[1].closest("time")!.textContent).toContain(" · ");
    fireEvent.mouseEnter(below);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("SignChip: what a press does, in words under the chip at Large", () => {
    const { rerender } = render(<SignChip negative onNegativeChange={() => {}} />);
    expect(screen.queryByText("Switch to Inflow")).toBeNull();
    size("large");
    rerender(<SignChip negative onNegativeChange={() => {}} className="self-end" />);
    expect(screen.getByText("Switch to Inflow")).toBeVisible();
    expect(screen.getByText("Switch to Inflow").parentElement!.className).toContain("self-end");
    expect(screen.getByRole("button", { name: /Outflow/ })).toBeInTheDocument();
  });

  it("FieldSyncIndicator: the state's word beside the icon at Large", () => {
    const { container, rerender } = render(<FieldSyncIndicator state="synced" />);
    const status = () => within(container.querySelector("[role=status]") as HTMLElement);
    // At Normal the word is for the live region only (and the tooltip).
    expect(status().getAllByText("Saved").some((el) => el.className.includes("sr-only"))).toBe(true);
    size("large");
    rerender(<FieldSyncIndicator state="synced" />);
    expect(status().getByText("Saved").className).not.toContain("sr-only");
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
