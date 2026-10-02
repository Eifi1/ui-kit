import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Star } from "lucide-react";
import { FieldStrip } from "../field-strip";
import { ToggleGroup } from "../toggle-group";
import { SwatchPicker } from "../swatch-picker";
import { IconPicker } from "../icon-picker";
import { FieldHint } from "../ui";

/**
 * 0.23.0, keksdose G8: the label strip the kit's groups wear (0.22, K2), public for
 * content of the app's own — keksdose's location cell (a map and buttons) was the last
 * one built by hand.
 */

describe("FieldStrip (keksdose G8)", () => {
  it("is a group named by an 11px label on a field's label line, the content 20px down", () => {
    const { container } = render(
      <FieldStrip label="Location" className="col-span-6">
        <button type="button">Locate me</button>
      </FieldStrip>,
    );
    const group = screen.getByRole("group", { name: "Location" });
    expect(container.firstElementChild).toBe(group);
    // `relative` positions the label row and contains a caller's sr-only label.
    expect(group.className).toContain("relative");
    expect(group.className).toContain("pt-5");
    expect(group.className).toContain("col-span-6");
    const label = screen.getByText("Location");
    expect(label.className).toContain("text-[11px]");
    expect(label.className).toContain("leading-tight");
    expect(label.className).toContain("static");
    // The row a field's static label sits in: top-1, inset 12px from either edge.
    expect(label.parentElement!.className).toContain("top-1");
    expect(label.parentElement!.className).toContain("inset-x-3");
    expect(group).toContainElement(screen.getByRole("button", { name: "Locate me" }));
  });

  it('pad="field" is the 16px strip; a className merges after the pad (responsive strip)', () => {
    const { rerender } = render(
      <FieldStrip label="Status" pad="field">
        <span>Done</span>
      </FieldStrip>,
    );
    const group = screen.getByRole("group", { name: "Status" });
    expect(group.className).toContain("pt-4");
    expect(group.className).not.toContain("pt-5");
    // keksdose's status cell: 20px on a phone, 16px in the desktop row.
    rerender(
      <FieldStrip label="Status" pad="field" className="pt-5 @3xl:pt-4">
        <span>Done</span>
      </FieldStrip>,
    );
    const tokens = screen.getByRole("group").className.split(/\s+/);
    expect(tokens).toContain("pt-5");
    expect(tokens).toContain("@3xl:pt-4");
    expect(tokens).not.toContain("pt-4");
  });

  it("is the strip ToggleGroup, SwatchPicker and IconPicker draw: same wrapper, same label row", () => {
    const { container: toggle } = render(
      <ToggleGroup
        label="Status"
        labelPlacement="strip"
        value="a"
        onChange={vi.fn()}
        options={[
          { value: "a", label: "Open" },
          { value: "b", label: "Done" },
        ]}
      />,
    );
    const { container: field } = render(
      <FieldStrip label="Status" pad="field">
        <span />
      </FieldStrip>,
    );
    const { container: swatch } = render(
      <SwatchPicker label="Flag" value={null} onChange={vi.fn()} options={[{ value: "red", label: "Red", color: "#f00" }]} />,
    );
    const { container: icon } = render(
      <IconPicker label="Symbol" value={null} onChange={vi.fn()} options={[{ value: "star", label: "Star", icon: Star }]} />,
    );
    const { container: clear } = render(
      <FieldStrip label="Flag">
        <span />
      </FieldStrip>,
    );
    const wrapper = (c: HTMLElement) => c.firstElementChild as HTMLElement;
    const row = (c: HTMLElement) => wrapper(c).firstElementChild as HTMLElement;
    expect(wrapper(field).className).toBe(wrapper(toggle).className);
    expect(row(field).outerHTML.replace(/id="[^"]*"/g, "")).toBe(row(toggle).outerHTML.replace(/id="[^"]*"/g, ""));
    expect(wrapper(clear).className).toBe(wrapper(swatch).className);
    expect(wrapper(clear).className).toBe(wrapper(icon).className);
    // The kit's own groups name themselves; their strip stays a bare box.
    expect(wrapper(toggle)).not.toHaveAttribute("role");
    expect(wrapper(swatch)).not.toHaveAttribute("role");
  });

  it("splits hint like a field: text is a caption under the content, a FieldHint rides the label line", () => {
    const { rerender } = render(
      <FieldStrip label="Location" hint="Stays on this device.">
        <span />
      </FieldStrip>,
    );
    const group = screen.getByRole("group", { name: "Location" });
    expect(group).toHaveAccessibleDescription("Stays on this device.");
    const caption = screen.getByText("Stays on this device.");
    expect(caption.tagName).toBe("P");
    expect(caption.className).toContain("text-[11px]");
    expect(group.lastElementChild).toBe(caption);
    rerender(
      <FieldStrip label="Location" hint={<FieldHint label="Where the payment happened" />}>
        <span />
      </FieldStrip>,
    );
    const hint = screen.getByRole("button", { name: "Where the payment happened" });
    expect(hint.closest(".top-1")).not.toBeNull();
    expect(screen.getByRole("group")).not.toHaveAttribute("aria-describedby");
  });

  it("puts an error under the content and describes the group: caller's, caption, error", () => {
    render(
      <>
        <p id="own">Optional.</p>
        <FieldStrip label="Location" aria-describedby="own" hint="Stays on this device." error="The position could not be read.">
          <span />
        </FieldStrip>
      </>,
    );
    const group = screen.getByRole("group", { name: "Location" });
    expect(group).toHaveAccessibleDescription("Optional. Stays on this device. The position could not be read.");
    expect(screen.getByText("The position could not be read.").className).toContain("text-[var(--danger)]");
    // A group cannot be invalid; its controls are the caller's to mark.
    expect(group).not.toHaveAttribute("aria-invalid");
  });

  it("adds nothing under the content for an empty hint or error", () => {
    render(
      <FieldStrip label="Location" hint="" error={false}>
        <span data-testid="content" />
      </FieldStrip>,
    );
    const group = screen.getByRole("group");
    expect(group.lastElementChild).toBe(screen.getByTestId("content"));
    expect(group).not.toHaveAttribute("aria-describedby");
  });

  it("lets an explicit aria-label or aria-labelledby name the group instead", () => {
    const { rerender } = render(
      <FieldStrip label="Location" aria-label="Where it happened">
        <span />
      </FieldStrip>,
    );
    expect(screen.getByRole("group", { name: "Where it happened" })).toBeInTheDocument();
    rerender(
      <>
        <h3 id="heading">Place</h3>
        <FieldStrip label="Location" aria-labelledby="heading">
          <span />
        </FieldStrip>
      </>,
    );
    expect(screen.getByRole("group", { name: "Place" })).toBeInTheDocument();
  });

  it("group={false}: a plain box, and the content names itself from the render prop", () => {
    const seen = vi.fn();
    render(
      <FieldStrip label="Pattern" hint="Shown on the card." error="Pick one." group={false} data-testid="strip">
        {({ labelId, describedBy }) => {
          seen(labelId, describedBy);
          return (
            <div role="radiogroup" aria-labelledby={labelId} aria-describedby={describedBy}>
              <button type="button" role="radio" aria-checked="false">
                Dots
              </button>
            </div>
          );
        }}
      </FieldStrip>,
    );
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByTestId("strip")).not.toHaveAttribute("aria-labelledby");
    expect(screen.getByTestId("strip")).not.toHaveAttribute("aria-describedby");
    const radiogroup = screen.getByRole("radiogroup", { name: "Pattern" });
    expect(radiogroup).toHaveAccessibleDescription("Shown on the card. Pick one.");
    expect(seen).toHaveBeenLastCalledWith(screen.getByText("Pattern").id, expect.any(String));
  });

  it("hands the label id to render-prop content inside the group too", () => {
    render(
      <FieldStrip label="Location">
        {({ labelId, describedBy }) => (
          <span data-testid="content" data-label={labelId} data-described={describedBy ?? "none"} />
        )}
      </FieldStrip>,
    );
    const content = screen.getByTestId("content");
    expect(content.dataset.label).toBe(screen.getByText("Location").id);
    expect(content.dataset.described).toBe("none");
  });

  it("dims the label when disabled and leaves the content to the caller", () => {
    render(
      <FieldStrip label="Location" disabled>
        <button type="button">Locate me</button>
      </FieldStrip>,
    );
    expect(screen.getByText("Location").className).toContain("opacity-50");
    expect(screen.getByRole("button", { name: "Locate me" })).toBeEnabled();
    expect(screen.getByRole("group")).not.toHaveAttribute("aria-disabled");
  });

  it("passes other attributes to the wrapper (a tour anchor, a test id)", () => {
    render(
      <FieldStrip label="Location" data-tour="location" id="location-cell">
        <span />
      </FieldStrip>,
    );
    const group = screen.getByRole("group", { name: "Location" });
    expect(group).toHaveAttribute("data-tour", "location");
    expect(group).toHaveAttribute("id", "location-cell");
  });
});
