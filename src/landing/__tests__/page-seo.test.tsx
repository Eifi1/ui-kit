import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { metaContent, seoCopyProblems, usePageSeo } from "../page-seo";

function Seo(props: Parameters<typeof usePageSeo>[0]) {
  usePageSeo(props);
  return null;
}

describe("usePageSeo — §4.3", () => {
  let description: HTMLMetaElement;
  beforeEach(() => {
    document.title = "Ada's Garden Planner";
    description = document.createElement("meta");
    description.name = "description";
    description.content = "The static description";
    document.head.appendChild(description);
  });
  afterEach(() => description.remove());

  const canonicals = () => document.head.querySelectorAll('link[rel="canonical"]');
  const ldBlocks = () => document.head.querySelectorAll('script[type="application/ld+json"]');

  it("sets the canonical, title, description and JSON-LD while mounted, and restores all on unmount", () => {
    const { unmount } = render(
      <Seo
        canonicalPath="/"
        title="Ada's Garden Planner — plan every bed"
        description="Sow, water and harvest on time."
        jsonLd={{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Ada's Garden Planner" }}
      />,
    );
    expect(canonicals()).toHaveLength(1);
    expect((canonicals()[0] as HTMLLinkElement).href).toBe(new URL("/", window.location.origin).toString());
    expect(document.title).toBe("Ada's Garden Planner — plan every bed");
    expect(description.content).toBe("Sow, water and harvest on time.");
    // Upserted, never a second description tag.
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(JSON.parse(ldBlocks()[0]!.textContent!)).toMatchObject({ "@type": "SoftwareApplication" });

    unmount();
    expect(canonicals()).toHaveLength(0);
    expect(ldBlocks()).toHaveLength(0);
    expect(document.title).toBe("Ada's Garden Planner");
    expect(description.content).toBe("The static description");
  });

  it("canonicalises /welcome to / and leaves the title alone without one", () => {
    const { unmount } = render(<Seo canonicalPath="/" />);
    expect((canonicals()[0] as HTMLLinkElement).href).toMatch(/\/$/);
    expect(document.title).toBe("Ada's Garden Planner");
    expect(description.content).toBe("The static description");
    unmount();
  });

  it("does not re-run for a new jsonLd object with the same title and description", () => {
    const props = { canonicalPath: "/", title: "T — x", description: "D" };
    const { rerender, unmount } = render(<Seo {...props} jsonLd={{ a: 1 }} />);
    const first = ldBlocks()[0];
    rerender(<Seo {...props} jsonLd={{ a: 1 }} />);
    expect(ldBlocks()[0]).toBe(first);
    unmount();
  });
});

describe("seoCopyProblems", () => {
  const brand = "Ada's Garden Planner";

  it("passes copy that fits and says something new", () => {
    expect(
      seoCopyProblems({
        title: "Ada's Garden Planner — plan every bed",
        description: "Sow, water and harvest on time, with a plan for each bed and reminders that follow the weather.",
        brand,
      }),
    ).toEqual([]);
  });

  it("flags a title over 60 and a description over 155 characters", () => {
    const codes = seoCopyProblems({
      title: `${brand} — ${"x".repeat(40)}`,
      description: "y".repeat(156),
      brand,
    }).map((p) => p.code);
    expect(codes).toEqual(["title-too-long", "description-too-long"]);
  });

  it("counts characters, not UTF-16 units, and takes other limits", () => {
    expect(seoCopyProblems({ title: `${brand} — 🌱🌱🌱`, description: "🌿".repeat(10), brand }, { maxDescription: 10 })).toEqual(
      [],
    );
    expect(seoCopyProblems({ title: `${brand} — beds`, description: "z".repeat(11), brand }, { maxDescription: 10 })[0]!.code).toBe(
      "description-too-long",
    );
  });

  it("flags a description that opens with the title's tagline", () => {
    const problems = seoCopyProblems({
      title: "Ada's Garden Planner – Plan every bed",
      description: "Plan every bed in your garden and never miss a sowing date.",
      brand,
    });
    expect(problems.map((p) => p.code)).toEqual(["description-repeats-title"]);
    expect(problems[0]!.message).toContain("Plan every bed");
  });

  it("reads the brand at the end too, and flags a title without it", () => {
    expect(seoCopyProblems({ title: "Plan every bed | Ada's Garden Planner", description: "Sow on time.", brand })).toEqual([]);
    expect(seoCopyProblems({ title: "Plan every bed", description: "Sow on time.", brand }).map((p) => p.code)).toEqual([
      "title-without-brand",
    ]);
  });

  it("flags empty copy", () => {
    expect(seoCopyProblems({ title: " ", description: "", brand }).map((p) => p.code)).toEqual([
      "title-empty",
      "description-empty",
    ]);
  });
});

describe("metaContent — the index.html parity", () => {
  const html = `<!doctype html><html><head>
    <meta charset="utf-8">
    <meta
      name="description"
      content="Sow, water &amp; harvest
               on time."
    />
    <meta property='og:title' content='Ada&#39;s Garden Planner — plan every bed'>
    <meta content="Sow on time." property="og:description">
  </head></html>`;

  it("finds a tag by its attributes, in any order and quoting, entities decoded and whitespace collapsed", () => {
    expect(metaContent(html, 'meta[name="description"]')).toBe("Sow, water & harvest on time.");
    expect(metaContent(html, '[property="og:title"]')).toBe("Ada's Garden Planner — plan every bed");
    expect(metaContent(html, 'property="og:description"')).toBe("Sow on time.");
  });

  it("takes keksdose's RegExp form, and answers undefined for a missing tag", () => {
    expect(metaContent(html, /property=.og:description./)).toBe("Sow on time.");
    expect(metaContent(html, 'meta[name="robots"]')).toBeUndefined();
  });

  it("refuses a selector that names no attribute", () => {
    expect(() => metaContent(html, "meta")).toThrow(/names no attribute/);
  });
});
