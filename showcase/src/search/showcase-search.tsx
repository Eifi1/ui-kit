import { useMemo } from "react";
import { useLocation } from "react-router";
import { Braces, Hash, Lightbulb, Server } from "lucide-react";
import { GlobalSearch } from "@eifi1/ui-kit";
import type { GlobalSearchSuggestion, SearchEntry } from "@eifi1/ui-kit";
import { PAGES, groupOf } from "../routes";
import { en, useT } from "../i18n";
import type { Dictionary, PageSlug } from "../i18n";
import { slugify } from "../lib/section";
import { PAGE_EXAMPLE_LABELS } from "./examples.generated";
import { SERVER_KIT_MODULES } from "./server-kit.generated";

/**
 * The showcase's ⌘K search: the kit's `GlobalSearch`, fed the way an app feeds it.
 *
 * Four kinds of entry, every one of them DERIVED so none can drift from the page it
 * points at:
 *
 *  - Components — the `components` list of each page in routes.tsx, the same list the
 *    group overviews print. Ranked first: a reader who types `DateRangePicker` knows
 *    exactly what they want.
 *  - Pages — the title, short title and blurb from the active dictionary (with the
 *    English title as a keyword, so an English component-area name still finds it in
 *    Hungarian).
 *  - Examples — every `<Example label>` on every page, from examples.generated.ts (see
 *    scripts/gen-showcase-search-index.mjs for why that is a build-time extraction), each
 *    linking to its heading: `/<slug>#<slugify(label)>`, the id `Example` itself renders
 *    and the one `useScrollRestoration` scrolls to on a PUSH with a hash.
 *  - Needs — the dictionary's plain-language `needs` per page, in the reader's language:
 *    "ask before deleting", "Datumsbereich auswählen".
 *  - Server kit — every server-kit module and member (`eifi1_server_kit.auth`,
 *    `apply_patch`), from server-kit.generated.ts, which the same script writes out of the
 *    pinned api.json; each links to its anchor on its Server kit page. The export itself
 *    stays in that group's chunk.
 *
 * The ranking tiers come from the kit's matcher (exact > prefix > title words > keywords
 * > description); `weight` orders the kinds within a tier the way the list above does.
 */

const WEIGHT = { component: 30, page: 20, serverModule: 15, example: 10, serverMember: 5, need: 0 } as const;

/** A page's title in `dict`, tolerant of a slug the dictionary has not heard of. */
function pageTitle(dict: Dictionary, slug: string): string {
  return dict.pages[slug]?.title ?? en.pages[slug]?.title ?? slug;
}

/** The link to an example's heading on its page. */
export function exampleHref(slug: string, label: string): string {
  return `/${slug}#${slugify(label)}`;
}

/** Every search entry for `dict`'s language. Pure, for the tests. */
export function buildSearchEntries(dict: Dictionary): SearchEntry[] {
  const groupName = (label: string) => dict.groups[label] ?? en.groups[label] ?? label;
  const entries: SearchEntry[] = [];

  for (const page of PAGES) {
    const slug = page.slug;
    const title = pageTitle(dict, slug);
    const text = dict.pages[slug] ?? en.pages[slug];
    const group = groupOf(slug);
    const Icon = page.icon;
    entries.push({
      id: `page:${slug}`,
      title,
      keywords: [text?.short ?? "", page.title, group ? groupName(group.label) : ""].filter(Boolean),
      description: text?.blurb,
      group: dict.chrome.searchPages,
      hint: group && group.slug !== slug ? groupName(group.label) : undefined,
      icon: <Icon className="size-4" />,
      href: `/${slug}`,
      weight: WEIGHT.page,
    });

    for (const name of page.components ?? []) {
      entries.push({
        id: `component:${slug}:${name}`,
        title: name,
        group: dict.chrome.searchComponents,
        hint: title,
        icon: <Braces className="size-4" />,
        href: `/${slug}`,
        weight: WEIGHT.component,
      });
    }

    // Two labels that slugify alike are one anchor on the page (the first); one row.
    const anchors = new Set<string>();
    for (const label of PAGE_EXAMPLE_LABELS[slug] ?? []) {
      if (anchors.has(slugify(label))) continue;
      anchors.add(slugify(label));
      entries.push({
        id: `example:${slug}:${slugify(label)}`,
        title: label,
        group: dict.chrome.searchExamples,
        hint: title,
        icon: <Hash className="size-4" />,
        href: exampleHref(slug, label),
        weight: WEIGHT.example,
      });
    }

    (dict.needs[slug as PageSlug] ?? []).forEach((need, i) => {
      entries.push({
        id: needId(slug, i),
        title: need,
        group: dict.chrome.searchNeeds,
        hint: title,
        icon: <Lightbulb className="size-4" />,
        href: `/${slug}`,
        weight: WEIGHT.need,
      });
    });
  }

  // The server-kit modules and their members. Identifiers, so never translated; the
  // group name and the page title in the hint are.
  for (const mod of SERVER_KIT_MODULES) {
    const title = pageTitle(dict, mod.page);
    const path = `eifi1_server_kit.${mod.module}`;
    entries.push({
      id: `server:${mod.module}`,
      title: path,
      keywords: [mod.module, title],
      // The summary as plain words: its ``literals`` are RST, not something to match on.
      description: mod.summary.replace(/``?/g, ""),
      group: dict.chrome.searchServer,
      hint: title,
      icon: <Server className="size-4" />,
      href: serverKitHref(mod.page, mod.module),
      weight: WEIGHT.serverModule,
    });
    for (const [name, kind] of mod.members) {
      entries.push({
        id: `server:${mod.module}.${name}`,
        title: name,
        keywords: [`${mod.module}.${name}`, `${path}.${name}`],
        group: dict.chrome.searchServer,
        hint: `${mod.module} · ${kind}`,
        icon: <Braces className="size-4" />,
        href: serverKitHref(mod.page, `${mod.module}.${name}`),
        weight: WEIGHT.serverMember,
      });
    }
  }
  return entries;
}

/** A server-kit module's or member's anchor on its page (server-kit/api.ts anchors). */
export function serverKitHref(page: string, anchor: string): string {
  return `/${page}#${anchor}`;
}

function needId(slug: string, index: number): string {
  return `need:${slug}:${index}`;
}

/**
 * The "Try" list for the empty query: needs rather than component names, because a
 * reader who knows the name does not need a suggestion. Addressed by page and index,
 * which every dictionary keeps in step with en.ts, so the suggestions are the same five
 * tasks in every language.
 */
const SUGGESTED: Array<[PageSlug, number]> = [
  ["confirm-floating", 0], // ask before deleting
  ["calendars", 1], // pick a date range
  ["clipboard-timing", 0], // copy to clipboard
  ["files", 0], // upload a file
  ["series-chart", 0], // show a chart over time
];
export const SEARCH_SUGGESTIONS: GlobalSearchSuggestion[] = SUGGESTED.map(([slug, i]) => needId(slug, i));

export function ShowcaseSearch() {
  const t = useT();
  const entries = useMemo(() => buildSearchEntries(t), [t]);
  const labels = useMemo(() => ({ placeholder: t.chrome.searchPlaceholder }), [t]);
  // No `groupOrder`: the groups follow the ranking, so "Tooltip" opens on Components and
  // "ask before deleting" on the needs. Inside the HashRouter, so `navigate` and the rows'
  // `#/page#anchor` links come from the router without being passed.
  //
  // The Command palette page demonstrates `useCommandKey` with a palette of its own, bound
  // to ⌘K "anywhere on this page" — so on that one page the shortcut is the specimen's,
  // and the top-bar search is opened by its button. Two modals from one keystroke would
  // demonstrate nothing.
  //
  // `triggerName="withShortcut"`: the trigger is named "Search (Ctrl K)" rather than
  // "Search", so the shortcut is met in the name itself — but only where the shortcut is
  // live, or the name would promise a key that opens something else.
  const { pathname } = useLocation();
  const shortcut = pathname !== "/command-palette";
  return (
    <GlobalSearch
      entries={entries}
      suggestions={SEARCH_SUGGESTIONS}
      labels={labels}
      shortcut={shortcut}
      triggerName={shortcut ? "withShortcut" : "plain"}
    />
  );
}
