import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { TopBarActionMenu } from "../topbar-action-menu";
import { OptionSwitcherMenu } from "../option-switcher-menu";
import { ThemeToggle } from "../topbar-controls";

/**
 * keksdose dev#610 (0.48 R13): the top-bar icon menus — the feedback menu, the avatar
 * menu, the tours menu — had an accessible name and nothing a sighted user could read on
 * hover or focus. They show it in the kit's Tooltip now, the IconButton way: the bubble is
 * visual only (not the trigger's `aria-describedby`), so a screen reader hears the name
 * once, and there is no native `title`.
 */
function renderMenu(props: Partial<Parameters<typeof TopBarActionMenu>[0]> = {}) {
  return render(
    <MemoryRouter>
      <TopBarActionMenu
        icon={<svg aria-hidden />}
        aria-label="Send feedback"
        entries={[{ key: "a", label: "Report a bug", onSelect: () => {} }]}
        {...props}
      />
    </MemoryRouter>,
  );
}

function hoverTarget(el: HTMLElement) {
  // The Tooltip's wrapper is the element listening for the hover.
  return el.parentElement as HTMLElement;
}

describe("TopBarActionMenu names its trigger in a Tooltip (R13)", () => {
  it("shows the name on hover, without describing the trigger by it", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Send feedback" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(hoverTarget(trigger));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Send feedback");
    expect(trigger).not.toHaveAttribute("aria-describedby");
    expect(trigger).not.toHaveAttribute("title");
    expect(trigger).toHaveAccessibleName("Send feedback");
  });

  it("shows it on keyboard focus", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Send feedback" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Send feedback");
  });

  it("the avatar (custom trigger) and badge triggers carry it too, the name unchanged", () => {
    renderMenu({ "aria-label": "Account menu", trigger: () => <span aria-hidden>ME</span> });
    const avatar = screen.getByRole("button", { name: "Account menu" });
    fireEvent.mouseEnter(hoverTarget(avatar));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Account menu");
    expect(avatar).not.toHaveAttribute("aria-describedby");
  });

  it("a link trigger (href) carries it too", () => {
    renderMenu({ "aria-label": "Guided tours", href: "/tours" });
    const link = screen.getByRole("link", { name: "Guided tours" });
    fireEvent.focus(link);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Guided tours");
  });

  it("the menu still opens and its trigger keeps the menu wiring", () => {
    renderMenu();
    const trigger = screen.getByRole("button", { name: "Send feedback" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu", { name: "Send feedback" })).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});

describe("the other top-bar icon triggers name themselves the same way (R13)", () => {
  const options = [
    { value: "a", label: "A" },
    { value: "b", label: "B" },
  ];

  it("OptionSwitcherMenu shows its name without a title, and does not describe the trigger by it", () => {
    render(<OptionSwitcherMenu icon={<svg aria-hidden />} aria-label="Text size" options={options} value="a" onSelect={() => {}} />);
    const trigger = screen.getByRole("button", { name: "Text size" });
    fireEvent.mouseEnter(hoverTarget(trigger));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Text size");
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });

  it("OptionSwitcherMenu: a title equal to the name is not a description either; a different one is", () => {
    const { unmount } = render(
      <OptionSwitcherMenu icon={<svg aria-hidden />} aria-label="Text size" title="Text size" options={options} value="a" onSelect={() => {}} />,
    );
    let trigger = screen.getByRole("button", { name: "Text size" });
    fireEvent.mouseEnter(hoverTarget(trigger));
    expect(trigger).not.toHaveAttribute("aria-describedby");
    unmount();
    render(<OptionSwitcherMenu icon={<svg aria-hidden />} aria-label="Role" title="Role: admin" options={options} value="a" onSelect={() => {}} />);
    trigger = screen.getByRole("button", { name: "Role" });
    fireEvent.mouseEnter(hoverTarget(trigger));
    expect(trigger).toHaveAccessibleDescription("Role: admin");
  });

  it("ThemeToggle shows its name without a title", () => {
    render(<ThemeToggle mode="light" aria-label="Theme" />);
    const trigger = screen.getByRole("button", { name: "Theme" });
    fireEvent.focus(trigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Theme");
    expect(trigger).not.toHaveAttribute("aria-describedby");
  });
});
