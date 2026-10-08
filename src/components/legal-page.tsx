import { Fragment, isValidElement, useContext, useMemo } from "react";
import type { ReactNode, Ref } from "react";
import { ArrowLeft } from "lucide-react";

import { UiKitProvider, useKitLocale } from "../i18n/kit-labels";
import type { LabelOverride, UiKitLabelOverrides } from "../i18n/kit-labels";
import { useNoIndex } from "../hooks/use-noindex";
import { cn } from "../lib/cn";
import { Checkbox } from "./checkbox";
import type { CheckboxProps } from "./checkbox";
import {
  DEFAULT_LEGAL_LABELS,
  LEGAL_HREFS,
  baseLanguage,
  LegalFooter,
  LegalLayout,
  LegalPageContext,
  LegalSection,
  LegalSlotContext,
  LegalText,
  legalOperatorText,
  useLegalLabels,
  warnLegalOnce,
} from "./legal";
import type {
  LegalDisclaimerSectionLabels,
  LegalFramedSectionLabels,
  LegalLabels,
  LegalOperator,
  LegalOperatorSectionLabels,
  LegalOperatorText,
  LegalPageContextValue,
  LegalPageKey,
  LegalRefTarget,
  LegalSectionProps,
  LegalTextSectionLabels,
} from "./legal";
import { TextLink } from "./text-link";
import { Button } from "./ui";

/**
 * The legal pages' frame and the kit's own sections — docs/legal-harmonization.md §3
 * and §4, the 0.28 round. The labels, the column, `LegalSection`, the links and the
 * footer are in `./legal`.
 */

// ── The skeleton (§4.2) ───────────────────────────────────────────────────────

/** Who writes a section: the kit's wording, the app's own, or the kit's wording with an
 *  app paragraph in a fixed slot. */
export type LegalSectionOwner = "kit" | "app" | "kit+app";

export interface LegalSkeletonEntry {
  /** The section key — its `id` and its catalogue key. `"*"` is the slot where the
   *  app's own sections go (zero or more: keksdose's `credits`, `price_pool`, …). */
  key: string;
  owner: LegalSectionOwner;
}

export interface LegalSkeletonPage {
  /** Whether the page numbers its sections ("3. Legal basis"). The imprint does not. */
  numbered: boolean;
  /** The sections in their order. */
  sections: readonly LegalSkeletonEntry[];
}

/**
 * The section order every app's legal pages follow (§4.2), as data — so an app's test
 * can assert that its pages do, and so the order lives in one place, not in three apps'
 * reading of a table. `LegalPage` reads `numbered` from it.
 *
 * An app's test, given the section ids its page rendered in order:
 *
 *     const fixed = LEGAL_SKELETON.privacy.sections.map((s) => s.key).filter((k) => k !== "*");
 *     expect(ids.filter((id) => fixed.includes(id))).toEqual(fixed);
 *
 * Every fixed key is there, in the skeleton's order; the ids that are not in it are the
 * app's own sections, which belong where `"*"` stands.
 */
export const LEGAL_SKELETON: Readonly<Record<LegalPageKey, LegalSkeletonPage>> = Object.freeze({
  impressum: Object.freeze({
    numbered: false,
    sections: Object.freeze([
      { key: "operator", owner: "kit" },
      { key: "contact", owner: "kit" },
      { key: "disclaimer", owner: "kit" },
      { key: "*", owner: "app" },
    ] as const),
  }),
  privacy: Object.freeze({
    numbered: true,
    sections: Object.freeze([
      { key: "controller", owner: "kit" },
      { key: "data", owner: "app" },
      { key: "legal_basis", owner: "kit+app" },
      { key: "third_parties", owner: "app" },
      { key: "*", owner: "app" },
      { key: "browser", owner: "kit+app" },
      { key: "transfers", owner: "app" },
      { key: "retention", owner: "app" },
      { key: "rights", owner: "kit+app" },
      { key: "contact", owner: "kit" },
    ] as const),
  }),
  terms: Object.freeze({
    numbered: true,
    sections: Object.freeze([
      { key: "scope", owner: "app" },
      { key: "no_advice", owner: "app" },
      { key: "*", owner: "app" },
      { key: "warranty", owner: "kit" },
      { key: "liability", owner: "kit" },
      { key: "changes", owner: "kit" },
      // 0.28.1: which language's version prevails (the operator's `bindingLanguage`).
      { key: "language", owner: "kit" },
      { key: "law", owner: "kit" },
    ] as const),
  }),
});

/** The sections the kit writes (§4.3), on whichever page they sit. `contact` is on two
 *  pages, with two texts; the page decides which. */
export type LegalKitSectionKey =
  | "operator"
  | "contact"
  | "disclaimer"
  | "controller"
  | "legal_basis"
  | "browser"
  | "rights"
  | "warranty"
  | "liability"
  | "changes"
  | "language"
  | "law";

/** The kit's sections of one page, in the skeleton's order. */
function kitSectionsOf(page: LegalPageKey): string[] {
  return LEGAL_SKELETON[page].sections.filter((s) => s.owner !== "app").map((s) => s.key);
}

const PAGES: readonly LegalPageKey[] = ["impressum", "privacy", "terms"];

// ── Kit sections ──────────────────────────────────────────────────────────────

interface LegalKitSectionBase {
  /** Default: the enclosing {@link LegalPage}'s page — needed outside one, and for
   *  `contact` only (it is on two pages). */
  page?: LegalPageKey;
  /** Default: the enclosing {@link LegalPage}'s operator — needed outside one, by the
   *  sections that name it (operator, both contacts, controller, law). */
  operator?: LegalOperator;
  /** Default: one level below the page's title (`h2` under an `h1`). */
  headingAs?: "h2" | "h3";
  labels?: LabelOverride<LegalLabels>;
}

/**
 * One of the kit's sections, by key. `children` is the app's paragraph where §4.2 says
 * "kit + app" — and only there, which the type holds an app to: the other sections'
 * wording is identical in every app, and an app that needs to say more says it in a
 * section of its own. `browser` takes the app's list of what it keeps, as `entries`.
 */
export type LegalKitSectionProps = LegalKitSectionBase &
  (
    | {
        section: "browser";
        variant?: never;
        /** What this app keeps in the browser, one entry per item — rendered as a `<ul>`
         *  between the kit's two sentences. The app's words, in every language it serves. */
        entries: readonly string[];
        /** After the kit's text: what sign-out removes beyond the tokens, what stays. */
        children?: ReactNode;
      }
    | {
        section: "legal_basis" | "rights";
        variant?: never;
        entries?: never;
        /** `legal_basis`: after the kit's paragraph (consent, where an app relies on
         *  it). `rights`: between the list of rights and the supervisory authorities
         *  (how to export, how to delete). A plain string keeps its line breaks and has
         *  its `{ref:key}` tokens resolved. */
        children?: ReactNode;
      }
    | {
        section: "disclaimer";
        /**
         * 0.32.0 (docs/billing-harmonization.md §8, legal decision 7): which disclaimer.
         * `non-commercial` (default) is the beta's "private, non-commercial project";
         * `commercial` is for an app that charges, sold through a Merchant of Record —
         * chosen per app, in the release that turns its billing on.
         */
        variant?: LegalDisclaimerVariant;
        entries?: never;
        children?: never;
      }
    | {
        section: Exclude<LegalKitSectionKey, "browser" | "legal_basis" | "rights" | "disclaimer">;
        variant?: never;
        entries?: never;
        children?: never;
      }
  );

/** 0.32.0: the imprint disclaimer's two texts — see {@link LegalKitSectionProps}. */
export type LegalDisclaimerVariant = "non-commercial" | "commercial";

/** The app's paragraph: a plain string as running text (line breaks kept, refs
 *  resolved), anything else as it is. */
function appPart(children: ReactNode): ReactNode {
  if (children === undefined || children === null || children === false) return null;
  if (typeof children === "string") return <LegalText key="app" text={children} />;
  return <Fragment key="app">{children}</Fragment>;
}

/**
 * One of the kit's sections (§4.3) — `<LegalKitSection section="warranty" />` — with its
 * heading, its `id` (the key: `/terms#warranty`) and, on a numbered page, its number.
 *
 * The words are the kit's, in the `legal` labels, filled in with the operator; an app
 * adds only what §4.2 gives it a slot for. Inside a {@link LegalPage} the page and the
 * operator come from it, so a page reads as its section list:
 *
 *     <LegalPage page="privacy" operator={OPERATOR}>
 *       <LegalKitSection section="controller" />
 *       <LegalSection key="data" heading={t("legal.privacy.data.title")} body={…} />
 *       <LegalKitSection section="legal_basis">{t("legal.privacy.legal_basis.app")}</LegalKitSection>
 *       …
 *     </LegalPage>
 *
 * A key that is not one of the page's kit sections throws, naming the ones that are: it
 * is a typo in code, not a state a user can reach.
 */
export function LegalKitSection(props: LegalKitSectionProps) {
  const { section, headingAs, labels: labelsProp } = props;
  const context = useContext(LegalPageContext);
  const labels = useLegalLabels(labelsProp);
  const kitLocale = useKitLocale();

  const page = props.page ?? context?.page ?? onlyPageOf(section);
  const kitSections = kitSectionsOf(page);
  if (!kitSections.includes(section)) {
    throw new Error(
      `LegalKitSection: "${section}" is not one of the kit's sections of the ${page} page (${kitSections.join(", ")}).`,
    );
  }
  const entry = (labels.sections[page] as Record<string, SectionLabels>)[section];
  const operator = props.operator ? legalOperatorText(props.operator, kitLocale) : context?.operator;
  const fill = (body: string | ((o: LegalOperatorText) => string)): string => {
    if (typeof body === "string") return body;
    if (!operator) {
      throw new Error(
        `LegalKitSection "${section}" names the operator: render it inside <LegalPage operator={…}>, or pass operator.`,
      );
    }
    if (section === "language" && !operator.bindingLanguage) {
      throw new Error(
        `LegalKitSection "language" names the binding language: give the operator a bindingLanguage ("de-CH").`,
      );
    }
    return body(operator);
  };

  const app = appPart(props.children);
  let parts: ReactNode[];
  if ("lead" in entry) {
    const lead = <LegalText key="lead" text={entry.lead} />;
    const tail = <LegalText key="tail" text={entry.tail} />;
    if (props.section === "browser") {
      const list =
        props.entries.length > 0 ? (
          <ul key="entries" className="list-disc space-y-1 ps-5">
            {props.entries.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : null;
      parts = [lead, list, tail, app];
    } else {
      // `rights`: the app's paragraph sits between the rights and the authorities.
      parts = [lead, app, tail];
    }
  } else {
    // The imprint's commercial disclaimer (0.32.0): its own body under the same title.
    const commercial =
      props.section === "disclaimer" && props.variant === "commercial"
        ? ((entry as LegalDisclaimerSectionLabels).commercial ??
          DEFAULT_LEGAL_LABELS.sections.impressum.disclaimer.commercial)
        : undefined;
    parts = [<LegalText key="body" text={commercial ?? fill(entry.body)} />, app];
  }

  return (
    <LegalSection id={section} heading={entry.title} headingAs={headingAs}>
      <div className="space-y-[1lh]">{parts}</div>
    </LegalSection>
  );
}

type SectionLabels = LegalTextSectionLabels | LegalOperatorSectionLabels | LegalFramedSectionLabels;

/** The one page a kit section key is on; `contact` is on two, so it needs the page. */
function onlyPageOf(section: string): LegalPageKey {
  const pages = PAGES.filter((p) => kitSectionsOf(p).includes(section));
  if (pages.length === 1) return pages[0];
  throw new Error(
    pages.length === 0
      ? `LegalKitSection: "${section}" is not one of the kit's sections.`
      : `LegalKitSection: "${section}" is on more than one page (${pages.join(", ")}) — render it inside a LegalPage, or pass page.`,
  );
}

// ── The page ──────────────────────────────────────────────────────────────────

export interface LegalPageProps {
  /** Which page: the title, the default notice, whether the sections are numbered. */
  page: LegalPageKey;
  /** Who runs the app — the values the kit's sections name. The same in every app's
   *  three pages; the kit holds none (§5). */
  operator: LegalOperator;
  /**
   * The sections, in reading order: {@link LegalKitSection}s and {@link LegalSection}s.
   *
   * They must be DIRECT children — or inside fragments, or in an array
   * (`SECTIONS.map(…)`). The page reads them before they render, to know every
   * section's number in advance: that is what lets a `{ref:key}` point forward
   * (keksdose's section 2 refers to section 10). A section wrapped in a component of the
   * app's own is invisible to that walk and renders unnumbered, with no key.
   */
  children: ReactNode;
  /** The app's public header — the one a signed-out visitor already sees (keksdose's
   *  `LandingHeader`, Kurvenschmiede's `AppTopBar` without the shell). */
  header?: ReactNode;
  /** Default: `<LegalFooter />` with this page marked. `null` for none. */
  footer?: ReactNode;
  /** The back link's target. Default `/`, which takes a signed-in user into the app and
   *  a signed-out one to the landing or sign-in page. */
  homeHref?: string;
  /** Default: the kit's beta notice on the imprint and the terms, its privacy notice on
   *  the privacy policy (§3.2). `null` for none. */
  notice?: ReactNode;
  /**
   * 0.28.1: switches the app to the operator's `bindingLanguage` — the button after the
   * translation note on a page read in another language. Without it the note stands
   * alone; the app's own language switcher is in its header anyway.
   */
  onShowBindingLanguage?: () => void;
  /** The language the operator's country is named in. Default: the `<UiKitProvider
   *  locale>`, else English. */
  locale?: string;
  /** The title's element. Default `h1`; `h2` for a page shown inside another (a
   *  preview), whose sections then take `h3`. */
  headingAs?: "h1" | "h2";
  /** `false` draws the column as a `<div>` instead of `<main>` — for a page embedded in
   *  one that has its own `<main>`. Default true. */
  landmark?: boolean;
  /** Default true: {@link useNoIndex}. `false` only where the page is not the page — a
   *  preview inside another page. */
  noIndex?: boolean;
  /** On the outermost element (a full-height column). */
  className?: string;
  /** The `legal` labels for this page and everything in it — sections, footer,
   *  checkbox — on top of the provider's. */
  labels?: LabelOverride<LegalLabels>;
}

interface FlatNode {
  node: ReactNode;
  /** A stable React key from the node's place in the tree the app wrote. */
  path: string;
}

/** The children as a flat list, arrays and fragments opened — the sections the page can
 *  see, in render order. */
function flatten(node: ReactNode, path: string, out: FlatNode[]): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (isValidElement(node)) {
    if (node.type === Fragment) {
      flatten((node.props as { children?: ReactNode }).children, path, out);
    } else {
      out.push({ node, path: path || "/" });
    }
    return;
  }
  if (typeof node === "object" && Symbol.iterator in node) {
    Array.from(node as Iterable<ReactNode>).forEach((child, i) => {
      const step = isValidElement(child) && child.key !== null ? `$${child.key}` : `#${i}`;
      flatten(child, `${path}/${step}`, out);
    });
    return;
  }
  out.push({ node, path: path || "/" });
}

/** A section the walk found: its key (`undefined` when it has none) and heading. */
function sectionOf(
  node: ReactNode,
  page: LegalPageKey,
  labels: LegalLabels,
): { key: string | undefined; heading: ReactNode } | null {
  if (!isValidElement(node)) return null;
  if (node.type === LegalKitSection) {
    const { section } = node.props as LegalKitSectionProps;
    const entry = (labels.sections[page] as Record<string, SectionLabels | undefined>)[section];
    return { key: section, heading: entry?.title ?? section };
  }
  if (node.type === LegalSection) {
    const props = node.props as LegalSectionProps;
    return { key: props.id ?? node.key ?? undefined, heading: props.heading };
  }
  return null;
}

/**
 * The page's sections, each in a slot that tells it its key and number, and the map a
 * `{ref:key}` is resolved from — built from the children BEFORE they render.
 */
function slotSections(
  children: ReactNode,
  page: LegalPageKey,
  labels: LegalLabels,
): { nodes: ReactNode[]; targets: Map<string, LegalRefTarget> } {
  const flat: FlatNode[] = [];
  flatten(children, "", flat);
  const numbered = LEGAL_SKELETON[page].numbered;
  const targets = new Map<string, LegalRefTarget>();
  let count = 0;
  const nodes = flat.map(({ node, path }) => {
    const section = sectionOf(node, page, labels);
    if (!section) return <Fragment key={path}>{node}</Fragment>;
    count += 1;
    const number = numbered ? count : undefined;
    if (section.key !== undefined) {
      if (targets.has(section.key)) {
        warnLegalOnce(`two sections of the ${page} page share the key "${section.key}"; {ref:${section.key}} names the first.`);
      } else {
        targets.set(section.key, { number, heading: section.heading });
      }
    }
    return (
      <LegalSlotContext.Provider key={path} value={{ id: section.key, number }}>
        {node}
      </LegalSlotContext.Provider>
    );
  });
  return { nodes, targets };
}

/**
 * A legal page — Imprint, Privacy Policy or Terms — in the frame every app uses (§3.2):
 * the app's public header, the kit's column (back link, title, notice, sections) and the
 * public footer. keksdose's `features/legal/legal-layout.tsx`, the reference: its
 * `LegalPage` drew exactly this around the kit's `LegalLayout`, and kastlan and
 * Kurvenschmiede each drew a different frame (an auth card, the signed-in app shell).
 * Signed-in users see the same frame: the pages are public and outside the app shell.
 *
 * What it adds to the column:
 * - the title, from `legal.titles`, and "← Back to home" pointing at `homeHref`;
 * - the default notice per page — the beta notice, or the privacy notice on the privacy
 *   policy, whose technical sections describe running code (§3.2, §7.3);
 * - numbers: the privacy and terms sections are "N. Title" in render order, the
 *   imprint's are not (§4.1). The titles in the catalogues carry no number, so a
 *   section added in the middle renumbers the rest instead of leaving them wrong;
 * - ids: every section's `id` is its key (`/privacy#rights`), which keeps
 *   Kurvenschmiede's deep links working;
 * - `{ref:key}` in a section's text becomes that section's number, linked — forward
 *   references included, since the page knows the order before any section renders
 *   (see `children` for what that asks of the tree);
 * - `useNoIndex()`.
 */
export function LegalPage({
  page,
  operator,
  children,
  header,
  footer,
  homeHref = "/",
  notice,
  onShowBindingLanguage,
  locale: localeProp,
  headingAs = "h1",
  landmark = true,
  noIndex = true,
  className,
  labels: labelsProp,
}: LegalPageProps) {
  useNoIndex(noIndex);
  const labels = useLegalLabels(labelsProp);
  const locale = useKitLocale(localeProp) ?? "en";
  // Not memoised: `countryName` keeps one `Intl.DisplayNames` per locale, so naming the
  // country again is a lookup, and the context is rebuilt with the children anyway.
  const operatorText = legalOperatorText(operator, locale);
  const overrides = useMemo<UiKitLabelOverrides | undefined>(
    () => (labelsProp ? { legal: labelsProp } : undefined),
    [labelsProp],
  );

  const { nodes, targets } = slotSections(children, page, labels);
  const context: LegalPageContextValue = {
    page,
    operator: operatorText,
    sectionHeading: headingAs === "h1" ? "h2" : "h3",
    targets,
  };
  const Main = landmark ? "main" : "div";
  const shownNotice =
    notice !== undefined ? notice : page === "privacy" ? labels.notice.privacy : labels.notice.beta;
  // 0.28.1 (Marcel): one language is binding and the lawyer reviews that one; a page read
  // in any other says so, with a way to the binding version.
  const translated =
    operator.bindingLanguage !== undefined && baseLanguage(operator.bindingLanguage) !== baseLanguage(locale);
  const translationNote = translated ? (
    <p className="text-sm text-[var(--text-secondary)]">
      {labels.translation.note(operatorText)}
      {onShowBindingLanguage && (
        <>
          {" "}
          <Button type="button" variant="link" size="sm" className="h-auto p-0 align-baseline" onClick={onShowBindingLanguage}>
            {labels.translation.show(operatorText)}
          </Button>
        </>
      )}
    </p>
  ) : undefined;

  return (
    <UiKitProvider labels={overrides}>
      <div className={cn("flex min-h-full flex-col", className)}>
        {header}
        <Main className="flex-1">
          <LegalPageContext.Provider value={context}>
            <LegalLayout
              back={
                <TextLink href={homeHref} icon={ArrowLeft}>
                  {labels.backHome}
                </TextLink>
              }
              title={labels.titles[page]}
              notice={shownNotice}
              translationNote={translationNote}
              headingAs={headingAs}
            >
              {nodes}
            </LegalLayout>
          </LegalPageContext.Provider>
        </Main>
        {footer === undefined ? <LegalFooter currentHref={LEGAL_HREFS[page]} /> : footer}
      </div>
    </UiKitProvider>
  );
}

// ── Terms acceptance (§3.4) ───────────────────────────────────────────────────

export interface LegalAcceptCheckboxProps
  extends Omit<CheckboxProps, "label" | "checked" | "onCheckedChange" | "required"> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Default `/terms`. */
  termsHref?: string;
  /** Default `/privacy`. */
  privacyHref?: string;
  labels?: LabelOverride<LegalLabels>;
  ref?: Ref<HTMLInputElement>;
}

/** `legal.accept` with its `{terms}` and `{privacy}` as links named by the page titles.
 *  Split, not interpolated: the text between the placeholders is the template's own,
 *  to the character — nothing is added around a link. */
function acceptLabel(labels: LegalLabels, termsHref: string, privacyHref: string): ReactNode[] {
  const template = labels.accept;
  for (const placeholder of ["{terms}", "{privacy}"]) {
    if (!template.includes(placeholder)) warnLegalOnce(`legal.accept has no ${placeholder}: "${template}".`);
  }
  return template
    .split(/(\{terms\}|\{privacy\})/)
    .filter((part) => part !== "")
    .map((part, i) =>
      part === "{terms}" ? (
        <TextLink key={i} href={termsHref} tone="primary">
          {labels.titles.terms}
        </TextLink>
      ) : part === "{privacy}" ? (
        <TextLink key={i} href={privacyHref} tone="primary">
          {labels.titles.privacy}
        </TextLink>
      ) : (
        part
      ),
    );
}

/**
 * The register page's "I accept the [Terms of Service] and the [Privacy Policy]" (§3.4):
 * keksdose's checkbox (features/auth/register-page.tsx), for every app.
 *
 * A REQUIRED kit `Checkbox` — not a Switch: a form answer that waits for the submit
 * button. The app keeps its submit disabled while it is unticked, so there is never a
 * failed attempt and no `error` to show. Nothing is sent to the backend: no stored
 * version, no re-acceptance (Marcel, §2.4).
 *
 * The label is ONE template, `legal.accept`, so a language puts the links where its
 * grammar needs them, articles included — fr "J’accepte les {terms} et la {privacy}",
 * it "Accetto le {terms} e l’{privacy}" with no space after the elided article. The link
 * texts are the page titles (`legal.titles`), as on the pages themselves.
 */
export function LegalAcceptCheckbox({
  checked,
  onCheckedChange,
  termsHref = LEGAL_HREFS.terms,
  privacyHref = LEGAL_HREFS.privacy,
  labels: labelsProp,
  ref,
  ...rest
}: LegalAcceptCheckboxProps) {
  const labels = useLegalLabels(labelsProp);
  return (
    <Checkbox
      {...rest}
      ref={ref}
      checked={checked}
      onCheckedChange={onCheckedChange}
      required
      label={acceptLabel(labels, termsHref, privacyHref)}
    />
  );
}
