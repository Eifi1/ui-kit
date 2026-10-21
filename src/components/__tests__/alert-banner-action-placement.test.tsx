import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertBanner } from "../alert-banner";

/**
 * 0.48 `actionPlacement="flow"` (keksdose dev #623): below `sm` the action stays on the
 * message's line while the message keeps 10rem, and otherwise goes to the END of the
 * next line — instead of the default line of its own under the message. keksdose's
 * budget card built this with descendant overrides (`[&>button]:basis-40`,
 * `[&>div]:ms-auto` …). Layout itself is verified in Chromium at 390px; here the
 * structure and the classes that make it.
 */

const action = <button type="button">Assign</button>;
const flowOf = (el: HTMLElement) => el.closest<HTMLElement>("[data-action-flow]");

describe("AlertBanner actionPlacement (0.48, keksdose #623)", () => {
  it("default: the action takes a line of its own below sm, as before", () => {
    render(
      <AlertBanner tone="warning" action={action}>
        5 underfunded categories
      </AlertBanner>,
    );
    const wrap = screen.getByRole("button", { name: "Assign" }).parentElement!;
    expect(wrap).toHaveClass("max-sm:basis-full");
    expect(flowOf(wrap)).toBeNull();
  });

  it("flow: message and action share a wrapping row; the message claims 10rem, the action the line's end", () => {
    render(
      <AlertBanner tone="warning" action={action} actionPlacement="flow" onDismiss={() => {}}>
        5 underfunded categories
      </AlertBanner>,
    );
    const wrap = screen.getByRole("button", { name: "Assign" }).parentElement!;
    const flow = flowOf(wrap)!;
    expect(flow).not.toBeNull();
    expect(flow).toHaveClass("max-sm:flex-wrap", "min-w-0", "flex-1");
    expect(wrap).toHaveClass("ms-auto");
    expect(wrap).not.toHaveClass("max-sm:basis-full");
    expect(wrap).not.toHaveClass("max-sm:order-last");
    const message = screen.getByText("5 underfunded categories");
    expect(flowOf(message)).toBe(flow);
    // The glyph rides with the message: the two claim the 10rem together.
    const lead = message.parentElement!;
    expect(lead).toHaveClass("max-sm:basis-40", "items-start");
    expect(lead.querySelector("svg")).not.toBeNull();
    // The × stays outside, at the top end of the box, whichever line the action is on.
    const dismiss = screen.getByRole("button", { name: "Dismiss" });
    expect(flowOf(dismiss)).toBeNull();
    // The frame no longer wraps itself: the glyph keeps the first line.
    expect(flow.parentElement).not.toHaveClass("max-sm:flex-wrap");
  });

  it("flow on a whole-row banner: the row's button and the action share the row; the stretched target still covers the frame", () => {
    const onClick = () => {};
    const { container } = render(
      <AlertBanner tone="warning" action={action} actionPlacement="flow" onClick={onClick}>
        5 underfunded categories
      </AlertBanner>,
    );
    const row = screen.getByRole("button", { name: /underfunded/ });
    const flow = flowOf(row)!;
    expect(flow).not.toBeNull();
    expect(row).toHaveClass("max-sm:basis-40");
    expect(flowOf(screen.getByRole("button", { name: "Assign" }))).toBe(flow);
    // The positioned ancestor of the row's `after:` overlay is the frame, not the flow row.
    expect(flow).not.toHaveClass("relative");
    expect(container.firstElementChild).toHaveClass("relative");
  });

  it("works with clampMobile: the More toggle stays with the message", () => {
    render(
      <AlertBanner tone="info" action={action} actionPlacement="flow" clampMobile>
        A long beta notice that a phone cuts to one line.
      </AlertBanner>,
    );
    const more = screen.getByRole("button", { name: "More" });
    expect(flowOf(more)).not.toBeNull();
    fireEvent.click(more);
    expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("is ignored by strip and inline (a strip flows already) and without an action", () => {
    const { rerender, container } = render(
      <AlertBanner variant="strip" tone="info" action={action} actionPlacement="flow">
        Trial ends soon
      </AlertBanner>,
    );
    expect(container.querySelector("[data-action-flow]")).toBeNull();
    rerender(
      <AlertBanner variant="inline" tone="info" action={action} actionPlacement="flow">
        Saved
      </AlertBanner>,
    );
    expect(container.querySelector("[data-action-flow]")).toBeNull();
    rerender(
      <AlertBanner tone="info" actionPlacement="flow">
        Plain
      </AlertBanner>,
    );
    expect(container.querySelector("[data-action-flow]")).toBeNull();
  });
});
