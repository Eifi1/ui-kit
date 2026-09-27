import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  Cloud,
  FileText,
  Gauge,
  KeyRound,
  LayoutGrid,
  Receipt,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  ActionCard,
  Breadcrumbs,
  Button,
  ButtonGroup,
  ButtonGroupLink,
  List,
  ListItem,
  TextLink,
  ToggleGroup,
  useKitLink,
} from "@eifi1/ui-kit";
import type { ActionCardIconTone, TextLinkTone, TextLinkUnderline } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row, Stage } from "../lib/section";

/**
 * LINKS (0.12): the provider's `linkComponent` — the app's router link, set once — and
 * everything that draws a link through it: TextLink, Button `href`, ActionCard `href`,
 * and the older ListItem / Breadcrumbs / ButtonGroupLink, which no longer need a
 * `renderLink` each.
 *
 * Most links here go to `/links?via=…` — this page again, with a query — so following
 * one keeps the reader here and the readout shows that the router handled it (no reload,
 * the hash changed). A few go to another page, which is the ordinary case.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** The `?via=` of the current location — which link was last followed. */
function useVia(): string {
  const { search } = useLocation();
  return new URLSearchParams(search).get("via") ?? "—";
}

/**
 * Reads the rendered `href` of every `<a>` under the box after each render, so the
 * page shows what each component actually drew: a router link in a HashRouter writes
 * `#/links?…`, a plain `<a>` keeps the path it was given.
 */
function useRenderedHrefs(deps: unknown[]) {
  const box = useRef<HTMLDivElement>(null);
  const [hrefs, setHrefs] = useState<Array<[string, string]>>([]);
  useEffect(() => {
    const anchors = [...(box.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    setHrefs(
      anchors.map((a) => [
        a.dataset.demo ?? (a.textContent ?? "?").trim().slice(0, 32),
        a.getAttribute("href") ?? "(no href)",
      ]),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { box, hrefs };
}

/* ── The provider's linkComponent ─────────────────────────────────────────── */

/** A link of the app's own that follows the same rule as the kit's: the provider's
 *  router link when there is one, else a plain `<a>`. */
function OwnRowLink({ href, children }: { href: string; children: ReactNode }) {
  const kitLink = useKitLink();
  const className = "text-sm text-[var(--brand)] underline underline-offset-2";
  // Called as a function, as the kit does: the provider's link is a render function,
  // and naming it as a JSX tag here would be a component created during render.
  return kitLink ? (
    kitLink({ href, className, children, "data-demo": "useKitLink()" } as Parameters<typeof kitLink>[0])
  ) : (
    <a href={href} className={className} data-demo="useKitLink()">
      {children}
    </a>
  );
}

function ProviderLink() {
  const via = useVia();
  const { box, hrefs } = useRenderedHrefs([via]);
  return (
    <Example
      label="UiKitProvider linkComponent — the router link, set once"
      hint="no renderLink on any of these; they route through the showcase's HashRouter"
    >
      <div ref={box} className="space-y-4">
        <Row>
          <TextLink href="/links?via=TextLink" data-demo="TextLink">
            TextLink
          </TextLink>
          <ButtonGroup>
            <ButtonGroupLink href="/links?via=ButtonGroupLink" data-demo="ButtonGroupLink">
              ButtonGroupLink
            </ButtonGroupLink>
            <ButtonGroupLink href="/buttons" data-demo="ButtonGroupLink → /buttons">
              Buttons page
            </ButtonGroupLink>
          </ButtonGroup>
          <Button href="/links?via=Button" variant="secondary" size="sm" data-demo="Button href">
            Button href
          </Button>
          <OwnRowLink href="/links?via=useKitLink">useKitLink()</OwnRowLink>
        </Row>
        <Breadcrumbs
          items={[
            { label: "Data display", href: "/data-display" },
            { label: "Buttons", href: "/buttons" },
            { label: "Links" },
          ]}
        />
        <List aria-label="Rows that are links">
          <ListItem
            title="ListItem with href"
            subtitle="follows /links?via=ListItem"
            icon={FileText}
            href="/links?via=ListItem"
            data-demo="ListItem"
          />
          <ListItem
            title="ListItem with its own renderLink"
            subtitle="renderLink wins over the provider — it adds ?own=1"
            icon={LayoutGrid}
            href="/links?via=ListItem-own"
            renderLink={({ href, ...p }) => <Link to={`${href}&own=1`} {...p} data-demo="ListItem renderLink" />}
          />
          <ListItem
            title="ListItem external"
            subtitle="an absolute URL never goes to the router"
            icon={BookOpen}
            href="https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a"
            external
            data-demo="ListItem external"
          />
        </List>
        <OutTable rows={[["last link followed (?via=)", via], ...hrefs.map(([k, v]) => [`${k} → href`, v] as [string, string])]} />
      </div>
      <div className="mt-3">
        <Note>
          The showcase hands its {code("<UiKitProvider>")} a {code("linkComponent")} —{" "}
          {code("({ href, ...p }) => <Link to={href} {...p} />")} with react-router&apos;s {code("Link")} — once, in
          showcase.tsx. Every kit link below it now routes: the hrefs above read {code("#/links?…")} because the
          HashRouter&apos;s {code("Link")} drew them, and following one changes the hash without reloading the page
          (the {code("?via=")} readout updates in place). A component&apos;s own {code("renderLink")} still wins — the
          second row&apos;s link carries {code("&own=1")}, which only its renderLink adds — and an external href is
          always a plain {code("<a>")}. {code("useKitLink()")} hands the same component to an app&apos;s own links.
        </Note>
      </div>
    </Example>
  );
}

/* ── TextLink ─────────────────────────────────────────────────────────────── */

const TONES: TextLinkTone[] = ["brand", "muted", "danger", "inherit"];
const UNDERLINES: TextLinkUnderline[] = ["hover", "always", "none"];

function TextLinkTones() {
  const [underline, setUnderline] = useState<TextLinkUnderline>("hover");
  return (
    <Example label="TextLink — tones and underline" hint="brand · muted · danger · inherit; hover · always · none">
      <Row className="mb-3">
        <span className="text-xs text-[var(--text-muted)]">underline</span>
        <ToggleGroup<TextLinkUnderline>
          aria-label="Underline"
          size="sm"
          value={underline}
          onChange={setUnderline}
          options={UNDERLINES.map((u) => ({ value: u, label: u }))}
        />
      </Row>
      <div className="space-y-2">
        {TONES.map((tone) => (
          <p key={tone} className="text-sm text-[var(--success)]">
            <span className="font-mono text-xs text-[var(--text-muted)]">{tone}: </span>
            <span className="text-[var(--text-primary)]">Read the </span>
            <TextLink href={`/links?via=tone-${tone}`} tone={tone} underline={underline}>
              {tone === "danger" ? "leave this group" : "terms of service"}
            </TextLink>
            <span className="text-[var(--text-primary)]"> before you continue.</span>
          </p>
        ))}
      </div>
      <div className="mt-3">
        <Note>
          The paragraph around each link is green, so {code('tone="inherit"')} visibly takes its surroundings&apos;
          colour. {code('underline="always"')} is the one for a link inside prose, where colour must not be the only
          mark; {code('"none"')} where the context already says link (a footer nav).
        </Note>
      </div>
    </Example>
  );
}

function TextLinkKinds() {
  const via = useVia();
  const [rowClicks, setRowClicks] = useState(0);
  const [section, setSection] = useState<"privacy" | "terms" | "imprint">("terms");
  return (
    <Example
      label="TextLink — external, stopPropagation, current and icon"
      hint="a link leaving the app, a link in a clickable row, the current page of a set, a back link"
    >
      <div className="space-y-4 text-sm text-[var(--text-primary)]">
        <p>
          Source:{" "}
          <TextLink href="https://www.destatis.de/" external underline="always">
            Federal Statistical Office
          </TextLink>{" "}
          — opens in a new tab, with the mark and &ldquo;opens in a new tab&rdquo; read after it.
        </p>

        <div className="space-y-2">
          {[true, false].map((stop) => (
            <div
              key={String(stop)}
              role="button"
              tabIndex={0}
              onClick={() => setRowClicks((n) => n + 1)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setRowClicks((n) => n + 1);
              }}
              className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-page)] px-3 py-2 hover:bg-[var(--bg-hover)]"
            >
              <span className="min-w-0">Invoice 2026-041 (the row opens a preview)</span>
              <TextLink
                href={`/links?via=${stop ? "stopPropagation" : "no-stopPropagation"}`}
                stopPropagation={stop}
              >
                {stop ? "Tenant (stopPropagation)" : "Tenant (no stopPropagation)"}
              </TextLink>
            </div>
          ))}
        </div>

        <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-1">
          {(["privacy", "terms", "imprint"] as const).map((s) => (
            <TextLink
              key={s}
              href={`/links?via=legal-${s}`}
              tone="muted"
              current={section === s}
              onClick={() => setSection(s)}
            >
              {s === "privacy" ? "Privacy" : s === "terms" ? "Terms" : "Imprint"}
            </TextLink>
          ))}
          <TextLink href="/wizard" tone="muted" current="step">
            Wizard (current=&quot;step&quot;)
          </TextLink>
        </nav>

        <p>
          <TextLink href="/buttons" icon={ArrowLeft}>
            Back to buttons
          </TextLink>
        </p>

        <OutTable
          rows={[
            ["row clicks", String(rowClicks)],
            ["last link followed (?via=)", via],
            ["current legal link (aria-current=page)", section],
          ]}
        />
      </div>
      <div className="mt-3">
        <Note>
          Click each &ldquo;Tenant&rdquo; link. With {code("stopPropagation")} the link routes and the row click
          count stays put; without it the row&apos;s handler runs too. Enter on the focused link behaves the same.
          The legal links are {code('tone="muted"')} and {code("current")} on the one you are on (semibold,{" "}
          {code('aria-current="page"')}); {code("current")} also takes a token ({code('"step"')}). {code("icon")}{" "}
          puts a Lucide icon before the text at the text&apos;s size.
        </Note>
      </div>
    </Example>
  );
}

/* ── Button href ──────────────────────────────────────────────────────────── */

function ButtonHref() {
  const via = useVia();
  const { box, hrefs } = useRenderedHrefs([via]);
  return (
    <Example label="Button — href" hint="an action that navigates: router link, plain link, external, disabled">
      <div ref={box}>
        <Row>
          <Button href="/links?via=Button-router" data-demo="router (linkComponent)">
            Open invoice
          </Button>
          <Button
            href="/links?via=Button-renderLink"
            variant="secondary"
            renderLink={({ href, ...p }) => <Link to={href} {...p} data-demo="own renderLink" />}
          >
            Own renderLink
          </Button>
          <Button
            href="#/links?via=Button-plain"
            variant="ghost"
            renderLink={({ children, ...p }) => (
              <a {...p} data-demo="plain <a> (renderLink)">
                {children}
              </a>
            )}
          >
            Plain #/ link
          </Button>
          <Button href="https://stripe.com/docs" external variant="secondary" data-demo="external">
            Stripe PDF
          </Button>
          <Button href="/links?via=Button-disabled" disabled data-demo="disabled">
            Disabled link
          </Button>
        </Row>
        <div className="mt-3">
          <OutTable rows={[["last link followed (?via=)", via], ...hrefs.map(([k, v]) => [k, v] as [string, string])]} />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          With {code("href")} a Button is an {code("<a>")}: middle-click and &ldquo;open in new tab&rdquo; work. An in-app
          path goes through the provider&apos;s {code("linkComponent")}, or {code("renderLink")} when given — the third
          button&apos;s renderLink returns a bare {code("<a>")}, so its hand-written {code("#/…")} href is used as is
          (a full page navigation within the hash). {code("external")} is a plain{" "}
          {code('target="_blank"')} link with &ldquo;(opens in a new tab)&rdquo; read after the label.{" "}
          {code("disabled")} draws an {code("<a>")} with no href at all ({code('role="link" aria-disabled')}), out of
          the tab order.
        </Note>
      </div>
    </Example>
  );
}

/* ── ActionCard href + iconTone ───────────────────────────────────────────── */

const ICON_TONES: Array<{ tone: ActionCardIconTone; icon: typeof Cloud; title: string }> = [
  { tone: "default", icon: FileText, title: "Documents" },
  { tone: "muted", icon: Receipt, title: "Receipts" },
  { tone: "brand", icon: ShieldCheck, title: "Privacy" },
  { tone: "warning", icon: KeyRound, title: "Recovery key" },
  { tone: "danger", icon: ShieldAlert, title: "Danger zone" },
  { tone: "info", icon: Cloud, title: "Backups" },
  { tone: "success", icon: Gauge, title: "Health" },
];

function ActionCardLinks() {
  const via = useVia();
  return (
    <Example label="ActionCard — href and iconTone" hint="a card that is a link to a section, its icon in a tone">
      <Stage>
        <div data-stage="wide" className="grid gap-3 sm:grid-cols-2">
          {ICON_TONES.map(({ tone, icon, title }) => (
            <ActionCard
              key={tone}
              href={`/links?via=card-${tone}`}
              icon={icon}
              iconTone={tone}
              title={title}
              description={`iconTone="${tone}"`}
            />
          ))}
          <ActionCard
            href="/links?via=card-disabled"
            disabled
            icon={FileText}
            title="Archive"
            description="disabled: the inert button, not a link"
          />
        </div>
      </Stage>
      <OutTable rows={[["last card followed (?via=)", via]]} />
      <div className="mt-3">
        <Note>
          With {code("href")} the card is a real link through the provider&apos;s router link (middle-click opens a
          tab). {code("iconTone")} colours the icon: {code("default")} is the secondary text colour it always had. A{" "}
          {code("disabled")} card with an href is the inert button — a link cannot be disabled.
        </Note>
      </div>
    </Example>
  );
}

export function LinksDemo() {
  return (
    <>
      {/* A page-wide remark, so a Note at the top where it is read first — as a bare
          monospace line after the last card it floated between two examples. */}
      <Note>Links on this page route inside the showcase; external ones open a new tab.</Note>
      <ProviderLink />
      <TextLinkTones />
      <TextLinkKinds />
      <ButtonHref />
      <ActionCardLinks />
    </>
  );
}
