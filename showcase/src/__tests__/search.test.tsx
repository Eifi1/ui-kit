import { execFileSync } from "node:child_process";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { TourProvider, createSearchIndex } from "@eifi1/ui-kit";
import { Showcase } from "../showcase";
import { GROUPS, PAGES } from "../routes";
import { LOCALES, LocaleProvider, de, en } from "../i18n";
import { slugify } from "../lib/section";
import { PAGE_EXAMPLE_LABELS } from "../search/examples.generated";
import { SEARCH_SUGGESTIONS, buildSearchEntries } from "../search/showcase-search";

/**
 * The top-bar search. Its index is derived — routes.tsx, the dictionaries, and the
 * example labels extracted from the section sources — so these tests are what keep the
 * derivation honest: every page is in it, every example anchor exists on its page, every
 * dictionary has needs for every page, and a few queries a reader would really type land
 * where they should.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
const PROTO = Element.prototype as unknown as { scrollIntoView?: () => void };
const JSDOM_HAS_IT = "scrollIntoView" in Element.prototype;
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  if (!JSDOM_HAS_IT) PROTO.scrollIntoView = () => {};
});
afterAll(() => {
  vi.unstubAllGlobals();
  if (!JSDOM_HAS_IT) delete PROTO.scrollIntoView;
});
afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
});

const MOUNT_TIMEOUT_MS = 60_000;
/** Vitest runs from the repository root (vitest.config.ts lives there). */
const ROOT = process.cwd();

const search = (dict: typeof en, query: string) => createSearchIndex(buildSearchEntries(dict)).search(query);

describe("search index", () => {
  it("is generated from the current sources", () => {
    // Throws (exit 1) with the command to run when examples.generated.ts is stale.
    execFileSync("node", ["scripts/gen-showcase-search-index.mjs", "--check"], { cwd: ROOT, stdio: "pipe" });
  });

  it("covers every page, in every language", () => {
    for (const dict of LOCALES) {
      const ids = new Set(buildSearchEntries(dict).map((e) => e.id));
      for (const page of PAGES) {
        expect(ids.has(`page:${page.slug}`), `${dict.tag} page ${page.slug}`).toBe(true);
        for (const name of page.components ?? []) {
          expect(ids.has(`component:${page.slug}:${name}`), `${dict.tag} ${name}`).toBe(true);
        }
        expect(
          [...ids].some((id) => id.startsWith(`need:${page.slug}:`)),
          `${dict.tag} needs for ${page.slug}`,
        ).toBe(true);
      }
    }
  });

  it("gives no two entries the same id", () => {
    const ids = buildSearchEntries(en).map((e) => e.id);
    expect(ids.length - new Set(ids).size).toBe(0);
  });

  it("indexes examples only for pages that exist", () => {
    const slugs = new Set(PAGES.map((p) => p.slug));
    for (const slug of Object.keys(PAGE_EXAMPLE_LABELS)) expect(slugs, slug).toContain(slug);
  });

  it("suggests needs that exist in every language", () => {
    for (const dict of LOCALES) {
      const ids = new Set(buildSearchEntries(dict).map((e) => e.id));
      for (const s of SEARCH_SUGGESTIONS) expect(ids.has(s as string), `${dict.tag} ${String(s)}`).toBe(true);
    }
  });
});

describe("needs in the dictionaries", () => {
  it("names the needs of every page in every language, 5 to 15 of them", () => {
    const slugs = PAGES.map((p) => p.slug).sort();
    for (const dict of LOCALES) {
      // `needs` is keyed by the `PageSlug` union; this ties the union to routes.tsx.
      expect(Object.keys(dict.needs).sort(), dict.tag).toEqual(slugs);
      for (const slug of slugs) {
        const needs = dict.needs[slug as keyof typeof dict.needs];
        expect(needs.length, `${dict.tag} ${slug}`).toBeGreaterThanOrEqual(5);
        expect(needs.length, `${dict.tag} ${slug}`).toBeLessThanOrEqual(15);
        for (const need of needs) expect(need.trim(), `${dict.tag} ${slug}`).not.toBe("");
      }
    }
  });

  it("keeps each page's needs in step with English, so a suggestion means the same task", () => {
    for (const dict of LOCALES) {
      for (const slug of Object.keys(en.needs) as Array<keyof typeof en.needs>) {
        expect(dict.needs[slug].length, `${dict.tag} ${slug}`).toBe(en.needs[slug].length);
      }
    }
  });
});

describe("queries a reader types", () => {
  const first = (dict: typeof en, query: string, group?: string) =>
    search(dict, query).find((h) => !group || h.entry.group === group)?.entry;

  it('"ask before deleting" finds the confirm dialog page', () => {
    const hits = search(en, "ask before deleting").map((h) => h.entry.href);
    expect(hits).toContain("/confirm-floating");
    expect(first(en, "ask before deleting")?.group).toBe(en.chrome.searchNeeds);
  });

  it('"datum bereich" finds the calendars page in German', () => {
    expect(search(de, "datum bereich").map((h) => h.entry.href)).toContain("/calendars");
  });

  it('the typo "tooltp" finds Tooltip first', () => {
    const hit = first(en, "tooltp");
    expect(hit?.title).toBe("Tooltip");
    expect(hit?.href).toBe("/popovers");
  });

  it("ranks the exact component name first", () => {
    expect(first(en, "DataTable")?.title).toBe("DataTable");
    expect(first(en, "date range picker")?.title).toBe("DateRangePicker");
  });

  it("finds an example by its label and links to its anchor", () => {
    const [slug, labels] = Object.entries(PAGE_EXAMPLE_LABELS).find(([, l]) => l.length > 2)!;
    const label = labels[2];
    const hit = search(en, label).find((h) => h.entry.group === en.chrome.searchExamples);
    expect(hit?.entry.href).toBe(`/${slug}#${slugify(label)}`);
  });
});

/**
 * The static extraction checked against the DOM: for every page, the anchors the index
 * links to are exactly the `<h3 id>` headings the page renders — no example the page
 * shows is missing from the search, and no search result points at a heading that is not
 * there.
 */
describe("example anchors", () => {
  function Mounted({ path }: { path: string }) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <LocaleProvider>
          <TourProvider>
            <Showcase />
          </TourProvider>
        </LocaleProvider>
      </MemoryRouter>
    );
  }

  it.each(PAGES.map((p) => [p.slug] as const))(
    "/%s: every indexed example is a heading on the page, and every heading is indexed",
    (slug) => {
      render(<Mounted path={`/${slug}`} />);
      const rendered = new Set([...document.querySelectorAll("main h3[id]")].map((h) => h.id));
      const indexed = new Set((PAGE_EXAMPLE_LABELS[slug] ?? []).map(slugify));
      for (const id of indexed) expect(rendered, `#${id} is indexed but not on /${slug}`).toContain(id);
      for (const id of rendered) expect(indexed, `#${id} is on /${slug} but not indexed`).toContain(id);
    },
    MOUNT_TIMEOUT_MS,
  );
});

describe("the top-bar search", () => {
  function Where() {
    const { pathname, hash } = useLocation();
    return <output data-testid="where">{pathname + hash}</output>;
  }

  it("opens on Ctrl K, suggests needs, and jumps to an example's anchor", async () => {
    render(
      <MemoryRouter initialEntries={["/overview"]}>
        <LocaleProvider>
          <TourProvider>
            <Showcase />
            <Where />
          </TourProvider>
        </LocaleProvider>
      </MemoryRouter>,
    );
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    });
    // The empty query shows the "Try" list.
    expect(await screen.findByRole("group", { name: "Try" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /ask before deleting/ })).toBeInTheDocument();

    const [slug, labels] = Object.entries(PAGE_EXAMPLE_LABELS).find(([s]) => s === "popovers")!;
    const label = labels[0];
    fireEvent.change(screen.getByRole("combobox"), { target: { value: label } });
    const anchor = `/${slug}#${slugify(label)}`;
    // The row is a real link, built by the router: `/popovers#popover` here, `#/popovers#popover` under the HashRouter.
    const option = await waitFor(() => {
      const found = screen.getAllByRole("option").find((o) => o.getAttribute("href") === anchor);
      if (!found) throw new Error(`no row links to ${anchor}`);
      return found;
    });
    fireEvent.click(option);
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(`/${slug}#${slugify(label)}`));
    expect(document.getElementById(slugify(label))).not.toBeNull();
  }, MOUNT_TIMEOUT_MS);

  it("covers every group of the sidebar", () => {
    const hrefs = new Set(buildSearchEntries(en).map((e) => e.href));
    for (const g of GROUPS) expect(hrefs.has(`/${g.pages.length > 1 ? g.slug : g.pages[0].slug}`), g.slug).toBe(true);
  });
});
