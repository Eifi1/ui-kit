import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Pencil } from "lucide-react";
import { Button, IconButton } from "../ui";
import { TextLink } from "../text-link";
import { UiKitProvider } from "../../i18n/kit-labels";
import type { KitLinkProps } from "../../i18n/kit-labels";

/**
 * 0.13's link asks: `replace` / `reloadDocument` on Button and TextLink (keksdose F1),
 * IconButton `href` (keksdose F2, kastlan 45), TextLink `tone="primary" | "secondary"`
 * (keksdose F3) and `tone="warning"` (kastlan 46), and IconButton `toneColor` as a
 * light/dark pair (keksdose).
 */

/** The provider's router link: records `replace` as data, the way an app maps it. */
function RouterLink({ href, replace, ...props }: KitLinkProps) {
  return (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- children arrive in `props`
    <a data-router="" data-replace={replace === undefined ? "absent" : String(replace)} href={href} {...props} />
  );
}

const withRouter = (ui: React.ReactNode) => render(<UiKitProvider linkComponent={RouterLink}>{ui}</UiKitProvider>);

afterEach(() => vi.restoreAllMocks());

/** Stubs `location.replace`, which jsdom does not implement. */
function stubLocationReplace() {
  const replace = vi.fn();
  vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, replace } as Location);
  return replace;
}

describe("replace (keksdose F1)", () => {
  it("is handed to the router link as `replace` — and only when asked", () => {
    withRouter(
      <>
        <Button href="/done" replace>
          B replace
        </Button>
        <Button href="/next">B push</Button>
        <TextLink href="/done" replace>
          TL replace
        </TextLink>
        <TextLink href="/next">TL push</TextLink>
        <IconButton href="/done" replace label="IB replace">
          <Pencil />
        </IconButton>
      </>,
    );
    expect(screen.getByRole("link", { name: "B replace" })).toHaveAttribute("data-replace", "true");
    expect(screen.getByRole("link", { name: "TL replace" })).toHaveAttribute("data-replace", "true");
    expect(screen.getByRole("link", { name: "IB replace" })).toHaveAttribute("data-replace", "true");
    // A provider link that spreads onto a DOM <a> must not get `replace={undefined}`
    // (or `false`) from a link that never asked.
    expect(screen.getByRole("link", { name: "B push" })).toHaveAttribute("data-replace", "absent");
    expect(screen.getByRole("link", { name: "TL push" })).toHaveAttribute("data-replace", "absent");
  });

  it("never lands on a plain <a> as an attribute; a plain click becomes location.replace", () => {
    const replace = stubLocationReplace();
    render(
      <>
        <Button href="/done" replace>
          B
        </Button>
        <TextLink href="/done" replace>
          TL
        </TextLink>
        <IconButton href="/done" replace label="IB">
          <Pencil />
        </IconButton>
      </>,
    );
    for (const name of ["B", "TL", "IB"]) {
      const link = screen.getByRole("link", { name });
      expect(link).not.toHaveAttribute("replace");
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    expect(replace).toHaveBeenCalledTimes(3);
    expect(replace).toHaveBeenCalledWith("/done");
  });

  it("leaves a modified click, a caller's preventDefault and an external link to the browser", () => {
    const replace = stubLocationReplace();
    render(
      <>
        <TextLink href="/done" replace>
          Modified
        </TextLink>
        <TextLink href="/done" replace onClick={(e) => e.preventDefault()}>
          Handled
        </TextLink>
        <Button href="https://example.com" external replace>
          Out
        </Button>
      </>,
    );
    // After React's handlers (they sit on the root): stops jsdom "navigating" and
    // printing that it cannot.
    const settle = (e: Event) => e.preventDefault();
    document.addEventListener("click", settle);
    fireEvent.click(screen.getByRole("link", { name: "Modified" }), { ctrlKey: true });
    fireEvent.click(screen.getByRole("link", { name: "Handled" }));
    fireEvent.click(screen.getByRole("link", { name: /Out/ }));
    document.removeEventListener("click", settle);
    expect(replace).not.toHaveBeenCalled();
  });
});

describe("reloadDocument (keksdose F1)", () => {
  it("draws a plain <a> for an in-app href, over the provider link and renderLink", () => {
    const renderLink = vi.fn(({ children, ...p }: KitLinkProps) => (
      <a {...p} data-own="">
        {children}
      </a>
    ));
    withRouter(
      <>
        <Button href="/export" reloadDocument>
          B
        </Button>
        <Button href="/export" reloadDocument renderLink={renderLink}>
          B own
        </Button>
        <TextLink href="/logout" reloadDocument>
          TL
        </TextLink>
        <IconButton href="/export" reloadDocument label="IB">
          <Pencil />
        </IconButton>
      </>,
    );
    for (const name of ["B", "B own", "TL", "IB"]) {
      const link = screen.getByRole("link", { name });
      expect(link).not.toHaveAttribute("data-router");
      expect(link).not.toHaveAttribute("data-own");
      expect(link).toHaveAttribute("href");
    }
    expect(renderLink).not.toHaveBeenCalled();
  });
});

describe("IconButton href (keksdose F2, kastlan 45)", () => {
  it("routes an in-app href, keeps an external one plain, and says the new tab in its name", () => {
    withRouter(
      <>
        <IconButton href="/units/7/edit" label="Edit unit">
          <Pencil />
        </IconButton>
        <IconButton href="https://docs.example.com" label="Docs">
          <Pencil />
        </IconButton>
        <IconButton href="https://docs.example.com" external label="Help">
          <Pencil />
        </IconButton>
      </>,
    );
    const edit = screen.getByRole("link", { name: "Edit unit" });
    expect(edit).toHaveAttribute("data-router");
    expect(edit).toHaveAttribute("href", "/units/7/edit");
    expect(screen.getByRole("link", { name: "Docs" })).not.toHaveAttribute("data-router");
    const help = screen.getByRole("link", { name: "Help (opens in a new tab)" });
    expect(help).toHaveAttribute("target", "_blank");
    expect(help).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("keeps the button's look, label tooltip and toneColor", () => {
    render(
      <IconButton href="/x" label="Open" size="sm" tone="danger" quiet={false}>
        <Pencil />
      </IconButton>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link.tagName).toBe("A");
    expect(link.className).toContain("size-8");
    expect(link.className).toContain("text-[var(--danger)]");
    fireEvent.pointerEnter(link.parentElement!);
    fireEvent.focus(link);
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
  });

  it("disabled: an inert link with no href, out of the tab order", () => {
    const onClick = vi.fn();
    withRouter(
      <IconButton href="/x" disabled label="Open" onClick={onClick}>
        <Pencil />
      </IconButton>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    expect(link).not.toHaveAttribute("href");
    expect(link).not.toHaveAttribute("data-router");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link.className).toContain("pointer-events-none");
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stopPropagation keeps the click and Enter from a clickable row", () => {
    const row = vi.fn();
    render(
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- a stand-in for a clickable row
      <div onClick={row} onKeyDown={row}>
        <IconButton href="/x" stopPropagation label="Open" onClick={(e) => e.preventDefault()}>
          <Pencil />
        </IconButton>
      </div>,
    );
    const link = screen.getByRole("link", { name: "Open" });
    fireEvent.click(link);
    fireEvent.keyDown(link, { key: "Enter" });
    expect(row).not.toHaveBeenCalled();
  });

  it("forwards ref to the <a> on the link form and to the <button> otherwise", () => {
    const linkRef = { current: null as HTMLAnchorElement | null };
    const buttonRef = { current: null as HTMLButtonElement | null };
    render(
      <>
        <IconButton href="/x" ref={linkRef} aria-label="L">
          <Pencil />
        </IconButton>
        <IconButton ref={buttonRef} aria-label="B">
          <Pencil />
        </IconButton>
      </>,
    );
    expect(linkRef.current?.tagName).toBe("A");
    expect(buttonRef.current?.tagName).toBe("BUTTON");
  });
});

describe("TextLink tones (keksdose F3, kastlan 46)", () => {
  it("primary, secondary and warning paint their token and underline by default", () => {
    render(
      <>
        <TextLink href="/a" tone="primary">
          P
        </TextLink>
        <TextLink href="/a" tone="secondary">
          S
        </TextLink>
        <TextLink href="/a" tone="warning">
          W
        </TextLink>
        <TextLink href="/a" tone="warning" underline="hover">
          W hover
        </TextLink>
        <TextLink href="/a">Brand</TextLink>
      </>,
    );
    const cls = (name: string) => screen.getByRole("link", { name }).className.split(" ");
    expect(cls("P")).toContain("text-[var(--text-primary)]");
    expect(cls("S")).toContain("text-[var(--text-secondary)]");
    expect(cls("W")).toContain("text-[var(--warning)]");
    for (const name of ["P", "S", "W"]) expect(cls(name)).toContain("underline");
    expect(cls("W hover")).toContain("hover:underline");
    expect(cls("W hover")).not.toContain("underline");
    expect(cls("Brand")).not.toContain("underline");
  });
});

describe("IconButton toneColor light/dark pair (keksdose)", () => {
  it("sets one variable per theme and the class that picks by `.dark`", () => {
    render(
      <>
        <IconButton aria-label="Pair" toneColor={{ light: "#be123c", dark: "#fda4af" }}>
          <Pencil />
        </IconButton>
        <IconButton aria-label="Single" toneColor="var(--warning)">
          <Pencil />
        </IconButton>
        <IconButton href="/x" aria-label="Link pair" toneColor={{ light: "#111", dark: "#eee" }}>
          <Pencil />
        </IconButton>
      </>,
    );
    const pair = screen.getByRole("button", { name: "Pair" });
    expect(pair.style.getPropertyValue("--icon-button-tone-light")).toBe("#be123c");
    expect(pair.style.getPropertyValue("--icon-button-tone-dark")).toBe("#fda4af");
    // Not set inline: an inline `--icon-button-tone` would beat the `dark:` class.
    expect(pair.style.getPropertyValue("--icon-button-tone")).toBe("");
    expect(pair.className).toContain("[--icon-button-tone:var(--icon-button-tone-light)]");
    expect(pair.className).toContain("dark:[--icon-button-tone:var(--icon-button-tone-dark)]");
    // Implies tone="custom", as the single colour does.
    expect(pair.className).toContain("text-[var(--icon-button-tone,var(--text-primary))]");

    const single = screen.getByRole("button", { name: "Single" });
    expect(single.style.getPropertyValue("--icon-button-tone")).toBe("var(--warning)");
    expect(single.className).not.toContain("icon-button-tone-light");

    const link = screen.getByRole("link", { name: "Link pair" });
    expect(link.style.getPropertyValue("--icon-button-tone-dark")).toBe("#eee");
  });
});
