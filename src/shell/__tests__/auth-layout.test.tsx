import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthLayout } from "../auth-layout";

/**
 * kastlan's login / register / verify-email / two-factor pages (narrow card) and its
 * legal layout (wide, no card) as one frame.
 */
describe("AuthLayout", () => {
  it("renders the sign-in frame: brand tile, h1, description, card content, corner, legal footer", () => {
    const { container } = render(
      <AuthLayout
        logo={<svg data-testid="mark" />}
        title="Kastlan"
        description="Sign in to your account"
        themeToggle={<button type="button">Theme</button>}
        languageMenu={<button type="button">Language</button>}
        footerLabel="Legal"
        footer={
          <>
            <a href="/impressum">Imprint</a>
            <a href="/privacy">Privacy</a>
          </>
        }
      >
        <form aria-label="Sign in" />
      </AuthLayout>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-auth-layout", "narrow");

    expect(screen.getByRole("heading", { level: 1, name: "Kastlan" })).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
    const tile = screen.getByTestId("mark").parentElement!;
    expect(tile.className).toContain("bg-[var(--brand)]");

    const main = screen.getByRole("main");
    expect(within(main).getByRole("form", { name: "Sign in" })).toBeInTheDocument();
    expect(main.querySelector(".max-w-sm")).not.toBeNull();
    // Centred header in the narrow variant.
    expect(main.querySelector("[data-slot=auth-layout-header]")!.className).toContain("text-center");

    const legal = screen.getByRole("navigation", { name: "Legal" });
    expect(within(legal).getAllByRole("link").map((a) => a.textContent)).toEqual(["Imprint", "Privacy"]);
    expect(legal.closest("footer")).not.toBeNull();

    // Reading order: corner controls (theme, then language), the page, the footer.
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons).toEqual(["Theme", "Language"]);
    const corner = root.querySelector("[data-slot=auth-layout-corner]")!;
    expect(corner.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("pads for the safe areas, and keeps a caller's own style", () => {
    const { container } = render(
      <AuthLayout title="x" style={{ color: "red" }} data-testid="page">
        body
      </AuthLayout>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.paddingTop).toContain("safe-area-inset-top");
    expect(root.style.paddingBottom).toContain("safe-area-inset-bottom");
    expect(root.style.paddingLeft).toContain("safe-area-inset-left");
    expect(root.style.paddingRight).toContain("safe-area-inset-right");
    expect(root.style.color).toBe("red");
    expect(root).toHaveAttribute("data-testid", "page");
  });

  it("omits the empty parts: no corner, no footer, no header", () => {
    const { container } = render(<AuthLayout>only content</AuthLayout>);
    expect(container.querySelector("[data-slot=auth-layout-corner]")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
    expect(container.querySelector("[data-slot=auth-layout-header]")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.getByText("only content")).toBeInTheDocument();
  });

  it("draws the logo without the tile when asked", () => {
    render(
      <AuthLayout logo={<img alt="Acme" src="/logo.png" />} logoTile={false} title="Acme">
        x
      </AuthLayout>,
    );
    expect(screen.getByRole("img", { name: "Acme" }).parentElement!.className).not.toContain("bg-[var(--brand)]");
  });

  it("renders the legal variant: wide column, start-aligned header, back link, no card, plain footer", () => {
    const { container } = render(
      <AuthLayout
        width="wide"
        card={false}
        title="Imprint"
        back={<a href="/login">Back to sign in</a>}
        footer={<a href="/terms">Terms</a>}
      >
        <section>Legal text</section>
      </AuthLayout>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-auth-layout", "wide");
    const main = screen.getByRole("main");
    expect(main.querySelector(".max-w-3xl")).not.toBeNull();
    expect(main.querySelector(".max-w-sm")).toBeNull();
    expect(main.querySelector("[data-slot=auth-layout-header]")!.className).toContain("text-start");
    // No card chrome.
    expect(main.querySelector(".shadow-sm")).toBeNull();
    // The back link precedes the heading.
    const back = screen.getByRole("link", { name: "Back to sign in" });
    const h1 = screen.getByRole("heading", { level: 1, name: "Imprint" });
    expect(back.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Footer without a label is a plain block, not a nav landmark.
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(within(container.querySelector("footer")!).getByRole("link", { name: "Terms" })).toBeInTheDocument();
  });

  it("wraps the content in a card by default", () => {
    render(
      <AuthLayout title="Verify email" cardClassName="custom-card">
        status
      </AuthLayout>,
    );
    const card = screen.getByText("status").closest(".custom-card")!;
    expect(card.className).toContain("rounded-lg");
    expect(within(card as HTMLElement).getByRole("heading", { name: "Verify email" })).toBeInTheDocument();
  });
});
