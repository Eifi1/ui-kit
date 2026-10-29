import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FIELD_BASE, FIELD_TOUCH_TEXT } from "../field-base";
import { FOCUS_RING, FOCUS_RING_WIDTH } from "../focus-ring";
import { cn } from "../../lib/cn";
import { Input } from "../input";
import { DropdownSearchHeader } from "../dropdown";
import { ContrastSetting, TextSizeSetting, ThemeSetting } from "../settings-fields";
import { DEFAULT_APPEARANCE_LABELS } from "../appearance-labels";
import { DIALOG_GUTTER, FullBleedDialog } from "../full-bleed-dialog";
import { TOASTER_OFFSET_BOTTOM, TOASTER_OFFSET_TOP } from "../toast";

/**
 * The component half of the text-size mechanism (docs/text-size-harmonization.md §5, §6,
 * §10.1, §10.11): the 16 px touch floor on the kit's fields, the shared focus frame, the
 * two settings, and the lengths exported as CSS instead of px copies.
 */

describe("the 16 px field floor on touch (§10.1)", () => {
  it("is a pointer-coarse floor that leaves Large and Extra large alone", () => {
    expect(FIELD_TOUCH_TEXT).toBe("pointer-coarse:text-[length:max(0.875rem,16px)]");
  });

  it("is part of FIELD_BASE, so every field built on it has it", () => {
    expect(FIELD_BASE).toContain(FIELD_TOUCH_TEXT);
    render(<Input label="Payee" />);
    expect(screen.getByLabelText("Payee").className).toContain(FIELD_TOUCH_TEXT);
  });

  it("reaches the pickers' search box", () => {
    render(<DropdownSearchHeader query="" onQueryChange={() => {}} inputRef={{ current: null }} aria-label="Search" />);
    expect(screen.getByLabelText("Search").className).toContain(FIELD_TOUCH_TEXT);
  });
});

describe("the shared focus frame (§5)", () => {
  it("draws its ring --focus-ring-width wide, on keyboard focus", () => {
    // `ring-focus` is tokens.css's `--ring-width-focus: var(--focus-ring-width)` (0.34, DOC-7).
    expect(FOCUS_RING.split(" ")).toContain("focus-visible:ring-focus");
    expect(FOCUS_RING.split(" ")).toContain("focus-visible:ring-brand");
    expect(FOCUS_RING_WIDTH).toBe("focus-visible:ring-focus");
    expect(FOCUS_RING.split(" ")).toContain(FOCUS_RING_WIDTH);
  });

  it("keeps its width when cn() is given another ring colour", () => {
    // Unregistered, tailwind-merge read `ring-focus` as a COLOUR and the later colour
    // replaced it: the control kept a colour and lost its ring.
    expect(cn(FOCUS_RING, "focus-visible:ring-strong").split(" ")).toEqual([
      "focus-visible:outline-none",
      "focus-visible:ring-focus",
      "focus-visible:ring-strong",
    ]);
    expect(cn(FOCUS_RING_WIDTH, "focus-visible:ring-brand-contrast")).toBe(
      "focus-visible:ring-focus focus-visible:ring-brand-contrast",
    );
    expect(cn("focus-visible:outline-focus", "focus-visible:outline-brand")).toBe(
      "focus-visible:outline-focus focus-visible:outline-brand",
    );
    // …and merges as the width it is: a later width replaces it, both ways.
    expect(cn("ring-2", "ring-focus")).toBe("ring-focus");
    expect(cn("outline-focus", "outline-2")).toBe("outline-2");
  });
});

describe("TextSizeSetting / ContrastSetting (§6)", () => {
  it("offers Normal, Large, Extra large and reports the pick", () => {
    const onChange = vi.fn();
    render(<TextSizeSetting value="normal" onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "Text size" });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual(["Normal", "Large", "Extra large"]);
    expect(screen.getByRole("radio", { name: "Normal" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Extra large" }));
    expect(onChange).toHaveBeenCalledWith("xlarge");
  });

  it("offers System, Standard, More, bound to the stored mode", () => {
    const onChange = vi.fn();
    render(<ContrastSetting value="system" onChange={onChange} />);
    expect(screen.getByRole("radiogroup", { name: "Contrast" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "More" }));
    expect(onChange).toHaveBeenCalledWith("more");
  });

  it("takes a visible label, an aria-label, and per-instance words", () => {
    render(
      <>
        <TextSizeSetting value="large" onChange={() => {}} label="Letters" />
        <ContrastSetting
          value="more"
          onChange={() => {}}
          aria-label="Kontrast"
          labels={{ contrastModes: { ...DEFAULT_APPEARANCE_LABELS.contrastModes, more: "Mehr" } }}
        />
      </>,
    );
    expect(screen.getByRole("radiogroup", { name: "Letters" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Kontrast" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Mehr" })).toBeChecked();
  });

  it("puts a text hint under the group, never on the label line (0.32.1)", () => {
    render(
      <TextSizeSetting
        value="normal"
        onChange={() => {}}
        label="Text size"
        labelPlacement="above"
        hint="Changes the text across the app."
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Text size" });
    const hint = screen.getByText("Changes the text across the app.");
    // A caption under the group, describing it — not a sibling of the label.
    expect(hint.tagName).toBe("P");
    expect(group.parentElement!.contains(hint)).toBe(true);
    expect(screen.getByText("Text size", { selector: "label" }).parentElement!.contains(hint)).toBe(false);
    expect(group.getAttribute("aria-describedby")).toContain(hint.id);
  });

  it("wraps its options by default, and so does ThemeSetting's toggle beside it (0.32.1)", () => {
    const optionLabels = { system: "System", light: "Light", dark: "Dark" };
    render(
      <>
        <TextSizeSetting value="normal" onChange={() => {}} />
        <ContrastSetting value="system" onChange={() => {}} />
        <ThemeSetting
          variant="toggle"
          value="system"
          onChange={() => {}}
          aria-label="Theme"
          optionLabels={optionLabels}
        />
        <ThemeSetting
          variant="toggle"
          overflow="truncate"
          value="system"
          onChange={() => {}}
          aria-label="Theme, truncating"
          optionLabels={optionLabels}
        />
      </>,
    );
    for (const name of ["Text size", "Contrast", "Theme"]) {
      expect(screen.getByRole("radiogroup", { name }).className.split(" "), name).toContain("flex-wrap");
    }
    // A caller can still ask for one row; it then wraps only at Large (ToggleGroup's rule).
    const truncating = screen.getByRole("radiogroup", { name: "Theme, truncating" }).className.split(" ");
    expect(truncating).not.toContain("flex-wrap");
    expect(truncating).toContain("large:flex-wrap");
  });
});

describe("CSS lengths instead of px copies (§10.11)", () => {
  it("pads the full-screen dialog's body by DIALOG_GUTTER", () => {
    expect(DIALOG_GUTTER).toBe("0.75rem");
    render(
      <FullBleedDialog open onClose={() => {}} closeLabel="Close" header="Row">
        <p>Body</p>
      </FullBleedDialog>,
    );
    expect(screen.getByText("Body").parentElement!.style.padding).toBe("0.75rem");
  });

  it("gives the Toaster's offsets as rem lengths", () => {
    expect(TOASTER_OFFSET_TOP).toContain("4rem");
    // Only the safe area's `0px` fallback is in px.
    expect(TOASTER_OFFSET_TOP).not.toMatch(/[1-9]\d*px/);
    expect(TOASTER_OFFSET_BOTTOM).toContain("var(--app-nav-h, 0px)");
    expect(TOASTER_OFFSET_BOTTOM).toContain("0.75rem");
  });
});
