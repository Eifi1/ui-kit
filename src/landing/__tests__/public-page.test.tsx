import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PublicFooter } from "../landing-sections";
import { PublicPage } from "../public-page";

/**
 * PublicPage (0.51): the frame of a public page that is not the landing and not a legal
 * page — the app's header, a column, the public footer — and the one decision every
 * public page makes, whether search engines may find it.
 */

const canonical = () => document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
const robots = () => document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');

afterEach(() => {
  document.title = "";
});

describe("PublicPage", () => {
  it("draws the header, the heading, the description and the content in <main>, then the legal footer", () => {
    render(
      <PublicPage
        header={<header>Site header</header>}
        title="Prices near you"
        description="Shared by households."
        seo={null}
      >
        <p>Regional figures</p>
      </PublicPage>,
    );
    expect(screen.getByRole("banner")).toHaveTextContent("Site header");
    const main = screen.getByRole("main");
    expect(within(main).getByRole("heading", { level: 1, name: "Prices near you" })).toBeInTheDocument();
    expect(within(main).getByText("Shared by households.")).toBeInTheDocument();
    expect(within(main).getByText("Regional figures")).toBeInTheDocument();
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(within(footer).getAllByRole("link")).toHaveLength(3);
  });

  it("takes the app's own footer, or none", () => {
    const { unmount } = render(
      <PublicPage title="T" seo={null} footer={<PublicFooter tagline="Household budgeting." />}>
        x
      </PublicPage>,
    );
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Household budgeting.");
    unmount();
    render(
      <PublicPage title="T" seo={null} footer={null}>
        x
      </PublicPage>,
    );
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("a page to be found declares its canonical, title and description, and takes them away on unmount", () => {
    const meta = document.createElement("meta");
    meta.name = "description";
    meta.content = "The app.";
    document.head.appendChild(meta);
    const { unmount } = render(
      <PublicPage
        title="Prices"
        seo={{ canonicalPath: "/prices", title: "Prices — Keksdose", description: "What households pay." }}
      >
        x
      </PublicPage>,
    );
    expect(canonical()?.href).toBe(`${window.location.origin}/prices`);
    expect(document.title).toBe("Prices — Keksdose");
    expect(meta.content).toBe("What households pay.");
    expect(robots()).toBeNull();
    unmount();
    expect(canonical()).toBeNull();
    expect(meta.content).toBe("The app.");
    meta.remove();
  });

  it('"noindex" keeps it out of search results and declares no canonical', () => {
    const { unmount } = render(
      <PublicPage title="Not found" seo="noindex">
        x
      </PublicPage>,
    );
    expect(robots()?.content).toBe("noindex");
    expect(canonical()).toBeNull();
    unmount();
    expect(robots()).toBeNull();
  });

  it("null declares nothing (a preview inside another page)", () => {
    render(
      <PublicPage title="Preview" seo={null} headingAs="h2" landmark={false}>
        x
      </PublicPage>,
    );
    expect(robots()).toBeNull();
    expect(canonical()).toBeNull();
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Preview" })).toBeInTheDocument();
  });

  it("is the landing's width by default and the legal pages' reading column as prose", () => {
    const { container, rerender } = render(
      <PublicPage title="T" seo={null}>
        x
      </PublicPage>,
    );
    const column = () => container.querySelector("[data-slot=public-page-column]")!;
    expect(column()).toHaveClass("max-w-6xl");
    rerender(
      <PublicPage title="T" seo={null} width="prose">
        x
      </PublicPage>,
    );
    expect(column()).toHaveClass("max-w-3xl");
  });

  it("puts the back link above the title and the actions beside it", () => {
    render(
      <PublicPage title="Prices" seo={null} back={<a href="/">Back</a>} actions={<button type="button">Region</button>}>
        x
      </PublicPage>,
    );
    const heading = screen.getByRole("heading", { name: "Prices" });
    const back = screen.getByRole("link", { name: "Back" });
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("button", { name: "Region" }).closest("[data-slot=public-page-actions]")).not.toBeNull();
  });
});
