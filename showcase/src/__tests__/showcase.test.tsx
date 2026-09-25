import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEFAULT_UI_KIT_LABELS, TourProvider, missingKitLabels } from "@eifi1/ui-kit";
import { Showcase } from "../showcase";
import { GROUPS, NAV, PAGES, RETIRED_SLUGS, hasOverview } from "../routes";
import { LOCALES, LOCALE_STORAGE_KEY, LocaleProvider, de, en, es, fr, hu } from "../i18n";

/**
 * The showcase is the only place in this repository where the components are rendered
 * at all, which makes it the cheapest broad smoke test the package has: a component
 * that throws on mount fails here, and an export renamed out of the barrel fails `tsc`
 * before it gets this far.
 *
 * It also guards the three things that were wrong with the first version of this page,
 * each of which looked fine in a screenshot:
 *   - the sidebar pointed at routes that did not exist, so nothing ever changed;
 *   - every component lived on one 52,000px page;
 *   - Back did not return you to where you had been reading.
 */

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  // recharts' ResponsiveContainer measures 0x0 in jsdom and warns on every chart. That
  // is expected and would otherwise bury a real failure in noise.
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => vi.unstubAllGlobals());

/** Mounting every component in the kit is slow; vitest's 5s default fails this file
 *  and nothing else. Raised here rather than globally so other suites stay honest. */
const MOUNT_TIMEOUT_MS = 30_000;

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      {/* The real tree from main.tsx: the provider is ABOVE the shell, because it owns
          `<html dir>` and the whole frame is laid out from that. Without it `useT` falls
          back to English and the language menu would set nothing — which is precisely
          the bug these tests exist to keep fixed. */}
      <LocaleProvider>
        <TourProvider>
          <Showcase />
        </TourProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

/**
 * The locale is PERSISTED and `dir`/`lang` live on `<html>` — both outside React's tree
 * and outside `cleanup()`. A test that picks Hungarian would otherwise hand Hungarian,
 * and its `<html lang>`, to whichever test ran next, and every English assertion in
 * this file would fail somewhere far from the cause.
 */
afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
});

describe("every page mounts", () => {
  it.each(PAGES.map((p) => [p.slug, p.title] as const))(
    "/%s renders without throwing",
    (slug, title) => {
      renderAt(`/${slug}`);
      expect(screen.getByRole("heading", { name: title, level: 1 })).toBeInTheDocument();
      // SectionBoundary sets data-section-error only after catching. Not role="alert":
      // components legitimately render alerts of their own (the field-sync error state).
      const crashed = [...document.querySelectorAll("[data-section-error]")].map((el) =>
        el.getAttribute("data-section-error"),
      );
      expect(crashed, `section threw on mount: ${crashed.join(", ")}`).toEqual([]);
    },
    MOUNT_TIMEOUT_MS,
  );
});

describe("navigation", () => {
  it("every sidebar entry points at a page that exists", () => {
    // The original bug: NAV listed /tokens, /patterns, /docs — none of which were
    // routes — so clicking the sidebar changed the URL and nothing else.
    const slugs = new Set(PAGES.map((p) => p.slug));
    for (const item of NAV) {
      expect(slugs, `nav entry ${item.to} has no page`).toContain(item.to.replace(/^\//, ""));
      for (const sub of item.items ?? []) {
        expect(slugs, `sub-item ${sub.to} has no page`).toContain(sub.to.replace(/^\//, ""));
      }
    }
  });

  it("lists every page exactly once across the groups", () => {
    const fromGroups = GROUPS.flatMap((g) => g.pages.map((p) => p.slug));
    expect(new Set(fromGroups).size).toBe(fromGroups.length);
    // PAGES also holds the synthesised overview of every multi-page group, keyed by the
    // group's own slug; those are not listed in any group's `pages`.
    const overviews = new Set(GROUPS.filter(hasOverview).map((g) => g.slug));
    expect(fromGroups.sort()).toEqual(
      PAGES.map((p) => p.slug)
        .filter((slug) => !overviews.has(slug))
        .sort(),
    );
  });

  it("changes the rendered page when a nav link is followed", () => {
    renderAt("/tokens");
    expect(screen.getByRole("heading", { name: "Tokens", level: 1 })).toBeInTheDocument();

    const sidebar = document.querySelector("aside");
    // A group with several pages links to its OVERVIEW, whose slug is the group's own.
    const link = within(sidebar as HTMLElement).getAllByRole("link", { name: /^Inputs$/ })[0];
    fireEvent.click(link);

    expect(screen.queryByRole("heading", { name: "Tokens", level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Inputs", level: 1 })).toBeInTheDocument();
  }, MOUNT_TIMEOUT_MS);

  it("redirects / to the first page rather than rendering nothing", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { name: PAGES[0].title, level: 1 })).toBeInTheDocument();
  }, MOUNT_TIMEOUT_MS);

  it("shows a not-found page for an unknown slug instead of a blank screen", () => {
    renderAt("/no-such-component");
    expect(screen.getByText("No such page")).toBeInTheDocument();
  });

  /**
   * Pages get split when they outgrow a reader's scroll — Primitives held 29 specimens —
   * and the old slug lives on in links nobody here can edit. Each one must land on a
   * real page, never on "No such page", and must not point at a slug that is itself
   * still a page (that would be a split that was never finished).
   */
  it.each(Object.entries(RETIRED_SLUGS))(
    "redirects the retired /%s to /%s",
    (old, target) => {
      const slugs = new Set(PAGES.map((p) => p.slug));
      expect(slugs.has(old), `/${old} is retired but still a page`).toBe(false);
      expect(slugs.has(target), `/${old} redirects to /${target}, which is no page`).toBe(true);
      renderAt(`/${old}`);
      const page = PAGES.find((p) => p.slug === target)!;
      expect(screen.getByRole("heading", { name: page.title, level: 1 })).toBeInTheDocument();
      expect(screen.queryByText("No such page")).not.toBeInTheDocument();
    },
    MOUNT_TIMEOUT_MS,
  );

  it("keeps every group at or under ten pages, for the phone's row of page pills", () => {
    // Below `md` the pills WRAP, so each page past ten is another line over the content.
    for (const group of GROUPS) {
      expect(group.pages.length, group.label).toBeLessThanOrEqual(10);
    }
  });

  it("offers previous/next between adjacent pages", () => {
    const second = PAGES[1];
    renderAt(`/${second.slug}`);
    const pager = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(pager).getByText(PAGES[0].title)).toBeInTheDocument();
    expect(within(pager).getByText(PAGES[2].title)).toBeInTheDocument();
  }, MOUNT_TIMEOUT_MS);
});

describe("on-this-page contents", () => {
  it("links only to headings that exist on the page", async () => {
    renderAt("/buttons");
    // Built from the DOM after paint, so wait for it rather than asserting immediately.
    // Two copies: the rail (xl and up) and the disclosure under the title (below xl).
    // jsdom applies no CSS, so both are present here; in a browser one is display:none.
    // A generous wait: the Buttons page is one of the largest, and under the coverage
    // run of `npm run check` its contents rail took longer than findBy's 1s default.
    const navs = await screen.findAllByRole("navigation", { name: "On this page" }, { timeout: 15_000 });
    expect(navs).toHaveLength(2);
    const hrefs = navs
      .flatMap((nav) => within(nav).getAllByRole("link"))
      // The router builds the href (`#/buttons#id` under HashRouter, `/buttons#id`
      // in a MemoryRouter), so the heading id is whatever follows the LAST `#`.
      .map((a) => a.getAttribute("href")!.split("#").pop()!);
    expect(hrefs.length).toBeGreaterThan(1);
    for (const id of hrefs) {
      expect(document.getElementById(id), `#${id} has no heading`).not.toBeNull();
    }
  }, MOUNT_TIMEOUT_MS);
});

/**
 * The language menu used to set a `useState` and nothing else — the one control on the
 * page that lied. These are the tests that would have caught that: every one of them
 * fails against a menu whose `onChange` does not reach the chrome.
 */
describe("dictionaries", () => {
  // `kit` is typed as the full `UiKitLabels`, but a few keys in it are OPTIONAL (so a
  // consumer's annotated translation keeps compiling when the kit adds one) — and tsc is
  // silent about an optional key left out. This is the check that is not.
  it.each(LOCALES.map((d) => [d.name, d] as const))(
    "%s supplies every kit label",
    (_name, dict) => {
      expect(missingKitLabels(dict.kit, DEFAULT_UI_KIT_LABELS)).toEqual([]);
    },
  );

  it("names every page and every group in every language", () => {
    const slugs = Object.keys(en.pages).sort();
    const groups = Object.keys(en.groups).sort();
    const groupShort = Object.keys(en.groupShort).sort();
    for (const dict of LOCALES) {
      expect(Object.keys(dict.pages).sort(), dict.tag).toEqual(slugs);
      expect(Object.keys(dict.groups).sort(), dict.tag).toEqual(groups);
      expect(Object.keys(dict.groupShort).sort(), dict.tag).toEqual(groupShort);
    }
  });

  it("matches routes.tsx: every page in English, and a short title for every page", () => {
    // en.ts is a transcription of routes.tsx (see its header), so the two cannot differ.
    const overviews = new Set(GROUPS.filter(hasOverview).map((g) => g.slug));
    expect(Object.keys(en.pages).sort()).toEqual(PAGES.map((p) => p.slug).sort());
    for (const page of PAGES) {
      if (overviews.has(page.slug)) continue;
      expect(en.pages[page.slug], page.slug).toEqual({
        title: page.title,
        short: page.short,
        blurb: page.blurb,
      });
      // `short` is optional in the type only because overview pages have none.
      for (const dict of LOCALES) {
        expect(dict.pages[page.slug]?.short, `${dict.tag} ${page.slug}`).toBeTruthy();
      }
    }
    for (const group of GROUPS) {
      expect(en.groups[group.label], group.label).toBe(group.label);
      if (group.shortLabel) expect(en.groupShort[group.label], group.label).toBe(group.shortLabel);
    }
  });
});

describe("language menu", () => {
  /**
   * The trigger's own accessible name is TRANSLATED, so it cannot be looked up by a
   * fixed string once the language has changed. Every locale's word for "language" is a
   * valid name for the same button, so try them all and take the one that is mounted.
   */
  function languageTrigger(): HTMLElement {
    for (const dict of LOCALES) {
      const [found] = screen.queryAllByRole("button", { name: dict.chrome.language });
      if (found) return found;
    }
    throw new Error("no language trigger on the page");
  }

  /** The open panel, scoped to the menu rather than the document: "English" is a word
   *  that can appear in a section's prose, and this must not match it. */
  function openMenu(): HTMLElement {
    const trigger = languageTrigger();
    fireEvent.click(trigger);
    // 0.7.0: HoverMenu names its `role="menu"` panel, not a role-less wrapper.
    return screen.getByRole("menu");
  }

  function choose(endonym: string): void {
    fireEvent.click(within(openMenu()).getByRole("menuitem", { name: endonym }));
  }

  it("lists all seven locales, each named in its own language", () => {
    renderAt("/tokens");
    const menu = openMenu();

    // The endonym, not the English name: a reader looking for Hungarian is looking for
    // Magyar. Asserting on LOCALES rather than on a literal list is what makes this
    // fail when a dictionary is written but never registered.
    expect(LOCALES.map((d) => d.name)).toEqual([
      "English",
      "Deutsch",
      "Français",
      "Italiano",
      "Español",
      "Magyar",
      "中文",
    ]);
    for (const dict of LOCALES) {
      expect(
        within(menu).getByRole("menuitem", { name: dict.name }),
        `${dict.tag} is missing from the menu`,
      ).toBeInTheDocument();
    }
  }, MOUNT_TIMEOUT_MS);

  it("translates the chrome when a locale is chosen", () => {
    renderAt("/tokens");
    // Both the visible group name and the landmark's accessible name — the second is the
    // half that is only ever read aloud, and so the half that silently stays English.
    const before = screen.getByRole("navigation", { name: en.chrome.breadcrumb });
    expect(within(before).getByText(en.groups.Foundations)).toBeInTheDocument();

    choose(fr.name);

    const after = screen.getByRole("navigation", { name: fr.chrome.breadcrumb });
    expect(within(after).getByText(fr.groups.Foundations)).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: en.chrome.breadcrumb }),
      "the breadcrumb landmark kept its English accessible name",
    ).not.toBeInTheDocument();
  }, MOUNT_TIMEOUT_MS);

  it("translates the sidebar groups and the pager", () => {
    renderAt(`/${PAGES[1].slug}`);
    choose(fr.name);

    const sidebar = document.querySelector("aside") as HTMLElement;
    expect(within(sidebar).getAllByRole("link", { name: fr.groups.Foundations })[0]).toBeInTheDocument();

    const pager = screen.getByRole("navigation", { name: fr.chrome.pagination });
    expect(within(pager).getByText(fr.chrome.previous)).toBeInTheDocument();
    expect(within(pager).getByText(fr.chrome.next)).toBeInTheDocument();
  }, MOUNT_TIMEOUT_MS);

  it("sets <html lang> to the chosen locale's full tag, and back again", () => {
    renderAt("/tokens");
    expect(document.documentElement.dir).toBe("ltr");

    choose(hu.name);
    // `lang` is what a screen reader takes its voice from: a Hungarian page still
    // announced as English is only half switched. The FULL tag, region included.
    expect(document.documentElement.lang).toBe("hu-HU");
    expect(document.documentElement.dir).toBe("ltr");

    choose(en.name);
    expect(document.documentElement.lang).toBe(en.tag);
    expect(document.documentElement.dir).toBe("ltr");
  }, MOUNT_TIMEOUT_MS);

  it("hands the dictionary's kit labels to the kit's own components", () => {
    // The chrome above is the showcase's own text. This is the kit's: AppShell's
    // collapse button reads `appShell.collapse` from <UiKitProvider>, with no prop at
    // the call site — so it only changes language if the provider is wired.
    renderAt("/tokens");
    expect(
      screen.getByRole("button", { name: en.kit.appShell.collapse }),
    ).toBeInTheDocument();

    choose(de.name);

    expect(
      screen.getByRole("button", { name: de.kit.appShell.collapse }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: en.kit.appShell.collapse }),
      "the sidebar's collapse button stayed English",
    ).not.toBeInTheDocument();
  }, MOUNT_TIMEOUT_MS);

  it("keeps the choice across a remount", () => {
    const view = renderAt("/tokens");
    choose(es.name);
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("es");

    // A remount is a reload: the provider re-reads the stored preference in its lazy
    // initialiser, so the second mount must come up in Spanish without being told.
    view.unmount();
    renderAt("/tokens");

    const crumb = screen.getByRole("navigation", { name: es.chrome.breadcrumb });
    expect(within(crumb).getByText(es.groups.Foundations)).toBeInTheDocument();
  }, MOUNT_TIMEOUT_MS);

  it("falls back to English for a stored code that no longer resolves", () => {
    // The preference survives a release that removes a locale, so it has to be read
    // defensively: a dictionary that is gone must not leave the page undefined.
    localStorage.setItem(LOCALE_STORAGE_KEY, "kl");
    renderAt("/tokens");
    expect(screen.getByRole("navigation", { name: en.chrome.breadcrumb })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe("ltr");
  }, MOUNT_TIMEOUT_MS);
});
