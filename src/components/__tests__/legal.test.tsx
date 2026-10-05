import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { DEFAULT_LEGAL_LABELS, LegalFooter, LegalLayout, LegalLinks, LegalSection } from "../legal";

/**
 * The legal pages' shell (H10): keksdose's and kastlan's two copies, once. What has to
 * hold: one h1, a notice that is a note and not an alert, sections that keep the
 * translation's line breaks, and links that mark the page you are on.
 */

const LINKS = [
  { href: "/impressum", label: "Imprint" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
];

describe("LegalLayout", () => {
  it("renders the back link, one h1, the notice as a note, the sections and the links", () => {
    render(
      <LegalLayout
        title="Privacy Policy"
        back={<a href="/">Back</a>}
        notice="Closed beta — not yet reviewed by a lawyer."
        links={LINKS}
        currentHref="/privacy"
      >
        <LegalSection heading="Controller" body={"Keksdose\nExample Street 1"} />
        <LegalSection heading="Data">Some data.</LegalSection>
      </LegalLayout>,
    );
    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy Policy");
    expect(screen.getByRole("note")).toHaveTextContent("not yet reviewed by a lawyer");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Controller", "Data"]);
    const nav = screen.getByRole("navigation", { name: "Legal" });
    expect(within(nav).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Imprint" })).not.toHaveAttribute("aria-current");
  });

  it("leaves out what is not given: no notice, no links", () => {
    render(
      <LegalLayout title="Terms">
        <LegalSection heading="Scope" body="…" />
      </LegalLayout>,
    );
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});

describe("LegalSection", () => {
  it("keeps the translation's line breaks and takes an id for links to it", () => {
    const { container } = render(<LegalSection id="retention" heading="Retention" body={"Line one\nLine two"} />);
    expect(container.querySelector("section")).toHaveAttribute("id", "retention");
    expect(screen.getByText(/Line one/).className).toContain("whitespace-pre-line");
  });

  it("outside a LegalPage: no number, no id from its key, and a {ref:…} left as written", () => {
    const { container } = render(<LegalSection key="data" heading="Data" body="See section {ref:retention}." />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/^Data$/);
    expect(container.querySelector("section")).not.toHaveAttribute("id");
    expect(screen.getByText("See section {ref:retention}.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("LegalLinks", () => {
  it("renders bare links for AuthLayout's own footer nav", () => {
    render(<LegalLinks links={LINKS} currentHref="/terms" nav={false} />);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps its spaced row and className without the nav (0.27.1, Kurvenschmiede's menu)", () => {
    const { container } = render(
      <ul>
        <li>
          <LegalLinks links={LINKS} nav={false} className="justify-center" />
        </li>
      </ul>,
    );
    const row = container.querySelector("li > div");
    expect(row).not.toBeNull();
    expect(row!.className).toMatch(/flex/);
    expect(row!.className).toMatch(/gap-x-4/);
    expect(row!.className).toContain("justify-center");
    expect(row!.querySelectorAll("a")).toHaveLength(LINKS.length);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("defaults to the three routes with the kit's short labels, in the contract's order (0.28)", () => {
    render(<LegalLinks currentHref="/privacy" />);
    const nav = screen.getByRole("navigation", { name: "Legal" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Imprint", "/impressum"],
      ["Privacy Policy", "/privacy"],
      ["Terms", "/terms"],
    ]);
    expect(within(nav).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("aria-current", "page");
  });

  it("separates the links with aria-hidden dots, with and without the nav (§3.3)", () => {
    const { unmount } = render(<LegalLinks links={LINKS} />);
    const dots = (root: Element) => [...root.querySelectorAll("span")].filter((s) => s.textContent === "·");
    const nav = screen.getByRole("navigation");
    expect(dots(nav)).toHaveLength(LINKS.length - 1);
    for (const dot of dots(nav)) expect(dot).toHaveAttribute("aria-hidden", "true");
    // Between the links, never before the first or after the last.
    expect([...nav.children].map((c) => c.tagName)).toEqual(["A", "SPAN", "A", "SPAN", "A"]);
    unmount();
    const { container } = render(<LegalLinks nav={false} />);
    expect(dots(container)).toHaveLength(2);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("names its nav from UiKitProvider", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <LegalLinks links={LINKS} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Rechtliches" })).toBeInTheDocument();
  });
});

describe("LegalFooter", () => {
  it("is keksdose's SiteFooter: a centred nav of the three links, the tagline under it", () => {
    render(<LegalFooter currentHref="/terms">Self-hosted household budgeting.</LegalFooter>);
    const footer = screen.getByRole("contentinfo");
    const nav = within(footer).getByRole("navigation", { name: DEFAULT_LEGAL_LABELS.navLabel });
    expect(nav.className).toContain("justify-center");
    expect(within(nav).getAllByRole("link")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "Terms" })).toHaveAttribute("aria-current", "page");
    expect(footer).toHaveTextContent("Self-hosted household budgeting.");
    // The tagline is under the links, not in the nav.
    expect(nav).not.toHaveTextContent("Self-hosted");
  });

  it("speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <LegalFooter />
      </UiKitProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Rechtliches" })).toBeInTheDocument();
  });
});
