// The link renderers below take `children` from their spread props.
/* eslint-disable jsx-a11y/anchor-has-content */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "../top-bar";
import { TopBarBrand } from "../top-bar-brand";
import { TopBarNav, type TopBarNavItem } from "../top-bar-nav";
import { LanguageMenu, ThemeToggle } from "../topbar-controls";
import { Modal } from "../../components/modal";
import type { NavPillLinkProps } from "../../components/nav-pills";
import { UiKitProvider } from "../../i18n/kit-labels";
import { germanLabels } from "../../i18n/german";
import { stubResizeObserver, stubViewportWidth, type ResizeObserverStub } from "../../test/viewport";

/**
 * TopBarNav (0.66, Staunlabor's public site): the page links right after the brand, the open
 * page marked, and ALL of them folded into one menu when they do not fit — below `md`, or
 * when the row is measured wider than the room the bar leaves it.
 */

const ITEMS: TopBarNavItem[] = [
  { href: "/", label: "Home" },
  { href: "/experiments", label: "Experiments" },
  { href: "/experiments/archive", label: "Archive" },
  { href: "/about", label: "About" },
];

const nav = () => screen.getByRole("navigation", { name: "Pages" });
const menuButton = () => screen.queryByRole("button", { name: "Menu" });

let ro: ResizeObserverStub | undefined;
let restoreViewport: (() => void) | undefined;
afterEach(() => {
  ro?.restore();
  ro = undefined;
  restoreViewport?.();
  restoreViewport = undefined;
});

/** The bar gives the nav `room` px; the links need `need`. */
function measure(room: number, need: number) {
  const el = nav();
  const row = el.querySelector("[data-top-bar-nav-measure]")!;
  act(() => {
    ro!.resize(el, { width: room, height: 48 });
    ro!.resize(row, { width: need, height: 20 });
  });
}

describe("TopBarNav — which page is open", () => {
  it("marks the link whose href starts the path, the longest when several do", () => {
    render(
      <MemoryRouter initialEntries={["/experiments/archive/2026"]}>
        <TopBarNav items={ITEMS} />
      </MemoryRouter>,
    );
    const links = within(nav()).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Home", "Experiments", "Archive", "About"]);
    expect(screen.getByRole("link", { name: "Archive" })).toHaveAttribute("aria-current", "page");
    for (const name of ["Home", "Experiments", "About"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute("aria-current");
    }
  });

  it("marks a prefix only at a segment boundary, and `/` only on `/`", () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={["/experimentsX"]}>
        <TopBarNav items={ITEMS} />
      </MemoryRouter>,
    );
    expect(within(nav()).queryByRole("link", { current: "page" })).toBeNull();
    unmount();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TopBarNav items={ITEMS} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });

  it("takes the caller's isActive over the prefix rule", () => {
    render(
      <MemoryRouter initialEntries={["/experiments"]}>
        <TopBarNav items={ITEMS} isActive={(href) => href === "/about"} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Experiments" })).not.toHaveAttribute("aria-current");
  });

  it("reads `currentPath` where there is no router", () => {
    render(<TopBarNav items={ITEMS} currentPath="/about/team" />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });

  it("looks like words: the open page in the brand colour, underlined; no pills, no icons", () => {
    const Icon = () => <svg data-testid="icon" />;
    render(<TopBarNav items={[...ITEMS, { href: "/x", label: "X", icon: Icon }]} currentPath="/about" />);
    const about = screen.getByRole("link", { name: "About" });
    expect(about).toHaveClass("text-brand", "underline", "decoration-2");
    expect(screen.getByRole("link", { name: "Home" })).toHaveClass("text-primary");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveClass("underline", "border");
    expect(screen.queryByTestId("icon")).toBeNull();
  });
});

describe("TopBarNav — renderLink", () => {
  it("hands the router NavPills' link props, in the row and in the menu", () => {
    const seen: NavPillLinkProps[] = [];
    const renderLink = (props: NavPillLinkProps) => {
      seen.push(props);
      return <a {...props} href={`#${props.href}`} data-router="" />;
    };
    const onNavigate = vi.fn();
    ro = stubResizeObserver();
    render(<TopBarNav items={ITEMS} currentPath="/about" renderLink={renderLink} onNavigate={onNavigate} />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "#/about");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
    expect(Object.keys(seen[0]!).sort()).toEqual(["aria-current", "children", "className", "href", "onClick"]);
    fireEvent.click(screen.getByRole("link", { name: "Experiments" }));
    expect(onNavigate).toHaveBeenCalledWith("/experiments");

    // Folded, the menu's rows go through the same renderLink.
    measure(100, 400);
    fireEvent.click(menuButton()!);
    const row = screen.getByRole("menuitem", { name: /About/ });
    expect(row).toHaveAttribute("href", "#/about");
    expect(row).toHaveAttribute("data-router");
    expect(row).toHaveAttribute("aria-current", "page");
  });
});

describe("TopBarNav — folding", () => {
  it("moves ALL the links into the menu when the row is measured wider than its room, and back", () => {
    ro = stubResizeObserver();
    render(<TopBarNav items={ITEMS} currentPath="/about" />);
    measure(600, 320);
    expect(within(nav()).getAllByRole("link")).toHaveLength(4);
    expect(menuButton()).toBeNull();

    // A fourth link, a long Hungarian label: the row no longer fits beside the actions.
    measure(300, 320);
    expect(within(nav()).queryAllByRole("link")).toHaveLength(0);
    expect(menuButton()).toBeInTheDocument();
    expect(nav()).toHaveAttribute("data-folded");

    measure(400, 320);
    expect(within(nav()).getAllByRole("link")).toHaveLength(4);
    expect(menuButton()).toBeNull();
  });

  it("measures a copy of the row nobody sees or reaches", () => {
    render(<TopBarNav items={ITEMS} currentPath="/" />);
    const row = nav().querySelector("[data-top-bar-nav-measure]")!;
    expect(row.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(row.parentElement).toHaveClass("invisible", "h-0", "overflow-hidden");
    expect(row.querySelectorAll("a,button")).toHaveLength(0);
  });

  it("is folded below md whatever the measure says", () => {
    restoreViewport = stubViewportWidth(700);
    ro = stubResizeObserver();
    render(<TopBarNav items={ITEMS.slice(0, 2)} currentPath="/" />);
    measure(600, 120);
    expect(within(nav()).queryAllByRole("link")).toHaveLength(0);
    expect(menuButton()).toBeInTheDocument();
  });

  it("at 360 px: brand mark, the menu, the language and the theme, and nothing else in the bar", () => {
    restoreViewport = stubViewportWidth(360);
    render(
      <MemoryRouter initialEntries={["/experiments"]}>
        <TopBar
          brand={<TopBarBrand logo={<svg />} name="Staunlabor" />}
          nav={<TopBarNav items={ITEMS} />}
          actions={
            <>
              <LanguageMenu
                options={[
                  { code: "de", label: "Deutsch", country: "de" },
                  { code: "en", label: "English", country: "gb" },
                ]}
                current="de"
                onChange={() => {}}
              />
              <ThemeToggle mode="light" onChange={() => {}} />
            </>
          }
        />
      </MemoryRouter>,
    );
    const bar = screen.getByRole("banner");
    // The brand's name is visually hidden below sm: the mark is the whole visible link.
    expect(within(bar).getByText("Staunlabor")).toHaveClass("sr-only");
    // One link (the brand) and three buttons: the menu, the language, the theme.
    expect(within(bar).getAllByRole("link")).toHaveLength(1);
    expect(
      within(bar)
        .getAllByRole("button")
        .map((b) => b.getAttribute("aria-label") ?? b.textContent),
    ).toEqual(["Menu", expect.stringMatching(/language/i), expect.any(String)]);
    // The slot sits between the brand and the actions and takes the room they leave.
    const slots = Array.from(bar.children);
    expect(slots).toHaveLength(3);
    expect(slots[1]).toContainElement(nav());
    expect(slots[1]).toHaveClass("flex-1", "min-w-0");
  });
});

describe("TopBarNav — the menu", () => {
  function renderFolded(ui = <TopBarNav items={ITEMS} currentPath="/experiments/7" />) {
    restoreViewport = stubViewportWidth(360);
    return render(ui);
  }

  function keyboardOpen() {
    const button = menuButton()!;
    act(() => button.focus());
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.click(button);
  }

  it("is a dropdown under the button with every link, the open page current and ticked", () => {
    renderFolded();
    keyboardOpen();
    const menu = screen.getByRole("menu", { name: "Menu" });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((i) => i.textContent),
    ).toEqual(["Home", "Experiments", "Archive", "About"]);
    expect(within(menu).getByRole("menuitem", { name: "Experiments" })).toHaveAttribute("aria-current", "page");
    // A dropdown hanging from the button, not a sheet over the page.
    expect(menu.parentElement).toHaveClass("absolute", "top-full", "start-0");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("moves with the arrow keys, and Escape closes it with the focus back on the button", () => {
    renderFolded();
    keyboardOpen();
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Home" }));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    expect(document.activeElement).toBe(screen.getByRole("menuitem", { name: "Experiments" }));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(menuButton());
  });

  it("inside a dialog, Escape closes the menu and not the dialog (the Escape stack)", () => {
    const onClose = vi.fn();
    renderFolded(
      <Modal onClose={onClose} aria-label="Preview">
        <TopBarNav items={ITEMS} currentPath="/" />
      </Modal>,
    );
    keyboardOpen();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(menuButton());
  });

  it("a chosen link closes the menu", () => {
    const onNavigate = vi.fn();
    renderFolded(<TopBarNav items={ITEMS} currentPath="/" onNavigate={onNavigate} />);
    keyboardOpen();
    fireEvent.click(screen.getByRole("menuitem", { name: "About" }));
    expect(onNavigate).toHaveBeenCalledWith("/about");
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("TopBarNav — words", () => {
  it("names the landmark and the menu in the provider's language", () => {
    restoreViewport = stubViewportWidth(360);
    render(
      <UiKitProvider labels={germanLabels("de-DE")}>
        <TopBarNav items={ITEMS} currentPath="/" />
      </UiKitProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Seiten" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menü" })).toBeInTheDocument();
  });

  it("takes an aria-label of the caller's for the landmark", () => {
    render(<TopBarNav items={ITEMS} currentPath="/" aria-label="Site" />);
    expect(screen.getByRole("navigation", { name: "Site" })).toBeInTheDocument();
  });
});
