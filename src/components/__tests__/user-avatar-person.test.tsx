import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UserAvatar } from "../user-avatar";

/**
 * 0.29.0: `person={{ first, last }}` (docs/auth-harmonization.md §3.2) — preferred over
 * `name`, initials in the READER's order (the provider's locale). Additive: without it
 * the avatar is what it was. Synthetic people only.
 */
describe("UserAvatar person", () => {
  it("takes the initials from the person, over the display name", () => {
    render(<UserAvatar person={{ first: "Ada", last: "Example" }} name="Someone Else" email="x@example.com" />);
    expect(screen.getByText("AE")).toHaveAttribute("aria-hidden", "true");
  });

  it("follows the provider's locale: family name first in hu, one character for a CJK name in zh", () => {
    const { unmount } = render(
      <UiKitProvider locale="hu">
        <UserAvatar person={{ first: "Ada", last: "Example" }} />
      </UiKitProvider>,
    );
    expect(screen.getByText("EA")).toBeInTheDocument();
    unmount();
    render(
      <UiKitProvider locale="zh-CN">
        <UserAvatar person={{ first: "小龙", last: "李" }} />
        <UserAvatar person={{ first: "Ada", last: "Lovelace" }} />
      </UiKitProvider>,
    );
    expect(screen.getByText("李")).toBeInTheDocument();
    // A Latin name in a Chinese UI keeps its written order.
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("keeps a migrated user's initials (whole display name in first, no last)", () => {
    render(<UserAvatar person={{ first: "Ada Example", last: "" }} />);
    expect(screen.getByText("AE")).toBeInTheDocument();
  });

  it("falls back to name, then email, when both parts are blank", () => {
    const { unmount } = render(<UserAvatar person={{ first: " ", last: "" }} name="Bea Sample" />);
    expect(screen.getByText("BS")).toBeInTheDocument();
    unmount();
    render(<UserAvatar person={{ first: null, last: null }} email="cy@example.com" />);
    expect(screen.getByText("CY")).toBeInTheDocument();
  });

  it("is unchanged without a person, and with a badge", () => {
    const { unmount } = render(<UserAvatar name="Bea Sample" person={null} />);
    expect(screen.getByText("BS")).toBeInTheDocument();
    unmount();
    render(
      <button type="button">
        <UserAvatar person={{ first: "Ada", last: "Example" }} badge={{ label: "2 unread" }} />
      </button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("2 unread");
    expect(screen.getByText("AE")).toHaveAttribute("aria-hidden", "true");
  });
});
