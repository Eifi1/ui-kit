import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, useState } from "react";
import type { AnchorHTMLAttributes } from "react";
import { Inbox } from "lucide-react";
import { Button, Card, EmptyState, IconButton, Tabs, buttonClasses } from "../ui";
import type { ButtonVariant } from "../ui";
import { AlertBanner, alertFrameClass, toneFrameClass } from "../alert-banner";
import { Chip } from "../chip";
import { StatTile } from "../stat-tile";
import { Disclosure } from "../disclosure";
import { UiKitProvider } from "../../i18n/kit-labels";

/**
 * The 0.8.0 extensions to the existing surfaces — the app requests from keksdose,
 * kastlan and lenkbank that were each "the kit's component plus one thing we
 * hand-roll". Every item is additive; the existing suites beside this one still pin
 * the pre-0.8.0 behaviour of each component unchanged.
 */

describe("EmptyState icon and action slots", () => {
  it("draws the icon above the title, hidden from assistive tech", () => {
    const { container } = render(<EmptyState title="Inbox zero" icon={<Inbox data-testid="glyph" />} />);
    const glyph = screen.getByTestId("glyph");
    expect(glyph.parentElement).toHaveAttribute("aria-hidden");
    // Before the title in document order.
    const title = screen.getByText("Inbox zero");
    expect(glyph.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.firstElementChild).toContainElement(glyph);
  });

  it("renders several actions in one row after the hint, and they work", () => {
    const retry = vi.fn();
    render(
      <EmptyState
        title="Something went wrong"
        hint="The page could not load."
        action={
          <>
            <Button onClick={retry}>Retry</Button>
            <Button variant="secondary">Reload</Button>
            <a href="/">Go home</a>
          </>
        }
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
    const row = screen.getByRole("button", { name: "Retry" }).parentElement!;
    expect(within(row).getByRole("button", { name: "Reload" })).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Go home" })).toBeInTheDocument();
    const hint = screen.getByText("The page could not load.");
    expect(hint.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("without the slots is exactly the two-line box it was", () => {
    const { container } = render(<EmptyState title="Nothing" hint="Yet" />);
    expect(container.firstElementChild!.children).toHaveLength(2);
  });
});

describe("AlertBanner 0.8.0", () => {
  it("offers info and neutral tones, with frames from the one source", () => {
    expect(toneFrameClass("info")).toContain("border-[var(--info-border)]");
    expect(alertFrameClass("info")).toContain("p-[11px]"); // 2px border, like danger/warning
    expect(alertFrameClass("neutral")).toContain("p-3");
    render(
      <>
        <AlertBanner tone="info" data-testid="info">Preview build</AlertBanner>
        <AlertBanner tone="neutral" data-testid="neutral">Values are rounded</AlertBanner>
      </>,
    );
    expect(screen.getByTestId("info").className).toContain("text-[var(--info)]");
    expect(screen.getByTestId("info").className).toContain("bg-[var(--info-bg)]");
    expect(screen.getByTestId("neutral").className).toContain("border-[var(--border)]");
  });

  it("a neutral banner draws no warning triangle", () => {
    const { container } = render(<AlertBanner tone="neutral">A note</AlertBanner>);
    expect(container.querySelector(".lucide-triangle-alert, .lucide-alert-triangle")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("the default box is still role-less and unchanged in shape", () => {
    render(<AlertBanner data-testid="b">Careful</AlertBanner>);
    const box = screen.getByTestId("b");
    expect(box.tagName).toBe("DIV");
    expect(box).not.toHaveAttribute("role");
    expect(box.className).toContain("border-[var(--danger-border)]");
  });

  it("onDismiss renders a labelled × that calls it", () => {
    const onDismiss = vi.fn();
    render(<AlertBanner tone="info" onDismiss={onDismiss}>Preview build</AlertBanner>);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("the × name comes from the provider's common.dismiss, and the prop wins over it", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ common: { dismiss: "Ausblenden" } }}>
        <AlertBanner onDismiss={() => {}}>x</AlertBanner>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Ausblenden" })).toBeInTheDocument();
    rerender(
      <UiKitProvider labels={{ common: { dismiss: "Ausblenden" } }}>
        <AlertBanner onDismiss={() => {}} dismissLabel="Hide preview notice">
          x
        </AlertBanner>
      </UiKitProvider>,
    );
    expect(screen.getByRole("button", { name: "Hide preview notice" })).toBeInTheDocument();
  });

  it("onClick makes the whole banner ONE button — no nested control", () => {
    const onClick = vi.fn();
    render(
      <AlertBanner tone="warning" onClick={onClick} data-testid="row">
        Budget 92% spent
      </AlertBanner>,
    );
    const button = screen.getByRole("button", { name: /Budget 92% spent/ });
    expect(button).toBe(screen.getByTestId("row"));
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toContain("border-[var(--warning-border)]");
    expect(button.querySelectorAll("button, a")).toHaveLength(0);
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("href makes the whole banner one link", () => {
    render(<AlertBanner href="/budget">Budget 92% spent</AlertBanner>);
    const link = screen.getByRole("link", { name: /Budget 92% spent/ });
    expect(link).toHaveAttribute("href", "/budget");
  });

  it("a whole-row banner with onDismiss keeps the two as siblings, and × does not click the row", () => {
    const onClick = vi.fn();
    const onDismiss = vi.fn();
    render(
      <AlertBanner onClick={onClick} onDismiss={onDismiss}>
        Budget exceeded
      </AlertBanner>,
    );
    const row = screen.getByRole("button", { name: /Budget exceeded/ });
    const x = screen.getByRole("button", { name: "Dismiss" });
    expect(row).not.toContainElement(x);
    expect(x).not.toContainElement(row);
    fireEvent.click(x);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("inline is frameless, toned, and a live region (status; alert for danger)", () => {
    render(
      <>
        <AlertBanner variant="inline" tone="warning">
          Radius below the minimum
        </AlertBanner>
        <AlertBanner variant="inline" tone="danger">
          Solver failed
        </AlertBanner>
      </>,
    );
    const warning = screen.getByRole("status");
    expect(warning).toHaveTextContent("Radius below the minimum");
    expect(warning.className).toContain("text-[var(--warning)]");
    expect(warning.className).toContain("inline-flex");
    expect(warning.className).not.toMatch(/\bborder|\bp-|\bbg-/);
    expect(screen.getByRole("alert")).toHaveTextContent("Solver failed");
  });

  it("inline takes a replacement icon (a spinner for 'Solving…'), and a caller's role wins", () => {
    render(
      <AlertBanner variant="inline" tone="info" role="note" icon={<span data-testid="spin" />}>
        Solving…
      </AlertBanner>,
    );
    expect(screen.getByRole("note")).toHaveTextContent("Solving…");
    expect(screen.getByTestId("spin").parentElement).toHaveAttribute("aria-hidden");
  });
});

describe("Chip 0.8.0", () => {
  it("variant=outline drops the surface and keeps the tone's border and text", () => {
    render(<Chip variant="outline" tone="warning" data-testid="c">DEV</Chip>);
    const chip = screen.getByTestId("c");
    expect(chip.className).toContain("bg-transparent");
    expect(chip.className).toContain("border-[var(--warning-border)]");
    expect(chip.className).toContain("text-[var(--warning)]");
    expect(chip.className).not.toContain("bg-[var(--warning-bg)]");
  });

  it("variant=solid is the filled count style under contrasting text", () => {
    render(<Chip variant="solid" tone="brand" size="sm" data-testid="c">3</Chip>);
    const chip = screen.getByTestId("c");
    expect(chip.className).toContain("bg-[var(--brand)]");
    expect(chip.className).toContain("text-[var(--brand-contrast)]");
    expect(chip.className).toContain("tabular-nums");
  });

  it("the default is still the soft look", () => {
    render(<Chip tone="warning" data-testid="c">x</Chip>);
    expect(screen.getByTestId("c").className).toContain("bg-[var(--warning-bg)]");
  });

  it("shape=square swaps the pill radius, on the split pill too", () => {
    const { rerender } = render(<Chip shape="square" data-testid="c">x</Chip>);
    expect(screen.getByTestId("c").className).toContain("rounded-md");
    expect(screen.getByTestId("c").className).not.toContain("rounded-full");
    rerender(
      <Chip shape="square" onClick={() => {}} onRemove={() => {}} data-testid="c">
        x
      </Chip>,
    );
    const body = screen.getByTestId("c");
    expect(body.className).not.toContain("rounded-full");
    expect(body.parentElement!.className).toContain("rounded-md");
  });

  it("caps sets the tracked uppercase status-badge type in place of the size's", () => {
    render(<Chip caps size="sm" data-testid="c">Paid</Chip>);
    const chip = screen.getByTestId("c");
    expect(chip.className).toContain("uppercase");
    expect(chip.className).toContain("tracking-wider");
    expect(chip.className).toContain("text-[10px]");
    expect(chip.className).not.toMatch(/\btext-xs\b/);
    // The text is still what the caller wrote: case is paint.
    expect(chip).toHaveTextContent("Paid");
  });

  it("removeDisabled disables only the ×; the chip still works", () => {
    const onClick = vi.fn();
    const onRemove = vi.fn();
    render(
      <Chip onClick={onClick} onRemove={onRemove} removeDisabled>
        Groceries
      </Chip>,
    );
    const x = screen.getByRole("button", { name: "Remove: Groceries" });
    expect(x).toBeDisabled();
    fireEvent.click(x);
    expect(onRemove).not.toHaveBeenCalled();
    const body = screen.getByRole("button", { name: "Groceries" });
    expect(body).toBeEnabled();
    fireEvent.click(body);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renderLink draws the link with the caller's router Link, keeping the pill look and the ref", () => {
    // A stand-in for react-router's <Link>: takes `to`, not `href`.
    const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }>(
      function RouterLink({ to, ...props }, ref) {
        // eslint-disable-next-line jsx-a11y/anchor-has-content -- the content arrives in `props.children`
        return <a ref={ref} data-router="" href={to} {...props} />;
      },
    );
    const ref = { current: null as HTMLElement | null };
    render(
      <Chip
        ref={ref}
        href="/admin"
        tone="brand"
        selected
        data-testid="c"
        renderLink={({ href, ...p }) => <RouterLink to={href} {...p} />}
      >
        Admin
      </Chip>,
    );
    const link = screen.getByRole("link", { name: "Admin" });
    expect(link).toHaveAttribute("data-router");
    expect(link).toHaveAttribute("href", "/admin");
    expect(link).toHaveAttribute("aria-current", "true");
    expect(link).toHaveAttribute("data-testid", "c");
    expect(link.className).toContain("rounded-full");
    expect(ref.current).toBe(link);
  });

  it("keeps href and onClick mutually exclusive in the types, renderLink included", () => {
    // @ts-expect-error — a chip is a link or a button, never both.
    const both = <Chip href="/a" onClick={() => {}}>x</Chip>;
    // @ts-expect-error — renderLink belongs to the link shape.
    const renderOnButton = <Chip onClick={() => {}} renderLink={() => <a href="/b">b</a>}>x</Chip>;
    expect(both).toBeTruthy();
    expect(renderOnButton).toBeTruthy();
  });
});

describe("Button variant=link", () => {
  it("is a <button> with the text-link look and a focus ring", () => {
    render(<Button variant="link">Resend code</Button>);
    const button = screen.getByRole("button", { name: "Resend code" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.className).toContain("hover:underline");
    expect(button.className).toContain("focus:ring-2");
    expect(button.className).toContain("p-0");
    expect(button.className).not.toMatch(/\bpx-3\b|\bpy-2\b/);
  });

  it("buttonClasses covers every variant, and matches <Button> for each", () => {
    const variants: ButtonVariant[] = ["primary", "secondary", "ghost", "danger", "brand", "link"];
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>x</Button>);
      expect(screen.getByRole("button").className).toBe(buttonClasses(variant));
      unmount();
    }
    expect(buttonClasses("link")).toContain("hover:underline");
  });
});

describe("IconButton 0.8.0", () => {
  it("size=lg is the 44px touch target", () => {
    render(<IconButton size="lg" aria-label="Delete selected">x</IconButton>);
    expect(screen.getByRole("button").className).toContain("size-11");
  });

  it("tone=warning is amber at rest", () => {
    render(<IconButton tone="warning" aria-label="Needs review">x</IconButton>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("text-[var(--warning)]");
    expect(cls).toContain("focus:ring-[var(--warning-border)]");
  });

  it("variant=overlay is a round translucent disc, even at the small sizes", () => {
    render(<IconButton variant="overlay" size="xs" aria-label="Rotate">x</IconButton>);
    const cls = screen.getByRole("button").className;
    expect(cls).toContain("rounded-full");
    expect(cls).not.toMatch(/\brounded(?!-full)\b/);
    expect(cls).toContain("var(--bg-inverse)");
    expect(cls).toContain("text-[var(--text-inverse)]");
  });
});

describe("Card variant=inset", () => {
  it("is surface-2 with its own small padding, no border and no shadow", () => {
    render(<Card variant="inset" data-testid="c">Results</Card>);
    const cls = screen.getByTestId("c").className;
    expect(cls).toContain("bg-[var(--bg-surface-2)]");
    expect(cls).toContain("p-3");
    expect(cls).not.toContain("shadow");
    expect(cls).not.toMatch(/\bborder\b/);
  });

  it("a caller's padding still wins, and the default card is unchanged", () => {
    const { rerender } = render(<Card variant="inset" className="p-2" data-testid="c">x</Card>);
    expect(screen.getByTestId("c").className).not.toContain("p-3");
    rerender(<Card data-testid="c">x</Card>);
    expect(screen.getByTestId("c").className).toContain("shadow-sm");
  });
});

describe("StatTile truncateLabel", () => {
  const widths = (scroll: number, client: number) => {
    vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scroll);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(client);
  };
  afterEach(() => vi.restoreAllMocks());

  it("truncates the label, and shows no bubble while it fits", () => {
    widths(80, 120);
    render(<StatTile label="Active subscriptions" value={12} truncateLabel />);
    const label = screen.getByText("Active subscriptions");
    expect(label.className).toContain("truncate");
    fireEvent.mouseEnter(label);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the full label in a tooltip once it is cut", () => {
    widths(300, 120);
    render(<StatTile label="Aktive Abonnements (30 Tage)" value={12} truncateLabel />);
    const label = screen.getByText("Aktive Abonnements (30 Tage)");
    fireEvent.mouseEnter(label);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Aktive Abonnements (30 Tage)");
  });

  it("the link tile keeps the full label as its accessible name", () => {
    widths(300, 120);
    render(<StatTile label="Aktive Abonnements (30 Tage)" value={12} href="/subs" truncateLabel />);
    expect(screen.getByRole("link", { name: "Aktive Abonnements (30 Tage)" })).toBeInTheDocument();
  });

  it("off by default: the label wraps as it always has", () => {
    widths(300, 120);
    render(<StatTile label="Revenue" value={1} />);
    expect(screen.getByText("Revenue").className).not.toContain("truncate");
  });
});

describe("Disclosure bare chevronPosition=end", () => {
  const chevron = (button: HTMLElement) => button.querySelector("svg")!;

  it("puts the chevron after the title, pointing down while shut and up when open", () => {
    render(
      <Disclosure variant="bare" chevronPosition="end" title="Language">
        list
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "Language" });
    const svg = chevron(button);
    const title = screen.getByText("Language");
    expect(title.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(svg.getAttribute("class")).not.toContain("-rotate-90");
    fireEvent.click(button);
    expect(chevron(button).getAttribute("class")).toContain("rotate-180");
  });

  it("with trailing, the chevron follows the trailing content", () => {
    render(
      <Disclosure variant="bare" chevronPosition="end" title="Language" trailing={<span>🇩🇪</span>}>
        list
      </Disclosure>,
    );
    const flag = screen.getByText("🇩🇪");
    const row = flag.parentElement!.parentElement!;
    const svg = row.lastElementChild!;
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(flag.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("the default bare disclosure still leads with its chevron", () => {
    render(<Disclosure variant="bare" title="Show more">x</Disclosure>);
    const button = screen.getByRole("button", { name: "Show more" });
    expect(button.firstElementChild!.tagName.toLowerCase()).toBe("svg");
  });
});

describe("Tabs orientation=vertical", () => {
  const TABS = [
    { id: "users", label: "Users", href: "/admin/users" },
    { id: "billing", label: "Billing", href: "/admin/billing", badge: <span>3</span> },
    { id: "logs", label: "Logs", href: "/admin/logs" },
  ];

  function Harness({ onChange }: { onChange?: (id: string) => void }) {
    const [active, setActive] = useState("users");
    return (
      <Tabs
        tabs={TABS}
        active={active}
        orientation="vertical"
        aria-label="Admin"
        onChange={(id) => {
          setActive(id);
          onChange?.(id);
        }}
      />
    );
  }

  afterEach(() => {
    Reflect.deleteProperty(window, "matchMedia");
  });

  it("is a vertical tablist of routed links", () => {
    render(<Harness />);
    const list = screen.getByRole("tablist", { name: "Admin" });
    expect(list).toHaveAttribute("aria-orientation", "vertical");
    expect(list.className).toContain("flex-col");
    const tab = screen.getByRole("tab", { name: "Users" });
    expect(tab.tagName).toBe("A");
    expect(tab).toHaveAttribute("href", "/admin/users");
    expect(tab).toHaveAttribute("aria-selected", "true");
  });

  it("↓/↑ walk it (wrapping), ←/→ do not, and moving focus does not navigate", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole("tab", { name: "Users" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: /Billing/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: /Billing/ })).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("tab", { name: "Logs" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Users" })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    await user.keyboard("{End} ");
    expect(onChange).toHaveBeenCalledWith("logs");
  });

  it("a plain click on a routed tab stays client-side; a modified click is the browser's", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const billing = screen.getByRole("tab", { name: /Billing/ });
    expect(fireEvent.click(billing)).toBe(false); // default prevented
    expect(onChange).toHaveBeenCalledWith("billing");
    onChange.mockClear();
    expect(fireEvent.click(billing, { ctrlKey: true })).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("puts the badge at the row's end", () => {
    render(<Harness />);
    const badge = screen.getByText("3");
    expect(badge.parentElement!.className).toContain("ms-auto");
  });

  it("on a phone it is the horizontal strip, and says so", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({
        matches: query.includes("max-width: 767px"),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    const user = userEvent.setup();
    render(<Harness />);
    const list = screen.getByRole("tablist");
    expect(list).not.toHaveAttribute("aria-orientation");
    expect(list.className).not.toContain("flex-col");
    screen.getByRole("tab", { name: "Users" }).focus();
    await act(async () => {
      await user.keyboard("{ArrowRight}");
    });
    expect(screen.getByRole("tab", { name: /Billing/ })).toHaveFocus();
  });

  it("a horizontal strip still ignores ↑/↓ and carries no aria-orientation", async () => {
    const user = userEvent.setup();
    render(<Tabs tabs={TABS} active="users" onChange={() => {}} />);
    expect(screen.getByRole("tablist")).not.toHaveAttribute("aria-orientation");
    screen.getByRole("tab", { name: "Users" }).focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("tab", { name: "Users" })).toHaveFocus();
  });
});
