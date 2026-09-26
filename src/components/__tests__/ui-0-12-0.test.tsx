import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Check, Cloud } from "lucide-react";
import { Button, Card, CardTitle, IconButton, Spinner, buttonClasses } from "../ui";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkProps } from "../../i18n/kit-labels";

/**
 * 0.12.0's asks of the basic controls: a Button that is a link (kastlan's six
 * `buttonClasses` Links and 26 navigate() buttons), a pending Button (FormActions), a
 * toned Card (the dunning summary), a Spinner that shows its words (LoadingState), and
 * keksdose's sync chip and camera shutter as IconButtons.
 */

function RouterLink({ href, ...props }: KitLinkProps) {
  // eslint-disable-next-line jsx-a11y/anchor-has-content -- children arrive in `props`
  return <a data-router="" data-to={href} href={href} {...props} />;
}

describe("Button href", () => {
  it("renders a plain <a> with the button look when there is no router link", () => {
    render(
      <Button href="/invoices/new" variant="brand">
        New invoice
      </Button>,
    );
    const link = screen.getByRole("link", { name: "New invoice" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/invoices/new");
    expect(link.className).toBe(buttonClasses("brand"));
  });

  it("uses the provider's router link, and renderLink over it", () => {
    const { rerender } = render(
      <UiKitProvider linkComponent={RouterLink}>
        <Button href="/login">Log in</Button>
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("data-to", "/login");

    // eslint-disable-next-line jsx-a11y/anchor-has-content -- children arrive in `p`
    const own = vi.fn(({ href, ...p }: KitLinkProps) => <a data-own={href} href={href} {...p} />);
    rerender(
      <UiKitProvider linkComponent={RouterLink}>
        <Button href="/login" renderLink={own}>
          Log in
        </Button>
      </UiKitProvider>,
    );
    const link = screen.getByRole("link", { name: "Log in" });
    expect(link).toHaveAttribute("data-own", "/login");
    expect(link).not.toHaveAttribute("data-router");
  });

  it("external: a plain new-tab <a>, never the router link, and says so", () => {
    render(
      <UiKitProvider linkComponent={RouterLink}>
        <Button href="https://stripe.example/inv.pdf" external variant="ghost">
          Download
        </Button>
      </UiKitProvider>,
    );
    const link = screen.getByRole("link", { name: "Download (opens in a new tab)" });
    expect(link).not.toHaveAttribute("data-router");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link.className.split(" ")).toContain("relative");
  });

  it("translates the new-tab note through common.opensInNewTab", () => {
    render(
      <UiKitProvider labels={{ common: { opensInNewTab: "öffnet in einem neuen Tab" } }}>
        <Button href="/units/1" target="_blank">
          Öffnen
        </Button>
      </UiKitProvider>,
    );
    expect(screen.getByRole("link", { name: "Öffnen (öffnet in einem neuen Tab)" })).toBeInTheDocument();
  });

  it("disabled: no href, aria-disabled, not the router link", () => {
    render(
      <UiKitProvider linkComponent={RouterLink}>
        <Button href="/leases/new" disabled>
          New lease
        </Button>
      </UiKitProvider>,
    );
    const link = screen.getByRole("link", { name: "New lease" });
    expect(link).not.toHaveAttribute("href");
    expect(link).not.toHaveAttribute("data-router");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link.className.split(" ")).toEqual(expect.arrayContaining(["opacity-50", "pointer-events-none"]));
  });

  it("does not type `type` or `form` together with href", () => {
    // @ts-expect-error — a link never submits
    const a = <Button href="/x" type="submit">x</Button>;
    // @ts-expect-error — nor belongs to a form
    const b = <Button href="/x" form="f">x</Button>;
    expect([a, b]).toHaveLength(2);
  });
});

describe("Button pending", () => {
  it("is busy, swallows the click, keeps focus and keeps its label as the name", () => {
    const onClick = vi.fn();
    render(
      <Button pending onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).not.toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps the label in the layout (transparent) with the spinner over it", () => {
    const { container } = render(<Button pending>Save</Button>);
    const label = screen.getByText("Save");
    expect(label.className.split(" ")).toContain("opacity-0");
    const ring = container.querySelector("[aria-hidden].animate-spin")!;
    expect(ring.className.split(" ")).toEqual(expect.arrayContaining(["absolute", "border-2", "border-t-current"]));
    expect(screen.getByRole("button").className.split(" ")).toContain("relative");
  });

  it("does not submit its form", () => {
    const onSubmit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" pending>
          Save
        </Button>
      </form>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("without pending, the button is unchanged", () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole("button");
    expect(button).not.toHaveAttribute("aria-busy");
    expect(button.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  });
});

describe("Card tone", () => {
  it("tones the border and the title", () => {
    const { container } = render(
      <Card tone="warning">
        <CardTitle>Dunning</CardTitle>
      </Card>,
    );
    const card = container.firstElementChild!;
    expect(card).toHaveAttribute("data-tone", "warning");
    const cls = card.className.split(" ");
    expect(cls).toContain("border-[var(--warning-border)]");
    expect(cls).not.toContain("border-[var(--border)]");
    expect(cls).toContain("[&_[data-slot=card-title]]:text-[var(--warning)]");
  });

  it("an inset panel takes the tone's fill instead of a border", () => {
    const { container } = render(<Card variant="inset" tone="danger">x</Card>);
    const cls = container.firstElementChild!.className.split(" ");
    expect(cls).toContain("bg-[var(--danger-bg)]");
    expect(cls).not.toContain("bg-[var(--bg-surface-2)]");
  });

  it("without a tone, nothing changes", () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstElementChild).not.toHaveAttribute("data-tone");
  });
});

describe("Spinner showLabel", () => {
  it("shows the label as text, which is also the status's content, once", () => {
    const { container } = render(<Spinner label="Loading invoices…" showLabel />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent(/^Loading invoices…$/);
    expect(container.querySelector(".sr-only")).toBeNull();
    expect(container.querySelector(".animate-spin")).toHaveAttribute("aria-hidden");
  });

  it("className sizes the ring; below stacks the text", () => {
    const { container } = render(<Spinner showLabel labelPosition="below" className="h-8 w-8" />);
    expect(container.querySelector(".animate-spin")!.className.split(" ")).toContain("h-8");
    expect(screen.getByRole("status").className.split(" ")).toContain("flex-col");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("is ignored with label={null}", () => {
    const { container } = render(<Spinner label={null} showLabel />);
    expect(container.textContent).toBe("");
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("IconButton (keksdose E1)", () => {
  it("glyphSize overrides the box's glyph: a 24px chip with a 20px cloud", () => {
    render(
      <IconButton size="2xs" glyphSize={20} shape="round" aria-label="In sync">
        <Cloud />
      </IconButton>,
    );
    const cls = screen.getByRole("button").className.split(" ");
    expect(cls).toContain("size-6");
    expect(cls).toContain("[&_svg]:size-5");
    expect(cls).not.toContain("[&_svg]:size-3.5");
  });

  it("badge renders outside the button, decorative, at 12px", () => {
    const { container } = render(
      <IconButton size="2xs" glyphSize={20} label="In sync" tooltip={false} badge={<Check />}>
        <Cloud />
      </IconButton>,
    );
    const button = screen.getByRole("button", { name: "In sync" });
    const badge = container.querySelector('[data-slot="icon-button-badge"]')!;
    expect(button.contains(badge)).toBe(false);
    expect(badge).toHaveAttribute("aria-hidden");
    expect(badge.className.split(" ")).toContain("[&_svg]:size-3");
    expect(badge.parentElement).toBe(button.parentElement);
    expect(button.parentElement!.className.split(" ")).toContain("relative");
  });

  it("no badge, no wrapper", () => {
    const { container } = render(<IconButton aria-label="x"><Cloud /></IconButton>);
    expect(container.firstElementChild!.tagName).toBe("BUTTON");
  });

  it("badge also works under a label tooltip", () => {
    const { container } = render(
      <IconButton label="In sync" badge={<Check />}>
        <Cloud />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "In sync" })).toBeInTheDocument();
    expect(container.querySelector('[data-slot="icon-button-badge"]')).not.toBeNull();
  });

  it('disabledStyle="keep" drops the dimming, for a status that is also an action', () => {
    render(
      <IconButton disabled disabledStyle="keep" tone="success" aria-label="In sync">
        <Cloud />
      </IconButton>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    const cls = button.className.split(" ");
    expect(cls).toContain("disabled:opacity-100");
    expect(cls).toContain("disabled:cursor-default");
  });

  it("the default disabled look still dims", () => {
    render(<IconButton disabled aria-label="x"><Cloud /></IconButton>);
    expect(screen.getByRole("button").className.split(" ")).not.toContain("disabled:opacity-100");
  });

  it('size="2xl" variant="shutter": a 64px ringed disc with a 28px glyph', () => {
    render(
      <IconButton size="2xl" variant="shutter" aria-label="Take photo">
        <Cloud />
      </IconButton>,
    );
    const cls = screen.getByRole("button").className.split(" ");
    for (const c of ["size-16", "[&_svg]:size-7", "rounded-full", "border-4", "border-[var(--media-ink)]"]) {
      expect(cls).toContain(c);
    }
  });
});
