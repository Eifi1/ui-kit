import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "@eifi1/ui-kit";
// A cycle — `routes.tsx` imports this module for its page bodies — and a safe one:
// nothing here reads GROUPS at module scope, only during render, by which time the
// registry has finished evaluating.
import { GROUPS, hasOverview } from "../routes";
import type { ShowcaseGroup, ShowcasePage } from "../routes";
import { Example, Note } from "../lib/section";
import { useGroupLabel, usePageText } from "../i18n";

/**
 * The two kinds of page that are ABOUT the showcase rather than about a component:
 * the start page, which gives the whole thing its through-line, and a group's overview,
 * which is what clicking a sidebar group opens.
 */

/* ── Group overview ──────────────────────────────────────────────────────── */

/**
 * A group's index: one card per page, each naming the exported components that page
 * demonstrates. Modelled on the component indexes of MUI and Carbon — the reader who
 * arrives looking for `MultiSelect` should not have to guess that it lives under
 * "Dropdown parts" rather than "Text fields".
 */
export function GroupOverview({ group }: { group: ShowcaseGroup }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {group.pages.map((page) => (
        <li key={page.slug} className="contents">
          <PageCard page={page} />
        </li>
      ))}
    </ul>
  );
}

function PageCard({ page }: { page: ShowcasePage }) {
  const { title, blurb } = usePageText(page.slug);
  return (
    <Link
      to={`/${page.slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--bg-surface-2)] text-[var(--text-secondary)]">
          <page.icon className="size-4" aria-hidden />
        </span>
        <span className="flex-1 font-medium text-[var(--text-primary)]">{title}</span>
        <ArrowRight
          aria-hidden
          className="size-4 text-[var(--text-muted)] transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100"
        />
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{blurb}</p>
      {page.components && (
        // Export names are identifiers, not words: never translated, always LTR.
        <ul dir="ltr" className="mt-auto flex flex-wrap gap-1.5">
          {page.components.map((name) => (
            <li
              key={name}
              className="rounded border border-[var(--border)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}

/* ── Getting started ─────────────────────────────────────────────────────── */

/**
 * The page the rest hangs off: what the kit is, the order its layers build in, and
 * the conventions every component keeps — which is the common thread a reader clicking
 * through forty pages of specimens otherwise has to reconstruct for themselves.
 */
export function GettingStarted() {
  const layers = GROUPS.filter((g) => g.slug !== "start");
  return (
    <>
      <Example label="What this is">
        <div className="space-y-3 text-sm text-[var(--text-secondary)]">
          <p>
            <strong className="text-[var(--text-primary)]">@eifi1/ui-kit</strong> is the one
            component library behind keksdose, lenkbank and kastlan. It is{" "}
            <em>domain-free</em>: a component takes its data as props and hands events back as
            callbacks, and it never fetches, never routes on its own and never decides what a
            word says. That is why every page here works without a backend.
          </p>
          <p>
            This showcase renders the repository&rsquo;s <code className="font-mono">src/</code>{" "}
            directly, so what you see is the working tree, not the last release.
          </p>
        </div>
      </Example>

      <Example
        label="The seven layers, in the order they build on each other"
        hint="each group in the sidebar is one layer; its entry opens an overview"
      >
        <ol className="grid gap-3 sm:grid-cols-2">
          {layers.map((group, i) => (
            <LayerCard key={group.slug} group={group} index={i + 1} />
          ))}
        </ol>
        <Note>
          Read top to bottom and each layer only uses the ones above it. Tokens are what every
          pixel is painted with; inputs, pickers and displays are built from primitives in those
          tokens; overlays float them above the page; the app chrome composes all of it into a
          frame; the API layer is what remains when you take the pixels away.
        </Note>
      </Example>

      <Example label="What every component has in common" hint="the conventions a page will not repeat">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          {CONVENTIONS.map(([term, text]) => (
            <div key={term}>
              <dt className="font-medium text-[var(--text-primary)]">{term}</dt>
              <dd className="mt-0.5 text-[var(--text-secondary)]">{text}</dd>
            </div>
          ))}
        </dl>
      </Example>

      <Example label="How to read a page">
        <ul className="list-disc space-y-1.5 ps-5 text-sm text-[var(--text-secondary)]">
          <li>
            The <strong>chips</strong> under the title jump to each specimen on the page; Back
            returns to where you were.
          </li>
          <li>
            Each <strong>card</strong> is one specimen. The grey text beside its heading is the
            constraint you need before deciding it is broken — &ldquo;needs a Router&rdquo;,
            &ldquo;phone only&rdquo;.
          </li>
          <li>
            A <strong>note</strong> below a card explains a decision that looks wrong and is not.
            Those notes are developer documentation and stay in English; everything a user of an
            app would read is translated — switch the language in the top bar.
          </li>
          <li>
            The <strong>top bar</strong> changes the theme, the palette preset and the language
            for the whole page, and the sidebar style (flyout or inline).
          </li>
        </ul>
      </Example>

      <Example label="How the groups map to MUI" hint="for readers who know one library and are learning this one">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs text-[var(--text-muted)]">
              <th className="py-1.5 pe-4 text-start font-medium">MUI category</th>
              <th className="py-1.5 text-start font-medium">Here</th>
            </tr>
          </thead>
          <tbody>
            {MUI_MAP.map(([mui, here]) => (
              <tr key={mui} className="border-b border-[var(--border)] last:border-b-0">
                <td className="py-1.5 pe-4 align-top text-[var(--text-secondary)]">{mui}</td>
                <td className="py-1.5 align-top text-[var(--text-primary)]">{here}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Example>
    </>
  );
}

function LayerCard({ group, index }: { group: ShowcaseGroup; index: number }) {
  const label = useGroupLabel(group.label);
  const target = hasOverview(group) ? group.slug : group.pages[0].slug;
  const { blurb } = usePageText(target);
  return (
    <li>
      <Link to={`/${target}`} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]">
        <Card className="h-full p-4 transition-colors hover:bg-[var(--bg-hover)]">
          <div className="flex items-center gap-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-inverse)] text-xs font-semibold text-[var(--text-inverse)]">
              {index}
            </span>
            <group.icon className="size-4 text-[var(--text-muted)]" aria-hidden />
            <span className="font-medium text-[var(--text-primary)]">{label}</span>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{hasOverview(group) ? blurb : group.blurb}</p>
        </Card>
      </Link>
    </li>
  );
}

const CONVENTIONS: Array<[string, string]> = [
  [
    "Tokens, never colours",
    "Every colour is a CSS variable from the active TokenSet, so a theme or palette switch reaches every component. A component that ignores the switch is a bug.",
  ],
  [
    "One field anatomy",
    "A floating label inside the frame, the value below it, and a helper line under the field for hints and errors. The frame's colour carries state: brand on focus, danger when invalid, the sync colours for a saving field.",
  ],
  [
    "Controlled by default",
    "value in, onChange out. Nothing keeps a second copy of your state, so there is nothing to fall out of step.",
  ],
  [
    "Words come from the app",
    "Every string is a key in UiKitLabels with an English default. Mount UiKitProvider once with your translation and locale; a prop on one component still wins.",
  ],
  [
    "Your props reach the element",
    "className, id, data-* and aria-* are passed through to the component's root, so a consumer can hang a test id or a tour anchor on anything.",
  ],
  [
    "Keyboard and screen reader first",
    "Every control is reachable by Tab, grids use a roving tab stop, and state changes are announced through live regions rather than only painted.",
  ],
];

const MUI_MAP: Array<[string, string]> = [
  ["Inputs", "Inputs — text, forms, choices, numbers, dates, files; Pickers & entry — comboboxes, entity pickers, table entry, sync state"],
  ["Data display", "Data display — buttons, chips, data table, charts, stats"],
  ["Feedback (Dialog, Snackbar, Alert)", "Overlays — dialogs, popovers; AlertBanner under Buttons & surfaces"],
  ["Surfaces (Card, Accordion)", "Buttons & surfaces; Disclosure under Data display"],
  ["Navigation (Drawer, Tabs, Stepper)", "App chrome — shell, wizard; Tabs under Chips & toggles"],
  ["Layout / Utils", "API — hooks and helpers"],
  ["Customization (Theming)", "Foundations — tokens, palettes, localisation"],
  ["MUI X (Data Grid, Date Pickers, Charts)", "Data table, Calendars & date pickers, Chart shell"],
];
