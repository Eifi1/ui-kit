import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserAvatar, avatarInitials } from "../user-avatar";

/**
 * The email is the fallback for a name that is not THERE — including one that is
 * present and blank.
 *
 * The source line was `(name ?? email ?? "?").trim()`, and `??` only falls through on
 * null/undefined: an empty string is a value, so it won the choice and then failed the
 * emptiness guard on the next line, returning "?" with a usable email in hand — the
 * opposite of what the docstring promises. Keksdose's own API cannot produce it
 * (`display_name` is `min_length=1`), which is exactly why it went unnoticed: this
 * helper is exported as app-agnostic, and a consumer whose profile name is optional
 * free text renders "?" for every such user.
 */
describe("avatarInitials", () => {
  it("takes the first two initials of a display name", () => {
    expect(avatarInitials("Marcel Eifert", "marcel@x.com")).toBe("ME");
  });

  it("takes two letters of a single-word name", () => {
    expect(avatarInitials("Marcel", null)).toBe("MA");
  });

  it("falls back to the email when there is no name at all", () => {
    expect(avatarInitials(null, "marcel@x.com")).toBe("MA");
    expect(avatarInitials(undefined, "marcel@x.com")).toBe("MA");
  });

  it("falls back to the email when the name is present but blank", () => {
    expect(avatarInitials("", "marcel@x.com")).toBe("MA");
    expect(avatarInitials("   ", "marcel@x.com")).toBe("MA");
  });

  it("falls back to the email when IT is the blank one", () => {
    expect(avatarInitials("Marcel Eifert", "  ")).toBe("ME");
  });

  it("gives up with a question mark only when both are blank", () => {
    expect(avatarInitials("", "")).toBe("?");
    expect(avatarInitials(null, null)).toBe("?");
    expect(avatarInitials("  ", "   ")).toBe("?");
  });

  it("renders those initials in the chip", () => {
    render(<UserAvatar name="" email="marcel@x.com" />);
    expect(screen.getByText("MA")).toBeInTheDocument();
  });
});

/** keksdose's unread dot (account-menu ~385, top-bar :152), drawn by hand in rose with a
 *  ring — as a prop, with the meaning a screen reader can hear. */
describe("UserAvatar badge", () => {
  it("draws a ringed status dot in the top-end corner", () => {
    const { container } = render(<UserAvatar name="Marcel Eifert" badge={{ label: "3 unread" }} />);
    const dot = container.querySelector(".absolute")!;
    expect(dot.className).toContain("ring-2");
    expect(dot.className).toContain("-end-0.5");
    expect(dot.className).toContain("bg-[var(--danger)]");
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("reads its label, and still hides the initials", () => {
    render(
      <button type="button">
        <UserAvatar name="Marcel Eifert" badge={{ label: "3 unread", tone: "info" }} />
      </button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("3 unread");
    expect(screen.getByText("ME")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps className on the circle and the other attributes on the wrapper", () => {
    const { container } = render(
      <UserAvatar name="Marcel Eifert" size="lg" className="size-10" data-testid="av" badge={{ label: "Online", tone: "success" }} />,
    );
    const wrapper = screen.getByTestId("av");
    expect(wrapper).toBe(container.firstChild);
    expect(screen.getByText("ME").className).toContain("size-10");
    expect(container.querySelector(".absolute")!.className).toContain("size-3");
  });

  it("renders exactly as before without a badge", () => {
    const { container } = render(<UserAvatar name="Marcel Eifert" badge={null} />);
    expect(container.firstChild).toBe(screen.getByText("ME"));
    expect(container.querySelector(".absolute")).toBeNull();
  });
});
