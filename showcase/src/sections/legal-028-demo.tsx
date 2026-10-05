import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import {
  Button,
  LegalAcceptCheckbox,
  LegalKitSection,
  LegalLinks,
  LegalPage,
  LegalSection,
  ToggleGroup,
  UiKitProvider,
} from "@eifi1/ui-kit";
import type { KitLinkComponent, LegalOperator, LegalPageKey } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * The legal pages of 0.28 (docs/legal-harmonization.md): one frame, the shared wording
 * written by the kit and filled in with the operator, numbering and `{ref:key}`, the
 * public footer and the terms checkbox. Use the device preview for the phone.
 *
 * The operator is SYNTHETIC — the kit holds no personal data, its showcase neither — and
 * the app sections (`data`, `retention`, the browser list, …) are a made-up app's.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

const OPERATOR: LegalOperator = {
  name: "Example Operator",
  postalCode: "0000",
  city: "Example Town",
  region: "EX",
  country: "CH",
  email: "legal@example.com",
  // 0.28.1: German is binding, so the English preview shows the translation note.
  bindingLanguage: "de-CH",
};

const HERE = "/auth-account";
const PAGE_OF: Readonly<Record<string, LegalPageKey>> = {
  "/impressum": "impressum",
  "/privacy": "privacy",
  "/terms": "terms",
};

/**
 * The app's three routes, played by this preview: a kit link to `/impressum`,
 * `/privacy` or `/terms` (the footer's, the checkbox's) switches the page shown here
 * instead of leaving the showcase; any other in-app link is the showcase's router link.
 * An app needs none of this — its router has the routes.
 */
function usePreviewLink(show: (page: LegalPageKey) => void): KitLinkComponent {
  return useMemo<KitLinkComponent>(
    () =>
      function PreviewLink({ href, onClick, children, ...rest }) {
        const page = PAGE_OF[href];
        if (page === undefined) {
          return (
            <Link to={href} onClick={onClick} {...rest}>
              {children}
            </Link>
          );
        }
        return (
          <a
            href={`#${HERE}`}
            {...rest}
            onClick={(event) => {
              onClick?.(event);
              event.preventDefault();
              show(page);
            }}
          >
            {children}
          </a>
        );
      },
    [show],
  );
}

/**
 * Under the showcase's HashRouter the URL's `#` is the route, so a plain `#retention` (a
 * resolved `{ref:retention}`) would be read as the page "/retention". In an app with a
 * browser router it is an ordinary in-page link; here the click scrolls instead.
 */
function useInPageAnchors(box: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = box.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a");
      const href = anchor?.getAttribute("href") ?? "";
      if (!href.startsWith("#") || href.startsWith("#/")) return;
      event.preventDefault();
      root.querySelector(`[id="${CSS.escape(href.slice(1))}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [box]);
}

function DemoHeader() {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3">
      <span className="text-sm font-semibold text-[var(--text-primary)]">Example App</span>
      <span className="text-xs text-[var(--text-muted)]">the app&apos;s public header</span>
    </div>
  );
}

// Module-level elements, not components: the page reads its sections out of its
// children before they render, through fragments and arrays but not through a component
// of the app's own — `<PrivacySections />` would hide them, and nothing would be numbered.
const IMPRESSUM = (
  <>
    <LegalKitSection section="operator" />
    <LegalKitSection section="contact" />
    <LegalKitSection section="disclaimer" />
    <LegalSection key="credits" heading="Credits" body="The chart palette is Paul Tol's “Muted” scheme." />
  </>
);

const PRIVACY = (
  <>
    <LegalKitSection section="controller" />
    <LegalSection
      key="data"
      heading="What data we process"
      body={"Account: email address, display name, hashed password.\n\nReceipts you upload, for as long as section {ref:retention} says."}
    />
    <LegalKitSection section="legal_basis">There is no tracking, no analytics and no advertising.</LegalKitSection>
    <LegalSection
      key="third_parties"
      heading="Hosting and processors"
      body="The app and its database run on Example Cloud in the EU, which acts as a processor on our behalf."
    />
    <LegalKitSection
      section="browser"
      entries={["your sign-in tokens", "the language and theme you picked", "error reports, until they are sent"]}
    >
      Signing out also removes the offline copy of your data.
    </LegalKitSection>
    <LegalSection key="transfers" heading="International data transfers" body="Your data stays in the EU." />
    <LegalSection
      key="retention"
      heading="Retention and deletion"
      body="Your data stays for as long as your account exists. To delete the account, write to the address in section {ref:contact}."
    />
    <LegalKitSection section="rights">
      {"Export your data at any time under Settings ▸ Export. For everything else, a message to the address below is enough."}
    </LegalKitSection>
    <LegalKitSection section="contact" />
  </>
);

const TERMS = (
  <>
    <LegalSection
      key="scope"
      heading="Scope"
      body="These terms govern the use of Example App, a demo, operated by Example Operator. It is currently provided free of charge as a closed beta, by invitation only."
    />
    <LegalSection
      key="no_advice"
      heading="No advice"
      body="Example App does not give advice of any kind. You are responsible for the decisions you make with it."
    />
    <LegalKitSection section="warranty" />
    <LegalKitSection section="liability" />
    <LegalKitSection section="changes" />
    <LegalKitSection section="language" />
    <LegalKitSection section="law" />
  </>
);

const SECTIONS: Record<LegalPageKey, React.JSX.Element> = { impressum: IMPRESSUM, privacy: PRIVACY, terms: TERMS };

export function Legal028Demo() {
  const [page, setPage] = useState<LegalPageKey>("privacy");
  const link = usePreviewLink(setPage);
  const box = useRef<HTMLDivElement>(null);
  useInPageAnchors(box);
  return (
    <Example
      label="LegalPage — the three pages, the kit's wording, numbers and references"
      hint="keksdose's frame; the shared sections are the kit's, the rest the app's"
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Page"
          value={page}
          onChange={(v) => setPage(v as LegalPageKey)}
          options={[
            { value: "impressum", label: "Imprint" },
            { value: "privacy", label: "Privacy Policy" },
            { value: "terms", label: "Terms" },
          ]}
        />
        <div ref={box} className="overflow-hidden rounded-lg border border-[var(--border)]">
          <UiKitProvider linkComponent={link}>
            {/* An app renders it on its own route: an h1, a <main>, and noindex. A
                preview inside this page is none of those. */}
            <LegalPage
              page={page}
              operator={OPERATOR}
              header={<DemoHeader />}
              homeHref={HERE}
              headingAs="h2"
              landmark={false}
              noIndex={false}
            >
              {SECTIONS[page]}
            </LegalPage>
          </UiKitProvider>
        </div>
        <Note>
          {code('<LegalPage page="privacy" operator={OPERATOR} header={<AppHeader />}>')} draws the app&apos;s header,
          &ldquo;← Back to home&rdquo;, the title and the page&apos;s notice from the kit&apos;s labels, the sections, and{" "}
          {code("<LegalFooter />")} with the page marked. {code('<LegalKitSection section="rights">')} renders a shared
          section in the page&apos;s language, filled in with the operator (the country named by {code("Intl")}); its
          children are the app&apos;s paragraph where the contract gives it one. The privacy and terms sections are
          numbered in render order and each section&apos;s id is its key ({code("/privacy#rights")}).{" "}
          {code("{ref:retention}")} in an app text becomes that section&apos;s number, linked — section 2 points
          forward to section 7. Sections must be direct children of the page, or inside fragments or arrays: the page
          reads the order before anything renders. The page also calls {code("useNoIndex()")}; this preview passes{" "}
          {code("noIndex={false}")}.
        </Note>
      </div>
    </Example>
  );
}

export function LegalAccept028Demo() {
  const [accepted, setAccepted] = useState(false);
  const [page, setPage] = useState<LegalPageKey | null>(null);
  const link = usePreviewLink(setPage);
  return (
    <Example
      label="LegalAcceptCheckbox and LegalLinks — sign-up and the account menu"
      hint="one template with two links; the links row with its separators"
    >
      <UiKitProvider linkComponent={link}>
        <div className="flex max-w-sm flex-col gap-4">
          <LegalAcceptCheckbox checked={accepted} onCheckedChange={setAccepted} />
          <Button disabled={!accepted}>Create account</Button>
          {page !== null && (
            <p className="text-xs text-[var(--text-muted)]">
              In an app, that link opens {code(`/${page}`)}.
            </p>
          )}
          <div className="rounded-md border border-[var(--border)] p-3">
            <p className="mb-2 text-xs text-[var(--text-muted)]">An account menu&apos;s footer:</p>
            <LegalLinks nav={false} />
          </div>
        </div>
      </UiKitProvider>
      <Note>
        {code("<LegalAcceptCheckbox checked onCheckedChange />")} is required and never an error: the submit stays
        disabled until it is ticked, and nothing is sent to the server. Its label is one template,{" "}
        {code("I accept the {terms} and the {privacy}")}, so a language places the links and their articles itself —
        Italian writes {code("e l’{privacy}")} with no space, and none is added. {code("<LegalLinks />")} needs no{" "}
        {code("links")} any more: the three routes with the kit&apos;s labels and {code("·")} separators;{" "}
        {code("nav={false}")} inside a menu that is a named nav already.
      </Note>
    </Example>
  );
}
