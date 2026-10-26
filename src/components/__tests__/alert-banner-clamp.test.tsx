import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlertBanner } from "../alert-banner";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { uiKitLabelsZh } from "../../i18n/locales/zh";

/**
 * keksdose dev#611 (R10, UX-1.2): its beta notice took three to four lines (~100px) above
 * every phone screen. `clampMobile` holds the message to ONE line below `md` with a
 * More/Less toggle; from `md` up nothing changes (the clamp and the toggle are `max-md:` /
 * `md:hidden`, the kit's text-size-aware `md`).
 */
describe("AlertBanner clampMobile", () => {
  it("is off by default: no toggle, no clamp", () => {
    const { container } = render(<AlertBanner tone="neutral">A long message</AlertBanner>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.innerHTML).not.toContain("line-clamp");
  });

  it("clamps the message to one line on a phone, with a More toggle that expands it", () => {
    render(
      <AlertBanner tone="neutral" variant="strip" clampMobile onDismiss={() => {}}>
        A long message
      </AlertBanner>,
    );
    const toggle = screen.getByRole("button", { name: "More" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle.className).toContain("md:hidden");
    const body = document.getElementById(toggle.getAttribute("aria-controls")!)!;
    expect(body).toHaveTextContent("A long message");
    expect(body.className).toContain("max-md:line-clamp-1");

    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Less" })).toHaveAttribute("aria-expanded", "true");
    expect(body.className).not.toContain("line-clamp");

    fireEvent.click(screen.getByRole("button", { name: "Less" }));
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("aria-expanded", "false");
    // The × is still its own control beside it.
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  // kastlan K1 (prod #22, KX-5, 0.51): on a 390px phone the strip's 12rem basis pushed
  // "Erneut senden" onto a line of its own under the ONE clamped line — 71px where one
  // line is 43 (Chromium, docs/adopt-0.51.md). Clamped, the message claims 7rem below `md`.
  it("on a strip, drops the message's 12rem claim to 7rem below md, so the action keeps the line", () => {
    render(
      <AlertBanner tone="warning" variant="strip" clampMobile action={<button type="button">Send again</button>}>
        Please confirm your email address.
      </AlertBanner>,
    );
    const more = screen.getByRole("button", { name: "More" });
    const message = more.parentElement!;
    expect(message).toContainElement(document.getElementById(more.getAttribute("aria-controls")!));
    // From md up the 12rem holds; below md the clamp's 7rem wins (a later, max-md rule).
    expect(message).toHaveClass("flex-[1_1_12rem]", "max-md:basis-28");
  });

  it("leaves the strip's 12rem alone without the clamp, and a box's message has no basis to drop", () => {
    const { unmount } = render(
      <AlertBanner tone="warning" variant="strip" action={<button type="button">Send again</button>}>
        Unclamped strip
      </AlertBanner>,
    );
    const strip = screen.getByText("Unclamped strip");
    expect(strip).toHaveClass("flex-[1_1_12rem]");
    expect(strip.className).not.toContain("basis-28");
    unmount();
    render(
      <AlertBanner tone="warning" clampMobile action={<button type="button">Send again</button>}>
        Clamped box
      </AlertBanner>,
    );
    expect(screen.getByRole("button", { name: "More" }).parentElement!.className).not.toContain("basis-28");
  });

  it("names the toggle in the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <AlertBanner clampMobile>Hinweis</AlertBanner>
      </UiKitProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mehr" }));
    expect(screen.getByRole("button", { name: "Weniger" })).toBeInTheDocument();
  });

  it("is ignored on a whole-row banner, whose row is already one button", () => {
    render(
      <AlertBanner clampMobile onClick={() => {}}>
        Open the budget
      </AlertBanner>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("has the words in every catalogue", () => {
    render(
      <UiKitProvider labels={uiKitLabelsZh()}>
        <AlertBanner clampMobile>注意</AlertBanner>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "更多" })).toBeInTheDocument();
  });
});
