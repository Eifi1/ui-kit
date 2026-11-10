import { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";
import {
  LegalLayout,
  LegalSection,
  TextLink,
  ToggleGroup,
  Button,
  ConsentAgainNotice,
  LegalAcceptCheckbox,
  LegalChangeNotice,
  LegalKitSection,
  LegalLinks,
  LegalPage,
  UiKitProvider,
  removeStored,
} from "@eifi1/ui-kit";
import type {
  KitLinkComponent,
  LegalChangeAnnouncement,
  LegalDisclaimerVariant,
  LegalOperator,
  LegalPageKey,
} from "@eifi1/ui-kit";
import { addDaysIso, todayIso } from "@eifi1/ui-kit/dates";
import { Example, Note, code } from "../lib/section";

/**
 * The legal pages — LegalLayout, LegalPage, LegalAcceptCheckbox, LegalLinks and the
 * notices beside them, ConsentAgainNotice and LegalChangeNotice — in one
 * module, rendered as one section of the Sign-in & account page. Filed by release until
 * the refactor audit of 2026-10 (DOC-8): legal-019, legal-028. Each specimen keeps its
 * label, so its anchor and its search entry hold, and says since which release in a Note.
 */

/* ── since 0.19 ─────────────────────────────────────────────────────────── */

/**
 * The legal pages' shell (0.19): the apps' copies,
 * once, for every app. The texts here are placeholders; an app's are its own.
 */

// Every link points at this page, so the demo never leaves it; in an app each is a route.
const HERE = "/auth-account";

const LINKS = [
  { href: HERE, label: "Imprint" },
  { href: `${HERE}?legal=privacy`, label: "Privacy Policy" },
  { href: `${HERE}?legal=terms`, label: "Terms" },
];

function Legal019Demo() {
  const [notice, setNotice] = useState<"draft" | "none">("draft");
  return (
    <Example
      label="LegalLayout — Imprint, Privacy Policy, Terms"
      hint="a content column inside the app's own chrome; the texts stay the app's"
    >
      <div className="flex flex-col gap-3">
        <ToggleGroup
          aria-label="Notice"
          value={notice}
          onChange={(v) => setNotice(v as "draft" | "none")}
          options={[
            { value: "draft", label: "Draft notice" },
            { value: "none", label: "No notice" },
          ]}
        />
        <div className="rounded-lg border border-subtle">
          <LegalLayout
            headingAs="h2"
            className="py-6"
            title="Imprint"
            back={
              <TextLink href={HERE} icon={ArrowLeft}>
                Back to the start page
              </TextLink>
            }
            notice={
              notice === "draft" ? "Closed beta: these texts are a draft and await a lawyer's review." : undefined
            }
            links={LINKS}
            currentHref={HERE}
          >
            <LegalSection
              headingAs="h3"
              heading="Provider"
              body={"Acme Books GmbH\nExample Street 1\n8000 Zurich, Switzerland"}
            />
            <LegalSection headingAs="h3" heading="Contact" body={"hello@acme-books.example\n+41 00 000 00 00"} />
            <LegalSection headingAs="h3" id="legal-demo-responsible" heading="Responsible for content">
              Erika Muster, address as above. See also the{" "}
              <TextLink href={`${HERE}?legal=privacy`}>Privacy Policy</TextLink>.
            </LegalSection>
          </LegalLayout>
        </div>
        <Note>
          {code("LegalLayout")} is a column, not a page: one app puts it inside its landing header and footer, another
          inside {code('<AuthLayout width="wide" card={false}>')} — whose footer then takes{" "}
          {code("<LegalLinks links currentHref nav={false} />")}, since AuthLayout names its own {code("<nav>")}.{" "}
          {code("notice")} is per page (a {code('role="note"')} banner, not an alert); {code("LegalSection")} keeps a
          translation&apos;s line breaks in {code("body")} and takes children for links. Review the texts under the{" "}
          {code("legal")} area of the translation review.
        </Note>
      </div>
    </Example>
  );
}

/* ── since 0.28 ─────────────────────────────────────────────────────────── */

/**
 * The legal pages of 0.28 (docs/legal-harmonization.md): one frame, the shared wording
 * written by the kit and filled in with the operator, numbering and `{ref:key}`, the
 * public footer and the terms checkbox. Use the device preview for the phone.
 *
 * The operator is SYNTHETIC — the kit holds no personal data, its showcase neither — and
 * the app sections (`data`, `retention`, the browser list, …) are a made-up app's.
 */

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

const HERE_028 = "/auth-account";

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
            href={`#${HERE_028}`}
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
    <div className="flex items-center justify-between gap-3 border-b border-subtle bg-surface px-4 py-3">
      <span className="text-sm font-semibold text-primary">Example App</span>
      <span className="text-xs text-muted">the app&apos;s public header</span>
    </div>
  );
}

/** Whether the made-up app takes payment: the disclaimer, the browser-storage section and
 *  the changes clause switch to their commercial texts together (`variant="commercial"`). */
type Billing = "off" | "on";
const variantOf = (billing: Billing): LegalDisclaimerVariant => (billing === "on" ? "commercial" : "non-commercial");

// Elements, not components: the page reads its sections out of its children before they
// render, through fragments and arrays but not through a component of the app's own —
// `<PrivacySections />` would hide them, and nothing would be numbered. A plain function
// that RETURNS the elements (`impressum(billing)`) is fine: the page sees what it returned.
const impressum = (billing: Billing) => (
  <>
    <LegalKitSection section="operator" />
    <LegalKitSection section="contact" />
    <LegalKitSection section="disclaimer" variant={variantOf(billing)} />
    <LegalSection
      key="credits"
      heading="Credits"
      body="The chart palette is anyplot's “Imprint” scheme (anyplot.ai)."
    />
  </>
);

const privacy = (billing: Billing) => (
  <>
    <LegalKitSection section="controller" />
    <LegalSection
      key="data"
      heading="What data we process"
      body={
        "Account: email address, display name, hashed password.\n\nReceipts you upload, for as long as section {ref:retention} says."
      }
    />
    <LegalKitSection section="legal_basis">There is no tracking, no analytics and no advertising.</LegalKitSection>
    <LegalSection
      key="third_parties"
      heading="Hosting and processors"
      body="The app and its database run on Example Cloud in the EU, which acts as a processor on our behalf."
    />
    <LegalKitSection
      section="browser"
      variant={variantOf(billing)}
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
      {
        "Export your data at any time under Settings ▸ Export. For everything else, a message to the address below is enough."
      }
    </LegalKitSection>
    <LegalKitSection section="contact" />
  </>
);

const terms = (billing: Billing) => (
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
    <LegalKitSection section="changes" variant={variantOf(billing)} />
    <LegalKitSection section="language" />
    <LegalKitSection section="law" />
  </>
);

const SECTIONS: Record<LegalPageKey, (billing: Billing) => React.JSX.Element> = {
  impressum,
  privacy,
  terms,
};

/** 0.51.4: the app's plain-language points; the heading and the "only the full text binds"
 *  line are the kit's. */
const SUMMARY: Partial<Record<LegalPageKey, string[]>> = {
  privacy: [
    "We keep what you enter to run the service, and nothing to track you.",
    "You can export or delete your data at any time (section {ref:rights}).",
  ],
  terms: [
    "Example App is a free closed beta, without warranty: keep your own backups.",
    "We announce a material change 30 days ahead (section {ref:changes}).",
  ],
};

function Legal028Demo() {
  const [page, setPage] = useState<LegalPageKey>("privacy");
  const [billing, setBilling] = useState<Billing>("off");
  const link = usePreviewLink(setPage);
  const box = useRef<HTMLDivElement>(null);
  useInPageAnchors(box);
  return (
    <Example
      label="LegalPage — the three pages, the kit's wording, numbers and references"
      hint="an app's frame; the shared sections are the kit's, the rest the app's"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
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
          <ToggleGroup<Billing>
            aria-label="Billing"
            value={billing}
            onChange={setBilling}
            options={[
              { value: "off", label: "Billing off" },
              { value: "on", label: "Billing on" },
            ]}
          />
        </div>
        <div ref={box} className="overflow-hidden rounded-lg border border-subtle">
          <UiKitProvider linkComponent={link}>
            {/* An app renders it on its own route: an h1, a <main>, and noindex. A
                preview inside this page is none of those. */}
            <LegalPage
              page={page}
              operator={OPERATOR}
              header={<DemoHeader />}
              updated="2026-10-29"
              summary={SUMMARY[page]}
              homeHref={HERE_028}
              headingAs="h2"
              landmark={false}
              noIndex={false}
            >
              {SECTIONS[page](billing)}
            </LegalPage>
          </UiKitProvider>
        </div>
        <Note>
          {code('<LegalPage page="privacy" operator={OPERATOR} header={<AppHeader />}>')} draws the app&apos;s header,
          &ldquo;← Back to home&rdquo;, the title, the as-of line from {code('updated="2026-10-29"')} (0.51.3, the date
          written out in the page&apos;s language), the page&apos;s notice from the kit&apos;s labels, the app&apos;s{" "}
          {code("summary")} points under the kit&apos;s &ldquo;In short&rdquo; (0.51.4), the sections, and{" "}
          {code("<LegalFooter />")} with the page marked. {code('<LegalKitSection section="rights">')} renders a shared
          section in the page&apos;s language, filled in with the operator (the country named by {code("Intl")}); its
          children are the app&apos;s paragraph where the contract gives it one. The privacy and terms sections are
          numbered in render order and each section&apos;s id is its key ({code("/privacy#rights")}).{" "}
          {code("{ref:retention}")} in an app text becomes that section&apos;s number, linked — section 2 points forward
          to section 7. Sections must be direct children of the page, or inside fragments or arrays: the page reads the
          order before anything renders. The page also calls {code("useNoIndex()")}; this preview passes{" "}
          {code("noIndex={false}")}. With billing on, the imprint&apos;s disclaimer, the privacy policy&apos;s browser
          section and the terms&apos; changes clause take {code('variant="commercial"')}: a commercial service sold
          through a Merchant of Record, where the checkout&apos;s window stores its own entries (on Paddle&apos;s
          domain, under Paddle&apos;s privacy policy), and the refund of a paid period beyond a change&apos;s effective
          date — words an app shows only once it takes payment.
        </Note>
      </div>
    </Example>
  );
}

function LegalAccept028Demo() {
  const [accepted, setAccepted] = useState(false);
  const [page, setPage] = useState<LegalPageKey | null>(null);
  const [age, setAge] = useState<"none" | "16">("none");
  const link = usePreviewLink(setPage);
  return (
    <Example
      label="LegalAcceptCheckbox and LegalLinks — sign-up and the account menu"
      hint="one template with two links; the links row with its separators"
    >
      <UiKitProvider linkComponent={link}>
        <div className="flex max-w-sm flex-col gap-4">
          <ToggleGroup<"none" | "16">
            aria-label="Minimum age"
            value={age}
            onChange={setAge}
            options={[
              { value: "none", label: "No minimum age" },
              { value: "16", label: "minAge 16" },
            ]}
          />
          <LegalAcceptCheckbox
            checked={accepted}
            onCheckedChange={setAccepted}
            operator={age === "16" ? { ...OPERATOR, minAge: 16 } : OPERATOR}
          />
          <Button disabled={!accepted}>Create account</Button>
          {page !== null && <p className="text-xs text-muted">In an app, that link opens {code(`/${page}`)}.</p>}
          <div className="rounded-md border border-subtle p-3">
            <p className="mb-2 text-xs text-muted">An account menu&apos;s footer:</p>
            <LegalLinks nav={false} />
          </div>
        </div>
      </UiKitProvider>
      <Note>
        {code("<LegalAcceptCheckbox checked onCheckedChange />")} is required and never an error: the submit stays
        disabled until it is ticked, and nothing is sent to the server. Its label is one template,{" "}
        {code("I accept the {terms} and the {privacy}")}, so a language places the links and their articles itself —
        Italian writes {code("e l’{privacy}")} with no space, and none is added. Given {code("operator={OPERATOR}")}{" "}
        (which {code("RegisterForm")} hands on) with {code("minAge: 16")}, the age and the terms are one tick:{" "}
        {code("I am at least 16 years old and accept …")}. {code("<LegalLinks />")} needs no {code("links")} any more:
        the three routes with the kit&apos;s labels and {code("·")} separators; {code("nav={false}")} inside a menu that
        is a named nav already.
      </Note>
    </Example>
  );
}

/** The subject's words are the app's: a price pool's, as keksdose asks it. */
const CONSENT_COPY = {
  title: "Price sharing has changed — please agree again",
  intro:
    "What sharing covers has grown, so this budget is asked again before anything new is shared. Until then, nothing new leaves it.",
  changes: [
    "The shop: its chain and, where we can place it, its own postcode. Never your own address.",
    "The shared prices move to a public page, each from at least 10 households.",
  ],
};

function ConsentAgainDemo() {
  const [frame, setFrame] = useState<"card" | "banner">("card");
  const [owner, setOwner] = useState(true);
  const [answer, setAnswer] = useState<"open" | "agreed" | "not now">("open");
  return (
    <Example
      label="ConsentAgainNotice — a consent asked again after its text changed"
      hint="the card where it stays until answered; the banner where the reader is about to do what waits for it"
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <ToggleGroup<"card" | "banner">
          aria-label="frame"
          value={frame}
          onChange={(value) => {
            setFrame(value);
            setAnswer("open");
          }}
          options={[
            { value: "card", label: "card" },
            { value: "banner", label: "banner" },
          ]}
        />
        {frame === "card" && (
          <ToggleGroup<"owner" | "guest">
            aria-label="reader"
            value={owner ? "owner" : "guest"}
            onChange={(value) => setOwner(value === "owner")}
            options={[
              { value: "owner", label: "may answer" },
              { value: "guest", label: "may not" },
            ]}
          />
        )}
      </div>
      <div className="max-w-xl">
        {answer !== "open" ? (
          <p className="text-sm text-muted">
            {answer === "agreed" ? "Agreed." : "Not now: the app remembers it, and asks again later."}{" "}
            <Button size="sm" variant="secondary" onClick={() => setAnswer("open")}>
              Ask again
            </Button>
          </p>
        ) : frame === "card" ? (
          <ConsentAgainNotice
            frame="card"
            {...CONSENT_COPY}
            headingAs="h4"
            wording={{
              before: ["Every receipt you confirm sends the shop's chain — the chain, never the branch."],
              now: ["Every receipt you confirm sends the shop's chain and, where we can place it, its postcode."],
            }}
            onAgree={owner ? () => setAnswer("agreed") : undefined}
            note={owner ? undefined : "Only this budget's owner can agree. Until they do, it shares nothing new."}
          />
        ) : (
          <ConsentAgainNotice
            frame="banner"
            title="Price sharing now covers more."
            intro="New receipts are not shared until you agree."
            changes={CONSENT_COPY.changes}
            wordingLink={<TextLink href={HERE}>Full wording in Settings ▸ Data</TextLink>}
            onAgree={() => setAnswer("agreed")}
            onNotNow={() => setAnswer("not now")}
          />
        )}
      </div>
      <Note>
        The kit draws the frame and says Agree, Not now, the two disclosures and Until now / From now on (the{" "}
        {code("consentAgain")} labels); the title, the intro, the list and the wording are the app&apos;s. Never a
        modal, and Not now is not a refusal: the banner does not hide itself, the app remembers the ×. The old text is a{" "}
        {code("<del>")} and the new an {code("<ins>")}, each led by a hidden &ldquo;Removed:&rdquo; /
        &ldquo;Added:&rdquo;. Agree {code("commit")}s, so a write lock (the demo, a lapsed plan, offline) disables it
        with its reason.
      </Note>
    </Example>
  );
}

/** Where this specimen keeps its dismissals: the showcase's own key, not the kit's default. */
const CHANGE_KEY = "showcase.legalChange.dismissed";

function LegalChangeNoticeDemo() {
  // The made-up app's `GET /api/v1/legal/changes`, dated from today so the specimen never
  // runs out of date: the terms in 30 days (the notice period), the privacy policy in 45.
  const [announcements] = useState<LegalChangeAnnouncement[]>(() => {
    const today = todayIso();
    return [
      { page: "terms", effective: addDaysIso(today, 30) },
      { page: "privacy", effective: addDaysIso(today, 45) },
    ];
  });
  const [answer, setAnswer] = useState<"two" | "none">("two");
  const [round, setRound] = useState(0);
  const [page, setPage] = useState<LegalPageKey | null>(null);
  const link = usePreviewLink(setPage);
  const showAgain = () => {
    for (const a of announcements) removeStored(`${CHANGE_KEY}.${a.page}.${a.effective}`);
    setRound((r) => r + 1);
  };
  return (
    <Example
      label="LegalChangeNotice — an announced change to the terms or the privacy policy"
      hint="a banner per announcement until it takes effect; dismissed per page and date"
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ToggleGroup<"two" | "none">
          aria-label="The server's answer"
          value={answer}
          onChange={setAnswer}
          options={[
            { value: "two", label: "Two announcements" },
            { value: "none", label: "An empty list" },
          ]}
        />
        <Button size="sm" variant="secondary" onClick={showAgain}>
          Show the dismissed again
        </Button>
      </div>
      <div className="flex max-w-xl flex-col gap-3">
        <UiKitProvider linkComponent={link}>
          <LegalChangeNotice
            key={round}
            announcements={answer === "two" ? announcements : []}
            storageKey={CHANGE_KEY}
          />
        </UiKitProvider>
        {answer === "none" && <p className="text-sm text-muted">Nothing announced: nothing rendered, no gap.</p>}
        {page !== null && <p className="text-xs text-muted">In an app, that link opens {code(`/${page}`)}.</p>}
      </div>
      <Note>
        {code("<LegalChangeNotice announcements={data} />")} takes the list {code("GET /api/v1/legal/changes")} answers,{" "}
        {code('{ page: "terms" | "privacy", effective: "YYYY-MM-DD", href? }')} each — server-kit builds the same shape
        — and shows a banner per announcement until its effective date has passed, that day included: the date in the
        reader&apos;s language, and a link to the new text ({code("href")}, else the page&apos;s own route). The ×
        dismisses it on this device, remembered per page and date ({code("storageKey")}), so the next change is news
        again. Never a modal and never the focus: the app goes on. It is the in-app half of the 30 days&apos; notice the
        terms promise; the email is server-kit&apos;s terms-change mail.
      </Note>
    </Example>
  );
}

/* ── the page's section ───────────────────────────────────────────────────── */

/** Every legal-page specimen, in the order the releases added them. */
export function LegalDemo() {
  return (
    <>
      <Legal019Demo />
      <Legal028Demo />
      <LegalAccept028Demo />
      <ConsentAgainDemo />
      <LegalChangeNoticeDemo />
    </>
  );
}
