import { screen } from "@testing-library/react";
import { PAGES } from "../routes";
import { slugify } from "../lib/section";
import { PAGE_EXAMPLE_LABELS } from "../search/examples.generated";
import { MOUNT_TIMEOUT_MS, renderShowcase, useShowcaseEnvironment } from "./showcase-harness";

/** How many files the per-page check is spread over (pages-shard-1…4.test.tsx). */
export const PAGE_SHARDS = 4;

/** The pages of shard `index` (0-based): every PAGE_SHARDS-th page, interleaved, so the
 *  large pages of one group do not all land in the same file. */
export function pagesOfShard(index: number) {
  return PAGES.filter((_, i) => i % PAGE_SHARDS === index);
}

/**
 * One check per showcase page, mounting it ONCE — it used to be mounted twice, by
 * showcase.test.tsx's "every page mounts" and search.test.tsx's "example anchors":
 *
 * - it renders its title, and no section threw on mount (SectionBoundary sets
 *   `data-section-error` only after catching; not role="alert", because components
 *   legitimately render alerts of their own);
 * - the static extraction checked against the DOM: the anchors the search index links
 *   to are exactly the `<h3 id>` headings the page renders — no example the page shows
 *   is missing from the search, and no result points at a heading that is not there.
 */
export function describePageShard(index: number): void {
  useShowcaseEnvironment();

  describe(`every page, shard ${index + 1} of ${PAGE_SHARDS}`, () => {
    it.each(pagesOfShard(index).map((p) => [p.slug, p.title] as const))(
      "/%s mounts, and its examples match the search index",
      (slug, title) => {
        renderShowcase(`/${slug}`);
        expect(screen.getByRole("heading", { name: title, level: 1 })).toBeInTheDocument();
        const crashed = [...document.querySelectorAll("[data-section-error]")].map((el) =>
          el.getAttribute("data-section-error"),
        );
        expect(crashed, `section threw on mount: ${crashed.join(", ")}`).toEqual([]);

        const rendered = new Set([...document.querySelectorAll("main h3[id]")].map((h) => h.id));
        const indexed = new Set((PAGE_EXAMPLE_LABELS[slug] ?? []).map(slugify));
        for (const id of indexed) expect(rendered, `#${id} is indexed but not on /${slug}`).toContain(id);
        for (const id of rendered) expect(indexed, `#${id} is on /${slug} but not indexed`).toContain(id);
      },
      MOUNT_TIMEOUT_MS,
    );
  });
}
