import { cleanup, screen } from "@testing-library/react";
import { PAGES } from "../routes";
import { slugify } from "../lib/section";
import { PAGE_EXAMPLE_LABELS } from "../search/examples.generated";
import { MOUNT_TIMEOUT_MS, renderShowcase, useShowcaseEnvironment } from "./showcase-harness";
import { axeFindings } from "./page-axe";

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
 *   is missing from the search, and no result points at a heading that is not there;
 * - axe's jsdom-safe rules over the page's `<main>` find nothing that is not on the
 *   known list (page-axe.ts; refactor audit 2026-10, DOC-10). The frame around it is the
 *   same on every page, so the first shard checks it once.
 */
export function describePageShard(index: number): void {
  // Only this shard's pages' sections: a quarter of the modules, a quarter of the heap.
  useShowcaseEnvironment({ pages: pagesOfShard(index).map((p) => p.slug) });

  describe(`every page, shard ${index + 1} of ${PAGE_SHARDS}`, () => {
    if (index === 0) {
      it(
        "the frame — sidebar, top bar, page header — passes axe",
        async () => {
          const [first] = pagesOfShard(index);
          renderShowcase(`/${first.slug}`);
          // The page's own content is the per-page check's; here only what surrounds it.
          expect(await axeFindings(document.body, first.slug, document.querySelector("main")!)).toEqual([]);
        },
        MOUNT_TIMEOUT_MS,
      );
    }

    it.each(pagesOfShard(index).map((p) => [p.slug, p.title] as const))(
      "/%s mounts, its examples match the search index, and axe finds nothing new",
      checkPage,
      MOUNT_TIMEOUT_MS,
    );
  });
}

/**
 * The per-page check, on a document that holds this page alone.
 *
 * The shard-4 flake (0.43–0.46, round 0.46 A1): under load `#every-fill-and-its-foreground`
 * from /colour-roles showed up on the NEXT page the shard mounted — "on /links but not
 * indexed" — beside "Hook timed out in 10000ms". Not a lazy section resolving late (the
 * shard preloads every section it renders; a page renders in one synchronous pass): the
 * previous page was never unmounted. RTL's `cleanup` is an `afterEach` (src/test/setup.ts)
 * with the 10 s hook timeout, and Vitest runs a file's `afterEach` hooks one after the other,
 * last registered first, skipping the rest once one fails. Unmounting the largest pages
 * under a loaded machine (a coverage run, a GC pause in a 600 MB worker) ran over 10 s, or
 * the harness's hook before it did — and the page stayed in `document.body` for the next
 * test's `main h3[id]` query.
 *
 * So the check does not lean on the hooks: it clears whatever an earlier test left mounted
 * before it renders, and unmounts its own page inside its own 60 s budget, so the hook
 * after it has nothing left to do.
 */
export async function checkPage(slug: string, title: string): Promise<void> {
  cleanup();
  expect(document.querySelector("main"), "an earlier page is still in the document").toBeNull();
  const { unmount } = renderShowcase(`/${slug}`);
  try {
    expect(screen.getByRole("heading", { name: title, level: 1 })).toBeInTheDocument();
    const crashed = [...document.querySelectorAll("[data-section-error]")].map((el) =>
      el.getAttribute("data-section-error"),
    );
    expect(crashed, `section threw on mount: ${crashed.join(", ")}`).toEqual([]);

    const rendered = new Set([...document.querySelectorAll("main h3[id]")].map((h) => h.id));
    const indexed = new Set((PAGE_EXAMPLE_LABELS[slug] ?? []).map(slugify));
    for (const id of indexed) expect(rendered, `#${id} is indexed but not on /${slug}`).toContain(id);
    for (const id of rendered) expect(indexed, `#${id} is on /${slug} but not indexed`).toContain(id);

    const findings = await axeFindings(document.querySelector("main")!, slug);
    expect(
      findings,
      `axe on /${slug}:\n${findings.map((f) => `  ${f.rule}  ${f.html}`).join("\n")}`,
    ).toEqual([]);
  } finally {
    unmount();
  }
}
