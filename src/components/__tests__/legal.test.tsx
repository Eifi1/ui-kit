import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { LegalLayout, LegalLinks, LegalSection } from "../legal";

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

  it("names its nav from UiKitProvider", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <LegalLinks links={LINKS} />
      </UiKitProvider>,
    );
    expect(screen.getByRole("navigation", { name: "Rechtliches" })).toBeInTheDocument();
  });
});
