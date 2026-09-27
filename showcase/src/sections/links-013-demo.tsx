import { useState } from "react";
import { useLocation } from "react-router";
import { ArrowUpRight, CloudCheck, ExternalLink, Pencil, Settings } from "lucide-react";
import { Button, IconButton, TextLink, Tone } from "@eifi1/ui-kit";
import { Example, Note, Row } from "../lib/section";

/**
 * LINKS (0.13): `replace` and `reloadDocument` on every kit link (keksdose F1), the
 * icon-only link — IconButton `href` (keksdose F2, kastlan 45) — TextLink's
 * `primary` / `secondary` (keksdose F3) and `warning` (kastlan 46) tones, and
 * IconButton's per-theme `toneColor` pair (keksdose).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;
const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

/* ── replace / reloadDocument ─────────────────────────────────────────────── */

function ReplaceAndReload() {
  const { search } = useLocation();
  const via = new URLSearchParams(search).get("via") ?? "—";
  // Read on every render: following a `replace` link re-renders through the router, and
  // the length it shows is the point — it does not grow.
  const depth = typeof window === "undefined" ? 0 : window.history.length;
  const reloaded = typeof window === "undefined" ? false : new URLSearchParams(window.location.search).has("reloaded");
  return (
    <Example label="replace and reloadDocument" hint="keksdose F1 — Button, TextLink, IconButton">
      <Row>
        <Button href="/links?via=pushed" variant="secondary" size="sm">
          Push an entry
        </Button>
        <Button href="/links?via=replaced" replace variant="secondary" size="sm">
          Replace this entry
        </Button>
        <TextLink href="/links?via=replaced-text" replace>
          Replace (TextLink)
        </TextLink>
        {/* A query BEFORE the hash: a plain <a> to it is a real document load, where a
            router link would only have swapped the view. */}
        <Button href="?reloaded=1#/links" reloadDocument variant="secondary" size="sm">
          Reload the document
        </Button>
      </Row>
      <p className={`${READOUT} mt-3`}>
        via={via} · history.length={depth} · document reloaded={String(reloaded)}
      </p>
      <div className="mt-3">
        <Note>
          {code("replace")} reaches the provider&apos;s {code("linkComponent")} as a prop — react-router&apos;s{" "}
          {code("<Link>")} takes it as is, any other router maps it:{" "}
          {code("({ href, replace, ...p }) => <Link to={href} replace={replace} {...p} />")}. It is only passed when
          asked, and never lands on a plain {code("<a>")}: there a plain click becomes {code("location.replace")}.
          Press Back after &ldquo;Replace&rdquo;: it skips the replaced URL. {code("reloadDocument")} skips the router
          link altogether — for a route the SPA does not own, or a logout that must drop every in-memory cache.
        </Note>
      </div>
    </Example>
  );
}

/* ── IconButton href ──────────────────────────────────────────────────────── */

function IconButtonLinks() {
  const [rowOpens, setRowOpens] = useState(0);
  return (
    <Example label="IconButton — href" hint="keksdose F2, kastlan 45: an icon action that navigates is a link">
      <Row>
        <IconButton href="/buttons" label="Buttons page">
          <Settings />
        </IconButton>
        <IconButton href="/links?via=icon-link" variant="secondary" label="Edit (routes here)">
          <Pencil />
        </IconButton>
        <IconButton href="https://react.dev" external tone="info" label="React docs">
          <ExternalLink />
        </IconButton>
        <IconButton href="/buttons" disabled label="Disabled link">
          <ArrowUpRight />
        </IconButton>
      </Row>
      {/* The row is a stand-in for a clickable DataTable row. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a demo row, reached by the link inside it */}
      <div
        onClick={() => setRowOpens((n) => n + 1)}
        className="mt-3 flex items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-sm"
      >
        <span>Unit 7 — clicking the row counts: {rowOpens}</span>
        <IconButton href="/links?via=row-link" size="xs" stopPropagation label="Open unit 7">
          <ArrowUpRight />
        </IconButton>
      </div>
      <div className="mt-3">
        <Note>
          The same rule as {code("<Button href>")}: an in-app href through the router link, an external one a plain{" "}
          {code("<a>")}; {code("external")} opens a new tab and adds &ldquo;(opens in a new tab)&rdquo; to the name.{" "}
          {code("label")} is still the {code("aria-label")} and the tooltip; {code("disabled")} is an inert link with no
          href, out of the tab order. Middle-click any of them.
        </Note>
      </div>
    </Example>
  );
}

/* ── TextLink tones ───────────────────────────────────────────────────────── */

function TextLinkTones013() {
  return (
    <Example label="TextLink — primary, secondary, warning" hint="keksdose F3, kastlan 46">
      <div className="space-y-2 text-sm">
        <p className="text-[var(--text-primary)]">
          Booked by{" "}
          <TextLink href="/links?via=tone-primary" tone="primary">
            Anna Schmidt
          </TextLink>{" "}
          on 3 March.
        </p>
        <p className="text-[var(--text-secondary)]">
          Imported from{" "}
          <TextLink href="/links?via=tone-secondary" tone="secondary">
            statement 2026-02.csv
          </TextLink>
          .
        </p>
        <p>
          <Tone tone="warning">
            Two invoices are overdue —{" "}
            <TextLink href="/links?via=tone-warning" tone="warning">
              review them
            </TextLink>
            .
          </Tone>
        </p>
      </div>
      <div className="mt-3">
        <Note>
          The colour of the text around them, so they underline by default ({code('underline="always"')}) — the
          underline is what says &ldquo;link&rdquo;. {code("secondary")} darkens on hover; {code("primary")} and{" "}
          {code("warning")} thicken the underline instead.
        </Note>
      </div>
    </Example>
  );
}

/* ── toneColor light / dark ───────────────────────────────────────────────── */

function ToneColorPair() {
  return (
    <Example label="IconButton — toneColor per theme" hint="keksdose: one inline colour cannot follow dark mode">
      <Row>
        <IconButton label="Single colour" toneColor="#be123c">
          <CloudCheck />
        </IconButton>
        <IconButton label="Light / dark pair" toneColor={{ light: "#be123c", dark: "#fda4af" }}>
          <CloudCheck />
        </IconButton>
        <IconButton label="A token (already flips)" toneColor="var(--warning)">
          <CloudCheck />
        </IconButton>
      </Row>
      <div className="mt-3">
        <Note>
          Switch the theme: the pair sets {code("--icon-button-tone-light")} and {code("--icon-button-tone-dark")} and a
          class picks one by the kit&apos;s {code("dark")} variant, so it follows {code(".dark")} in CSS alone. The single
          rose stays too dark on the dark surface.
        </Note>
      </div>
    </Example>
  );
}

export function Links013Demo() {
  return (
    <>
      <ReplaceAndReload />
      <IconButtonLinks />
      <TextLinkTones013 />
      <ToneColorPair />
    </>
  );
}
