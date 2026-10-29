import { createContext, useContext } from "react";
import type { MouseEvent, ReactNode } from "react";

import { useKitLabels } from "../i18n/kit-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { countryName } from "../lib/countries";
import { AlertBanner } from "./alert-banner";
import { TextLink } from "./text-link";
import { DEFAULT_LEGAL_LABELS } from "./legal-labels";

/**
 * The legal pages — Imprint, Privacy Policy, Terms — for every app.
 *
 * 0.19 (docs/i18n-harmonization.md H10): keksdose and kastlan each carried the same
 * shell, written twice: a back link, the title, a "closed beta, not yet reviewed by a
 * lawyer" notice, sections of heading + running text, and kastlan's row of links to the
 * three pages with the current one marked. That shape moved here; the words stayed in
 * each app.
 *
 * 0.28 (docs/legal-harmonization.md) reverses the second half: the wording that is the
 * same in all three apps is the kit's too, in all seven languages, so there is ONE text
 * to change after the lawyer's review instead of three apps drifting apart sentence by
 * sentence. This module holds the labels (every kit-owned legal word, §4.3/§4.4), the
 * column (`LegalLayout`), the section (`LegalSection`, now numbered and cross-referenced
 * inside a `LegalPage`), the links row and the public footer. The page frame, the
 * kit-owned sections and the terms checkbox are in `./legal-page`.
 *
 * `LegalLayout` stays a CONTENT COLUMN, not a page: before 0.28 keksdose showed it inside
 * its public landing header and footer and kastlan inside `AuthLayout`. `LegalPage` is
 * the frame around it that the contract (§3.2) settled on — keksdose's.
 */

// ── The operator ──────────────────────────────────────────────────────────────

/** The three pages, by the key every app uses for them (§4.1). Kurvenschmiede's
 *  `imprint` became `impressum`. */
export type LegalPageKey = "impressum" | "privacy" | "terms";

/** The three routes (§3.1): one per page, the language from i18n, no per-language URLs. */
export const LEGAL_HREFS: Readonly<Record<LegalPageKey, string>> = Object.freeze({
  impressum: "/impressum",
  privacy: "/privacy",
  terms: "/terms",
});

/** 0.51.4: the two public pages an app MAY have beside the legal ones, linked after
 *  them in the footer (§3.3) — keksdose's /security and /accessibility. Not legal pages:
 *  an app draws them with `PublicPage`, in its own words, at routes of its choosing. */
export type LegalInfoPageKey = "security" | "accessibility";

/**
 * Who runs the app — the values the kit's legal sections are filled in with (§5).
 *
 * The kit holds NO personal data: every app passes the same values once, to
 * {@link LegalPage}'s `operator`. Plain strings, so the app's config or env can hold them.
 */
export interface LegalOperator {
  /** The operator's name, as the imprint prints it. */
  name: string;
  /** "9470"-shaped; printed before the city. */
  postalCode: string;
  /** The place — the imprint's address line and the terms' place of jurisdiction. */
  city: string;
  /** The canton or state, abbreviated as the place of jurisdiction writes it: "SG". */
  region: string;
  /**
   * ISO 3166-1 alpha-2: "CH". A CODE, not a name — the kit names it in the page's
   * language (`Intl.DisplayNames`, see `countryName`), so "Switzerland", "Schweiz",
   * "Suisse" and "瑞士" all come from one value.
   */
  country: string;
  /** The contact address the imprint and the privacy policy print. */
  email: string;
  /**
   * The language whose version of the legal texts is BINDING ("de-CH"), a BCP 47 code
   * (0.28.1, Marcel 2026-10-05). The lawyer reviews that one; the others are translations
   * for convenience. With it, {@link LegalPage} shows a note on every page read in
   * another language, and the terms' `language` section says which version prevails.
   * Only the language subtag counts: "de-CH" and "de" are the same language here.
   */
  bindingLanguage?: string;
}

/**
 * The operator as the kit's texts read it: {@link LegalOperator} with `country` already
 * NAMED in the page's language ("Schweiz", not "CH").
 *
 * The label functions take this rather than the code so they stay pure string functions
 * of plain values, like every other function label in the kit: a catalogue never calls
 * `Intl`, and a review row can be rendered from placeholders (`{{country}}`).
 */
export type LegalOperatorText = Readonly<Record<keyof LegalOperator, string>>;

/** The language subtag of a BCP 47 code, lower-cased: "de-CH" → "de". */
export function baseLanguage(code: string): string {
  return code.split(/[-_]/)[0]!.toLowerCase();
}

const languageNamers = new Map<string, Intl.DisplayNames | null>();

/** The name of a language in `locale` — "Deutsch", "German", "allemand", "德语" — from its
 *  language subtag, so "de-CH" is plain "German", not "Swiss High German". The code itself
 *  when the runtime cannot name it. */
function languageName(code: string, locale: string): string {
  let namer = languageNamers.get(locale);
  if (namer === undefined) {
    try {
      namer = new Intl.DisplayNames([locale], { type: "language" });
    } catch {
      namer = null;
    }
    languageNamers.set(locale, namer);
  }
  const base = baseLanguage(code);
  try {
    return namer?.of(base) ?? base;
  } catch {
    return base;
  }
}

/** @internal The operator as the texts read it: its country named in `locale` (English
 *  without one — `countryName`'s rule, so an app that set no locale reads English). */
export function legalOperatorText(operator: LegalOperator, locale: string = "en"): LegalOperatorText {
  return {
    ...operator,
    country: countryName(operator.country, locale),
    bindingLanguage: operator.bindingLanguage ? languageName(operator.bindingLanguage, locale) : "",
  };
}

// ── Labels ────────────────────────────────────────────────────────────────────

/** A kit section whose text is fixed: a heading and one body. */
export interface LegalTextSectionLabels {
  title: string;
  body: string;
}

/**
 * 0.32.0: the imprint's disclaimer, with the body of its COMMERCIAL variant
 * (docs/billing-harmonization.md §8; legal decision 7). The title is the same in both:
 * liability for content and links is the subject either way.
 */
export interface LegalDisclaimerSectionLabels extends LegalTextSectionLabels {
  /**
   * The body for `<LegalKitSection section="disclaimer" variant="commercial">`: a paid
   * service sold through a Merchant of Record, which sells in its own name (§2.2), so the
   * "private, non-commercial … closed beta" of `body` would be untrue. OPTIONAL, as every
   * key added to a namespace an app may annotate: left out, the provider's, then English.
   */
  commercial?: string;
}

/** A kit section whose text names the operator (§4.3 `{name}`, `{email}`, …). */
export interface LegalOperatorSectionLabels {
  title: string;
  /** Called with the operator, its country already named in the page's language. Line
   *  breaks are kept (`white-space: pre-line`): an address is plain lines. */
  body: (operator: LegalOperatorText) => string;
}

/** A kit section with an app slot (or a list) between its two parts. */
export interface LegalFramedSectionLabels {
  title: string;
  /** Before the app's part. */
  lead: string;
  /** After it. */
  tail: string;
}

/**
 * Every word of the legal pages that is the kit's — docs/legal-harmonization.md §4.3 and
 * §4.4, verbatim. English, British spelling; the other six languages are in the
 * catalogues (`@eifi1/ui-kit/i18n/<code>`).
 *
 * Keys follow the contract: `sections.<page>.<section key>`, the section keys being
 * keksdose's (`legal_basis`, not `legalBasis`), because the same key is the section's
 * `id` (`/privacy#legal_basis`) and the app's own sections sit beside these under the
 * same names in its catalogue. Titles carry NO number: {@link LegalPage} numbers the
 * privacy and terms sections in render order (§4.1).
 */
export interface LegalLabels {
  /** The accessible name of {@link LegalLinks}' and {@link LegalFooter}'s `<nav>`. */
  navLabel: string;
  /** The short labels of the three links, everywhere the links appear (§3.3), and since
   *  0.51.4 of the two optional public pages after them (`securityHref`,
   *  `accessibilityHref` on {@link LegalLinks}) — optional keys, as every key added to a
   *  namespace an app may annotate: left out, the provider's, then English. */
  links: Record<LegalPageKey, string> & Partial<Record<LegalInfoPageKey, string>>;
  /** The pages' titles — the `<h1>`, and the links of the terms checkbox. */
  titles: Record<LegalPageKey, string>;
  /** The back link above the title: "← Back to home". */
  backHome: string;
  /**
   * The terms checkbox (§3.4) — ONE template with `{terms}` and `{privacy}`, which
   * become the links (named with `titles`). Not a prefix plus a joiner: a language puts
   * the links where its grammar wants them, articles included, and nothing is added
   * around a placeholder — Italian elides, "e l’{privacy}", with no space.
   */
  accept: string;
  /** The notice under the title (§3.2): `beta` on the imprint and the terms, `privacy`
   *  on the privacy policy. */
  notice: {
    beta: string;
    privacy: string;
  };
  /**
   * 0.28.1: on a page read in another language than the operator's `bindingLanguage` —
   * `note` under the title, `show` on the button that switches to the binding version
   * (when the app passes `onShowBindingLanguage`). `o.bindingLanguage` is the binding
   * language's NAME in the reader's language ("German", "allemand").
   */
  translation: {
    note: (o: LegalOperatorText) => string;
    show: (o: LegalOperatorText) => string;
  };
  /**
   * 0.51.3: the as-of line under the title (§3.2), "Last updated: 29 October 2026" —
   * {@link LegalPage}'s `updated`, called with the date already written out in the page's
   * locale. OPTIONAL, as every key added to a namespace an app may annotate: left out,
   * the provider's, then English.
   */
  updated?: (date: string) => string;
  /**
   * 0.51.4: the plain-language summary at the top of a page ({@link LegalPage}'s
   * `summary`, §3.2) — its heading, and the line under the points saying that only the
   * full text binds. Optional, as `updated`.
   */
  summary?: {
    title: string;
    note: string;
  };
  /** The kit's sections (§4.3), by page and section key. */
  sections: {
    impressum: {
      operator: LegalOperatorSectionLabels;
      contact: LegalOperatorSectionLabels;
      /** `body` is the default, non-commercial text; `commercial` the 0.32 variant. */
      disclaimer: LegalDisclaimerSectionLabels;
    };
    privacy: {
      controller: LegalOperatorSectionLabels;
      /** The app's paragraph follows the body (§4.2): consent, where an app relies on it. */
      legal_basis: LegalTextSectionLabels;
      /** `lead`, then the app's entries as a list, then `tail`, then the app's paragraph. */
      browser: LegalFramedSectionLabels;
      /** `lead` (the rights), then the app's paragraph (export, deletion), then `tail`
       *  (the supervisory authorities). */
      rights: LegalFramedSectionLabels;
      contact: LegalOperatorSectionLabels;
    };
    terms: {
      warranty: LegalTextSectionLabels;
      liability: LegalTextSectionLabels;
      changes: LegalTextSectionLabels;
      /** 0.28.1: which language's version prevails — `o.bindingLanguage`, named. */
      language: LegalOperatorSectionLabels;
      /** The place of jurisdiction is the operator's `{city} ({region}), {country}`. */
      law: LegalOperatorSectionLabels;
    };
  };
}

// Defined in ./legal-labels, which holds no component code (0.34, KS U8).
export { DEFAULT_LEGAL_LABELS };

/** The `legal` namespace, resolved: defaults < provider < `labels` prop. The prop may be
 *  partial at every depth (`{ titles: { terms: "…" } }`), as the provider's is. */
export function useLegalLabels(labels?: LabelOverride<LegalLabels>): LegalLabels {
  return useKitLabels("legal", DEFAULT_LEGAL_LABELS, labels);
}

// ── What a LegalPage tells the sections inside it ─────────────────────────────

/** Where a `{ref:key}` points: the section's number on a numbered page, else its heading. */
export interface LegalRefTarget {
  number?: number;
  heading: ReactNode;
}

/** @internal Set by `LegalPage` around its column; `null` outside one. */
export interface LegalPageContextValue {
  page: LegalPageKey;
  /** The operator with its country named — what the kit sections are filled in with. */
  operator: LegalOperatorText;
  /** The heading level of a section that does not choose one: one below the title. */
  sectionHeading: "h2" | "h3";
  /** Every section's key, in render order — known BEFORE any section renders, so a
   *  reference can point forward (keksdose's section 2 refers to section 10). */
  targets: ReadonlyMap<string, LegalRefTarget>;
}

/** @internal */
export const LegalPageContext = createContext<LegalPageContextValue | null>(null);

/** @internal The place `LegalPage` gave one section: its key and its number. Reset to
 *  `null` inside a section, so a section nested in another's children takes neither. */
export interface LegalSectionSlot {
  id?: string;
  number?: number;
}

/** @internal */
export const LegalSlotContext = createContext<LegalSectionSlot | null>(null);

/** @internal `{ref:retention}`. A key is a section key: letters, digits, `_` and `-`. */
const REF_TOKEN = /\{ref:([A-Za-z0-9_-]+)\}/g;

/**
 * A development build's console note — never in production (the consumer's bundler
 * makes `import.meta.env.DEV` false) and never under vitest. Optional-chained:
 * `import.meta.env` is a Vite injection, absent under plain Node.
 */
function devWarnings(): boolean {
  return Boolean(import.meta.env?.DEV) && !import.meta.env?.VITEST;
}
const warned = new Set<string>();
/** @internal Once per message. */
export function warnLegalOnce(message: string): void {
  if (!devWarnings() || warned.has(message)) return;
  warned.add(message);
  console.warn(`[ui-kit] ${message}`);
}

/**
 * `text` with every `{ref:key}` replaced by a link to `#key` that reads the section's
 * number — the words around it stay the app's ("see section {ref:retention}", "siehe
 * Abschnitt {ref:retention}"), so each language keeps its grammar (§4.1). On the imprint,
 * which is not numbered, the link reads the section's heading instead.
 *
 * Outside a {@link LegalPage} the text is returned as it is: there is no order to count.
 * A key the page has no section for stays visible as the raw token — a broken reference
 * an app test can find (`not.toHaveTextContent("{ref:")`), not a silently wrong number.
 */
export function resolveLegalRefs(text: string, page: LegalPageContextValue | null): ReactNode {
  if (!page || !text.includes("{ref:")) return text;
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(REF_TOKEN)) {
    const at = match.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const key = match[1];
    const target = page.targets.get(key);
    if (target) {
      out.push(
        <TextLink key={`${key}@${at}`} href={`#${key}`}>
          {target.number ?? target.heading}
        </TextLink>,
      );
    } else {
      warnLegalOnce(`{ref:${key}} on the ${page.page} page points at no section of it.`);
      out.push(match[0]);
    }
    last = at + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** @internal Running text — one translation string — with its line breaks kept and its
 *  `{ref:key}` tokens resolved. */
export function LegalText({ text, className }: { text: string; className?: string }) {
  const page = useContext(LegalPageContext);
  // `break-words`: an address, an email or a URL in a translation is one long word, and
  // on a 390px phone it would push the column wider than the screen.
  return <p className={cn("whitespace-pre-line break-words", className)}>{resolveLegalRefs(text, page)}</p>;
}

// ── Links ─────────────────────────────────────────────────────────────────────

export interface LegalLink {
  href: string;
  /** "Imprint", "Privacy Policy", "Terms". */
  label: ReactNode;
}

export interface LegalLinksProps {
  /** Default (0.28): the three routes, `/impressum`, `/privacy` and `/terms`, with the
   *  kit's short link labels (`legal.links`), in the contract's order. */
  links?: readonly LegalLink[];
  /**
   * 0.51.4: the app's security page — a "Security" link after the others, with the kit's
   * label (`legal.links.security`). Left out, no link: only an app that has the page
   * names its route.
   */
  securityHref?: string;
  /** 0.51.4: the app's accessibility statement — "Accessibility", last. As
   *  `securityHref`. */
  accessibilityHref?: string;
  /** The page being shown; its link is marked `aria-current="page"`. Usually the
   *  router's pathname. */
  currentHref?: string;
  /** `false` renders the links without the `<nav>` landmark — inside `AuthLayout`'s
   *  `footer` or `TopBarActionMenu`'s `footer`, which are named `<nav>`s already. The row
   *  keeps its spacing and `className` either way (0.27.1: it used to return the bare
   *  links, so in a plain container — Kurvenschmiede's account-menu `<li>` — they ran
   *  together as "ImpressumDatenschutzerklärungNutz…" and overflowed). Default true. */
  nav?: boolean;
  /** Called on a click on any of the links, before it navigates — an account menu closes
   *  itself here (0.28.1, keksdose: it had to catch the click on a wrapping `<div>`). */
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  labels?: LabelOverride<LegalLabels>;
  className?: string;
}

/** The default links: the three routes under the kit's short labels. */
function defaultLinks(labels: LegalLabels): LegalLink[] {
  return (["impressum", "privacy", "terms"] as const).map((page) => ({
    href: LEGAL_HREFS[page],
    label: labels.links[page],
  }));
}

/** The optional pages after them, each only where the app named its route. */
function infoLinks(labels: LegalLabels, hrefs: Partial<Record<LegalInfoPageKey, string>>): LegalLink[] {
  return (["security", "accessibility"] as const).flatMap((page) => {
    const href = hrefs[page];
    return href ? [{ href, label: labels.links[page] ?? DEFAULT_LEGAL_LABELS.links[page] }] : [];
  });
}

/**
 * The legal pages as a row of quiet links, the one you are on marked (kastlan's
 * `LegalLinks`). Wraps on a phone.
 *
 * 0.28: `·` separators between the links, keksdose's footer style, wherever the links
 * appear — the account menu included (§3.3). The dots are `aria-hidden`: a screen reader
 * already hears three links, and "middle dot" between them is noise. They are flex items
 * of the row like the links, so the row's gap spaces them evenly.
 */
export function LegalLinks({
  links,
  securityHref,
  accessibilityHref,
  currentHref,
  nav = true,
  onLinkClick,
  labels: labelsProp,
  className,
}: LegalLinksProps) {
  const labels = useLegalLabels(labelsProp);
  const shown = [
    ...(links ?? defaultLinks(labels)),
    ...infoLinks(labels, { security: securityHref, accessibility: accessibilityHref }),
  ];
  const items = shown.flatMap((link, i) => [
    ...(i > 0 ? [<span key={`sep-${link.href}`} aria-hidden="true">·</span>] : []),
    <TextLink key={link.href} href={link.href} tone="muted" current={link.href === currentHref} onClick={onLinkClick}>
      {link.label}
    </TextLink>,
  ]);
  const rowClass = cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-xs", className);
  if (!nav) return <div className={rowClass}>{items}</div>;
  return (
    <nav aria-label={labels.navLabel} className={rowClass}>
      {items}
    </nav>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

export interface LegalFooterProps {
  /** Under the links, centred — the app's tagline (keksdose: "Self-hosted household
   *  budgeting & bookkeeping."). */
  children?: ReactNode;
  /** Default: the three routes with the kit's link labels — see {@link LegalLinks}. */
  links?: readonly LegalLink[];
  /** 0.51.4: "Security" after the others — see {@link LegalLinksProps.securityHref}. */
  securityHref?: string;
  /** 0.51.4: "Accessibility", last — see {@link LegalLinksProps.accessibilityHref}. */
  accessibilityHref?: string;
  /** Marks that link `aria-current="page"`. {@link LegalPage}'s default footer passes
   *  its own page. */
  currentHref?: string;
  /**
   * Default true: the footer is a `<footer>`. `false` draws a `<div>` — for a host that is
   * a footer already: `AuthLayout`'s `footer` slot is one, and HTML forbids a footer inside
   * a footer (0.28.1, kastlan). On an `AuthLayout` page the usual choice is simpler still:
   * `footer={<LegalLinks nav={false} />}` with `footerLabel` set to the kit's `navLabel`
   * ({@link useLegalLabels}).
   */
  landmark?: boolean;
  className?: string;
  labels?: LabelOverride<LegalLabels>;
}

/**
 * The public footer (§3.3): the three links, centred, with their separators, in a
 * `<nav aria-label="Legal">` — on the landing or home page, every signed-out page the app
 * has, the legal pages and the 404. The rule behind it: from every page a signed-out
 * visitor can reach, the three links are one click away.
 *
 * keksdose's `SiteFooter` (features/landing/site-footer.tsx), which carried them on its
 * landing, auth, legal and 404 pages; kastlan and Kurvenschmiede had them on some pages
 * only. Its palette classes (`border-slate-200 bg-white dark:…`) became the surface and
 * border tokens, so it follows the theme like the rest of the kit.
 *
 * 0.51.4: an app with a security page or an accessibility statement passes their routes
 * (`securityHref`, `accessibilityHref`) and the row goes on with "Security · Accessibility"
 * in the kit's words, so the footer reads the same in every app that has them.
 */
export function LegalFooter({
  children,
  links,
  securityHref,
  accessibilityHref,
  currentHref,
  landmark = true,
  className,
  labels,
}: LegalFooterProps) {
  const Root = landmark ? "footer" : "div";
  return (
    <Root className={cn("border-t border-subtle bg-surface", className)}>
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-muted">
        <LegalLinks
          links={links}
          securityHref={securityHref}
          accessibilityHref={accessibilityHref}
          currentHref={currentHref}
          labels={labels}
          className="justify-center gap-y-2 text-sm"
        />
        {children !== undefined && children !== null && <p className="mt-4 text-center">{children}</p>}
      </div>
    </Root>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export interface LegalSectionProps {
  heading: ReactNode;
  /** Running text. Line breaks in it are kept (`white-space: pre-line`), so a
   *  translation can hold an address or a list as plain lines. Inside a
   *  {@link LegalPage}, `{ref:key}` becomes the number of section `key`, linked. */
  body?: string;
  /** Anything richer than plain text — links, a list — after `body`. A plain string
   *  here has its `{ref:key}` tokens resolved too. */
  children?: ReactNode;
  /**
   * The section's `id`, for a link to it from elsewhere. Inside a {@link LegalPage} it
   * defaults to the element's React `key` — keksdose's
   * `SECTIONS.map((s) => <LegalSection key={s} … />)` gets `id="retention"` with
   * nothing added — and it is the key a `{ref:…}` names.
   */
  id?: string;
  /** The heading's element. Default `h2` under the layout's `h1` (inside a
   *  `LegalPage`, one level below its title). */
  headingAs?: "h2" | "h3";
}

/**
 * One section: heading and running text.
 *
 * 0.28, inside a {@link LegalPage}: its `id` (the `key` unless given), its number on the
 * privacy policy and the terms ("3. Legal basis" — titles carry no number, §4.1), and
 * `{ref:key}` resolution in `body`. Outside one it is exactly the 0.19 section.
 */
export function LegalSection({ heading, body, children, id: idProp, headingAs }: LegalSectionProps) {
  const page = useContext(LegalPageContext);
  const slot = useContext(LegalSlotContext);
  const id = idProp ?? slot?.id;
  const number = slot?.number;
  const Heading = headingAs ?? page?.sectionHeading ?? "h2";
  return (
    <section id={id} className="scroll-mt-20">
      <Heading className="text-lg font-semibold break-words text-primary">
        {number !== undefined && `${number}. `}
        {heading}
      </Heading>
      <LegalSlotContext.Provider value={null}>
        {body !== undefined && (
          <LegalText text={body} className="mt-2 text-sm leading-relaxed text-secondary" />
        )}
        {children !== undefined && (
          <div className="mt-2 text-sm leading-relaxed break-words text-secondary">
            {typeof children === "string" ? resolveLegalRefs(children, page) : children}
          </div>
        )}
      </LegalSlotContext.Provider>
    </section>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

export interface LegalLayoutProps {
  /** "Imprint", "Privacy Policy", "Terms". */
  title: ReactNode;
  /** Above the title — the app's "← Back" link (`<TextLink icon={ArrowLeft}>`). Inside
   *  a {@link LegalPage}, "← Back to home". */
  back?: ReactNode;
  /**
   * A notice under the title, as a warning banner with `role="note"` — page furniture,
   * not an alert. Per page, not per layout: the privacy page says something more precise
   * than the others (its technical sections describe running code).
   */
  notice?: ReactNode;
  /** 0.51.3: right under the title — {@link LegalPage}'s "Last updated: …" line. */
  updated?: ReactNode;
  /** 0.28.1: under the title, before the notice — {@link LegalPage}'s note that this
   *  page is a translation and which language is binding. */
  translationNote?: ReactNode;
  /** 0.51.4: before the sections — {@link LegalPage}'s plain-language summary. */
  summary?: ReactNode;
  /** The sections — {@link LegalSection}s. */
  children: ReactNode;
  /** The three pages, linked at the end of the column with the current one marked.
   *  Leave out when the page's chrome already shows them (a {@link LegalFooter}). */
  links?: readonly LegalLink[];
  currentHref?: string;
  /** Default `h1`: the page's heading. */
  headingAs?: "h1" | "h2";
  /** Extra classes on the column — `px-0 py-0` inside a chrome that pads already. */
  className?: string;
  labels?: LabelOverride<LegalLabels>;
}

export function LegalLayout({
  title,
  back,
  notice,
  updated,
  translationNote,
  summary,
  children,
  links,
  currentHref,
  headingAs: Heading = "h1",
  className,
  labels,
}: LegalLayoutProps) {
  return (
    <article className={cn("mx-auto w-full max-w-3xl px-4 py-12", className)}>
      {back !== undefined && <div className="mb-4 text-sm">{back}</div>}
      <Heading className="text-3xl font-bold tracking-tight break-words text-primary">{title}</Heading>
      {updated !== undefined && updated !== null && <p className="mt-2 text-sm text-muted">{updated}</p>}
      {translationNote !== undefined && translationNote !== null && <div className="mt-3">{translationNote}</div>}
      {notice !== undefined && notice !== null && (
        <AlertBanner tone="warning" role="note" className="mt-4">
          {notice}
        </AlertBanner>
      )}
      <div className="mt-8 space-y-8">
        {summary}
        {children}
      </div>
      {links !== undefined && links.length > 0 && (
        <LegalLinks links={links} currentHref={currentHref} labels={labels} className="mt-12 border-t border-subtle pt-4" />
      )}
    </article>
  );
}
