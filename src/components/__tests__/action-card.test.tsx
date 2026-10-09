import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KeyRound } from "lucide-react";
import { ActionCard } from "../choice-card";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkComponent } from "../../i18n/kit-labels";

describe("ActionCard (keksdose CustodyOption)", () => {
  it("is a button named by the title and described by body and meta", () => {
    render(
      <ActionCard
        icon={KeyRound}
        title="Keep the key yourself"
        description="Only you can read your data."
        meta="Lose the key and the data is gone."
        metaTone="warning"
        onClick={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Keep the key yourself" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAccessibleDescription("Only you can read your data. Lose the key and the data is gone.");
    expect(screen.getByText("Lose the key and the data is gone.").className).toContain("text-[var(--warning)]");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("runs its action on click, and not when disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<ActionCard title="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<ActionCard title="Go" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("with only a title it has no description", () => {
    render(<ActionCard title="Go" />);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
  });
});

const routerLink: KitLinkComponent = ({ href, children, ...p }) => (
  <a {...p} href={href} data-router="">
    {children}
  </a>
);

describe("ActionCard — link card and icon tone", () => {
  it("with href is a link named by the title and described by the rest", () => {
    render(<ActionCard href="/units" title="Units" description="All units" icon={KeyRound} />);
    const link = screen.getByRole("link", { name: "Units" });
    expect(link).toHaveAttribute("href", "/units");
    expect(link).toHaveAccessibleDescription("All units");
    expect(link).not.toHaveAttribute("type");
  });

  it("draws the link with linkComponent; its own renderLink wins; a disabled card is the inert button", () => {
    const { unmount } = render(
      <UiKitProvider linkComponent={routerLink}>
        <ActionCard href="/units" title="Units" />
        <ActionCard href="/own" title="Own" renderLink={(p) => <a {...p} data-own="">{p.children}</a>} />
        <ActionCard href="/off" title="Off" disabled />
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Units" })).toHaveAttribute("data-router");
    expect(screen.getByRole("link", { name: "Own" })).toHaveAttribute("data-own");
    expect(screen.getByRole("link", { name: "Own" })).not.toHaveAttribute("data-router");
    expect(screen.getByRole("button", { name: "Off" })).toBeDisabled();
    unmount();
  });

  it("tints the icon with iconTone and takes iconClassName", () => {
    render(<ActionCard title="Go" icon={KeyRound} iconTone="brand" iconClassName="size-6" />);
    const icon = screen.getByRole("button").querySelector("svg")!;
    // The brand as text, `--brand-muted` (0.33): `--brand` is solved to 3:1 only.
    expect(icon.getAttribute("class")).toContain("text-brand-muted");
    expect(icon.getAttribute("class")).not.toContain("text-[var(--brand)]");
    expect(icon.getAttribute("class")).toContain("size-6");
    expect(icon.getAttribute("class")).not.toContain("text-[var(--text-secondary)]");
  });
});
