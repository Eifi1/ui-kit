import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AlertBanner, alertFrameClass, toneFrameClass } from "../alert-banner";

describe("AlertBanner 0.10.0", () => {
  it("has a success tone with its own frame, ink and a check glyph", () => {
    const { container } = render(<AlertBanner tone="success">Import finished</AlertBanner>);
    const box = container.firstElementChild!;
    expect(box.className).toContain("bg-[var(--success-bg)]");
    expect(box.className).toContain("text-[var(--success)]");
    expect(toneFrameClass("success")).toContain("border-[var(--success-border)]");
    expect(alertFrameClass("success")).toContain("p-[11px]");
    expect(box.querySelector("svg")!.getAttribute("class")).toContain("lucide-circle-check");
  });

  it("size=sm is 12px type with a 14px glyph, inline and boxed", () => {
    const { container } = render(
      <>
        <AlertBanner tone="warning" variant="inline" size="sm" data-testid="inline">
          Rate missing
        </AlertBanner>
        <AlertBanner tone="warning" size="sm" data-testid="box">
          Rate missing
        </AlertBanner>
      </>,
    );
    for (const id of ["inline", "box"]) {
      const el = screen.getByTestId(id);
      expect(el.className).toContain("text-xs");
      expect(el.className).not.toContain("text-sm");
      expect(el.querySelector("svg")!.getAttribute("class")).toContain("size-3.5");
    }
    expect(screen.getByTestId("box").className).toContain("py-[5px]");
    expect(alertFrameClass("neutral", "sm")).toContain("py-1.5");
    expect(container.querySelectorAll("[role=status]")).toHaveLength(1);
  });

  it("variant=strip is edge to edge with only a bottom border and a trailing action", () => {
    const onUpdate = vi.fn();
    render(
      <AlertBanner
        tone="warning"
        variant="strip"
        data-testid="strip"
        action={<button onClick={onUpdate}>Update payment method</button>}
      >
        Trial ends in 3 days
      </AlertBanner>,
    );
    const strip = screen.getByTestId("strip");
    expect(strip.className).toContain("rounded-none");
    expect(strip.className).toContain("border-0");
    expect(strip.className).toContain("border-b");
    expect(strip.className).not.toContain("border-2");
    expect(strip.className).not.toContain("rounded-md");
    expect(strip.className).toContain("items-center");
    expect(strip).not.toHaveAttribute("role");
    const action = screen.getByRole("button", { name: "Update payment method" });
    // The action comes after the message, at the end of the row.
    expect(strip.lastElementChild!.contains(action)).toBe(true);
    fireEvent.click(action);
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it("puts the action beside a whole-row button rather than inside it", () => {
    const onRow = vi.fn();
    const onAction = vi.fn();
    render(
      <AlertBanner tone="info" onClick={onRow} action={<button onClick={onAction}>Exit</button>}>
        Tour mode
      </AlertBanner>,
    );
    const row = screen.getByRole("button", { name: /Tour mode/ });
    const action = screen.getByRole("button", { name: "Exit" });
    expect(row.contains(action)).toBe(false);
    fireEvent.click(action);
    expect(onAction).toHaveBeenCalledOnce();
    expect(onRow).not.toHaveBeenCalled();
  });

  it("elevated is an opaque surface with the tone's wash layered on top, and a shadow", () => {
    render(
      <>
        <AlertBanner tone="warning" elevated data-testid="warn">
          Waking the server
        </AlertBanner>
        <AlertBanner tone="neutral" elevated data-testid="neutral">
          Still loading
        </AlertBanner>
      </>,
    );
    const warn = screen.getByTestId("warn").className;
    expect(warn).toContain("bg-[var(--bg-surface)]");
    // The translucent wash is no longer the background COLOUR (tailwind-merge dropped
    // it), only an image over the opaque surface.
    expect(warn).not.toMatch(/(^| )bg-\[var\(--warning-bg\)\]/);
    expect(warn).toContain("bg-[image:linear-gradient(var(--warning-bg),var(--warning-bg))]");
    expect(warn).toContain("shadow-lg");
    expect(warn).toContain("border-[var(--warning-border)]");
    expect(screen.getByTestId("neutral").className).toContain("bg-[var(--bg-surface)]");
  });

  it("leaves existing callers untouched", () => {
    const { container } = render(<AlertBanner tone="danger">Failed</AlertBanner>);
    const box = container.firstElementChild!;
    expect(box.className).toContain("text-sm");
    expect(box.className).toContain("rounded-md");
    expect(box.className).toContain("p-[11px]");
    expect(box.className).not.toContain("shadow-lg");
    expect(alertFrameClass("danger")).toBe(`rounded-md p-[11px] ${toneFrameClass("danger")}`);
  });
});

describe("AlertBanner 0.11.0 inline (keksdose)", () => {
  it("block lays an inline banner out as a full row with the glyph on the first line", () => {
    render(
      <AlertBanner tone="warning" variant="inline" size="sm" block data-testid="b">
        A hint long enough to wrap onto a second line under the total
      </AlertBanner>,
    );
    const el = screen.getByTestId("b");
    expect(el.className).toMatch(/(^| )flex( |$)/);
    expect(el.className).not.toContain("inline-flex");
    expect(el.className).toContain("items-start");
    expect(el.className).not.toContain("items-center");
    expect(el.querySelector("svg")!.getAttribute("class")).toContain("mt-px");
    expect(el.querySelector("span")!.className).toContain("flex-1");
    // Still frameless and still live.
    expect(el.className).not.toContain("border");
    expect(el).toHaveAttribute("role", "status");
  });

  it("without block, inline stays the centred inline-flex line", () => {
    render(
      <AlertBanner tone="warning" variant="inline" data-testid="i">
        Radius below the minimum
      </AlertBanner>,
    );
    const el = screen.getByTestId("i");
    expect(el.className).toContain("inline-flex");
    expect(el.className).toContain("items-center");
    expect(el.querySelector("svg")!.getAttribute("class")).not.toContain("mt-");
  });

  it("live={false} opts out of the live region; a passed role still wins", () => {
    render(
      <>
        <AlertBanner tone="danger" variant="inline" live={false} data-testid="static">
          Unresolved rows block the import
        </AlertBanner>
        <AlertBanner tone="danger" variant="inline" live={false} role="note" data-testid="note">
          Note
        </AlertBanner>
      </>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("static")).not.toHaveAttribute("role");
    expect(screen.getByTestId("note")).toHaveAttribute("role", "note");
  });
});
