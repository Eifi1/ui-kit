import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tooltip } from "../tooltip";

/**
 * The audit's §a11y, `tooltip.tsx:98`: *"Tooltip text is never associated with its
 * trigger and cannot be dismissed."*
 *
 * Two defects that sound like one. The bubble carried `role="tooltip"` and nothing
 * else — a role is not a relationship, so no assistive technology had any reason to
 * read it when the trigger it belongs to took focus. The kit's icon-only buttons are
 * the call sites that suffer: their tooltip IS the label, and it was reaching the
 * pointer alone.
 *
 * The second is WCAG 1.4.13: content that appears on hover or focus has to be
 * dismissible without moving the pointer. A bubble is opaque and lands over the row,
 * the field or the figure you were reading, and the only escape from it was to move
 * away from the thing you were pointing at — which is exactly what you cannot do when
 * the bubble is covering what you need to compare against.
 *
 * Both variants are tested, because they are separate implementations: the default is
 * CSS-only with the bubble always mounted, `portal` mounts it on hover.
 */
describe("Tooltip describes its trigger", () => {
  it("points the trigger at the bubble", () => {
    render(
      <Tooltip label="Copy the IBAN">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Copy" });
    const bubble = screen.getByRole("tooltip");
    expect(bubble).toHaveTextContent("Copy the IBAN");
    expect(bubble.id).not.toBe("");
    expect(trigger).toHaveAttribute("aria-describedby", bubble.id);
  });

  it("describes the trigger of a portalled bubble too, once it is up", () => {
    render(
      <Tooltip label="Copy the IBAN" portal>
        <button type="button">Copy</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Copy" });
    // Nothing to point at before the hover: the portalled bubble is not mounted, and a
    // reference to an id that does not exist is worse than no reference.
    expect(trigger).not.toHaveAttribute("aria-describedby");
    fireEvent.mouseEnter(trigger.parentElement!);
    expect(trigger).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  });

  it("keeps a description the caller already had", () => {
    // A field's error text must not be replaced by its hint bubble; both describe it.
    render(
      <>
        <span id="iban-error">Not a valid IBAN</span>
        <Tooltip label="Copy the IBAN">
          <button type="button" aria-describedby="iban-error">
            Copy
          </button>
        </Tooltip>
      </>,
    );
    const ids = screen.getByRole("button").getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(ids[0]).toBe("iban-error");
    expect(ids[1]).toBe(screen.getByRole("tooltip").id);
  });

  it("still renders its children bare when the label is empty", () => {
    // The deliberate `<>{children}</>` branch: no wrapper, and so nothing to describe.
    const { container } = render(
      <Tooltip label="">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    expect(container.querySelector("span")).toBeNull();
    expect(screen.queryByRole("tooltip")).toBeNull();
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
  });
});

describe("Tooltip is dismissible without moving the pointer (WCAG 1.4.13)", () => {
  it("hides the bubble on Escape while the pointer stays on the trigger", () => {
    render(
      <Tooltip label="Copy the IBAN">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Copy" });
    const bubble = screen.getByRole("tooltip");
    fireEvent.mouseEnter(trigger.parentElement!);
    // Escape is pressed with focus anywhere — the pointer, not the keyboard, is what
    // opened this — so the listener has to be the document's.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(bubble).not.toBeVisible();
    // And it stops describing the trigger: a dismissed bubble should not still be read
    // out as the trigger's description.
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("offers the label again on the next hover", () => {
    render(
      <Tooltip label="Copy the IBAN">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Copy" });
    const wrapper = trigger.parentElement!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseLeave(wrapper);
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole("tooltip")).toBeVisible();
    expect(trigger).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  });

  it("dismisses the portalled bubble as well", () => {
    render(
      <Tooltip label="Copy the IBAN" portal>
        <button type="button">Copy</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", { name: "Copy" });
    fireEvent.mouseEnter(trigger.parentElement!);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("leaves other keys alone", () => {
    render(
      <Tooltip label="Copy the IBAN">
        <button type="button">Copy</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole("button").parentElement!);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByRole("tooltip")).toBeVisible();
  });
});
