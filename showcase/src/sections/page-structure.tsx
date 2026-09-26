import { useState } from "react";
import { Link } from "react-router";
import { Bell, Download, Plus, Slash } from "lucide-react";
import {
  Breadcrumbs,
  Button,
  CAPTION_CLASS,
  Caption,
  Chip,
  IconButton,
  Input,
  PageHeader,
  SECTION_LABEL_CLASS,
  SectionLabel,
  StatusDot,
  ToggleGroup,
  UserAvatar,
} from "@eifi1/ui-kit";
import type { BreadcrumbItem, BreadcrumbLinkProps, PageHeaderSize, StatusDotSize, StatusDotTone } from "@eifi1/ui-kit";
import { ConstList, Example, Note, Row, Stage } from "../lib/section";

/**
 * PAGE STRUCTURE — the pieces of a page that are not its content: the header with its
 * trail and actions, the breadcrumb trail on its own, and the three small text marks
 * (section label, caption, status dot) the apps spelled in Tailwind classes. All
 * 0.10.0. Every link below goes to a real page of this showcase through the router.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";

/** react-router's Link takes `to`, not `href`. */
const routerCrumb = ({ href, ...props }: BreadcrumbLinkProps) => <Link to={href} {...props} />;

const TRAIL: BreadcrumbItem[] = [
  { label: "Showcase", href: "/overview" },
  { label: "App chrome", href: "/app-chrome" },
  { label: "Buildings" },
  { label: "Lindenstraße 12", href: "/page-structure" },
  { label: "Units", href: "/page-structure" },
  { label: "2nd floor, east" },
];

/* ── PageHeader ──────────────────────────────────────────────────────────── */

function PageHeaders() {
  const [size, setSize] = useState<PageHeaderSize>("md");
  const [as, setAs] = useState<"h2" | "h3">("h2");
  const [created, setCreated] = useState(0);
  return (
    <Example
      label="PageHeader — eyebrow, description, actions and breadcrumbs"
      hint="actions sit at the title's end from sm up, and wrap under it on a phone"
    >
      <Row className="mb-4">
        <ToggleGroup<PageHeaderSize>
          aria-label="size"
          value={size}
          onChange={setSize}
          options={[
            { value: "sm", label: "size sm" },
            { value: "md", label: "size md" },
          ]}
        />
        <ToggleGroup<"h2" | "h3">
          aria-label="as"
          value={as}
          onChange={setAs}
          options={[
            { value: "h2", label: "as h2" },
            { value: "h3", label: "as h3" },
          ]}
        />
      </Row>
      <PageHeader
        size={size}
        as={as}
        breadcrumbs={<Breadcrumbs items={TRAIL} renderLink={routerCrumb} />}
        eyebrow="Unit"
        title={
          <span className="inline-flex flex-wrap items-center gap-2">
            2nd floor, east
            <Chip size="sm" tone="success">
              Rented
            </Chip>
          </span>
        }
        description="68 m² · 3 rooms · let since 1 April 2024 to Ada Lovelace"
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Download className="size-4" /> Export
            </Button>
            <Button variant="secondary" size="sm">
              Edit
            </Button>
            <Button variant="brand" size="sm" onClick={() => setCreated((n) => n + 1)}>
              <Plus className="size-4" /> New meter reading
            </Button>
          </>
        }
      />
      <p className={`mt-4 ${READOUT}`}>
        title element: &lt;{as}&gt; · readings created: {created}
      </p>
      <div className="mt-3">
        <Note>
          <code className="font-mono">as</code> is the title&apos;s element and defaults to{" "}
          <code className="font-mono">h1</code> — a page has one, and this is it; the specimen uses{" "}
          <code className="font-mono">h2</code>/<code className="font-mono">h3</code> because this page already
          has its <code className="font-mono">h1</code>. <code className="font-mono">title</code> is a ReactNode (a
          status chip beside the name); <code className="font-mono">eyebrow</code> is the section-label type
          above it; <code className="font-mono">size=&quot;sm&quot;</code> is the dense tool page&apos;s title.
          The header has no outer margin — the page&apos;s own rhythm places it. Narrow the window: the
          three actions drop under the title and wrap instead of running off the screen.
        </Note>
      </div>
    </Example>
  );
}

function PageHeaderMinimal() {
  return (
    <Example label="PageHeader — title only, and title with actions" hint="every slot but the title is optional">
      <div className="space-y-6">
        <PageHeader as="h3" title="Reports" />
        <PageHeader
          as="h3"
          size="sm"
          title="Projects"
          actions={
            <IconButton label="Notifications" tooltipSide="bottom">
              <Bell />
            </IconButton>
          }
        />
      </div>
    </Example>
  );
}

/* ── Breadcrumbs ─────────────────────────────────────────────────────────── */

function BreadcrumbCollapse() {
  const [collapse, setCollapse] = useState(true);
  const [keepEnd, setKeepEnd] = useState<"1" | "2" | "3">("2");
  return (
    <Example
      label="Breadcrumbs — collapse on phones and keepEnd"
      hint="below 768px only: narrow the window or open the screen-size preview in the top bar"
    >
      <Row className="mb-4">
        <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <input type="checkbox" checked={collapse} onChange={(e) => setCollapse(e.target.checked)} />
          <code className="font-mono">collapse</code>
        </label>
        <ToggleGroup<"1" | "2" | "3">
          aria-label="keepEnd"
          size="sm"
          value={keepEnd}
          onChange={setKeepEnd}
          options={[
            { value: "1", label: "keepEnd 1" },
            { value: "2", label: "keepEnd 2" },
            { value: "3", label: "keepEnd 3" },
          ]}
        />
      </Row>
      {/* Keyed on the settings, so a changed keepEnd collapses the trail again rather
          than staying expanded from the last press of "…". */}
      <Breadcrumbs key={`${collapse}-${keepEnd}`} items={TRAIL} renderLink={routerCrumb} collapse={collapse} keepEnd={Number(keepEnd)} />
      <div className="mt-3">
        <Note>
          On a phone the middle of the trail folds into a &ldquo;…&rdquo; button (
          <code className="font-mono">breadcrumbs.showAll</code>), keeping the first crumb and the last{" "}
          <code className="font-mono">keepEnd</code> — the current page and its parent by default, because
          &ldquo;up one level&rdquo; is what a phone user reaches for. Pressing it reveals the rest and puts
          focus on the first crumb it revealed. The collapse is CSS (<code className="font-mono">hidden md:flex</code>),
          so it costs no media-query listener. <code className="font-mono">collapse={"{false}"}</code> lets the
          trail wrap instead. &ldquo;Buildings&rdquo; has no <code className="font-mono">href</code>, so it is text;
          the last crumb is the page (<code className="font-mono">aria-current=&quot;page&quot;</code>) whether or
          not it has one.
        </Note>
      </div>
    </Example>
  );
}

function BreadcrumbVariants() {
  return (
    <Example
      label="Breadcrumbs — separator, renderLink, labels and right-to-left"
      hint="a nav landmark with an ordered list; the default chevron mirrors in RTL"
    >
      <div className="space-y-4">
        <div>
          <p className={`mb-1 ${READOUT}`}>separator=&quot;/&quot; · plain &lt;a&gt; (no renderLink)</p>
          <Breadcrumbs
            separator={<Slash className="size-3" />}
            items={[
              { label: "Docs", href: "#/overview" },
              { label: "Components", href: "#/data-display" },
              { label: "Breadcrumbs" },
            ]}
          />
        </div>
        <div>
          <p className={`mb-1 ${READOUT}`}>labels={"{{ label: \"Account path\" }}"} · renderLink</p>
          <Breadcrumbs
            labels={{ label: "Account path" }}
            renderLink={routerCrumb}
            items={[
              { label: "Settings", href: "/settings" },
              { label: <span className="inline-flex items-center gap-1">Security <StatusDot tone="warning" /></span>, key: "security", href: "/settings" },
              { label: "Passkeys" },
            ]}
          />
        </div>
        <div dir="rtl">
          <p className={`mb-1 ${READOUT}`}>dir=&quot;rtl&quot;</p>
          <Breadcrumbs
            renderLink={routerCrumb}
            items={[
              { label: "الرئيسية", href: "/overview" },
              { label: "المباني", href: "/page-structure" },
              { label: "شارع الزيزفون ١٢", href: "/page-structure" },
              { label: "الوحدات", href: "/page-structure" },
              { label: "الطابق الثاني" },
            ]}
          />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">separator</code> is drawn as given — a slash needs no mirroring — while
          the default chevron flips in a right-to-left trail, so it still points from where you came.{" "}
          <code className="font-mono">labels.label</code> names the landmark (default{" "}
          <code className="font-mono">breadcrumbs.label</code>, &ldquo;Breadcrumb&rdquo;). A crumb whose label is
          not a string takes a <code className="font-mono">key</code>. Long labels truncate at 14rem (16rem for
          the current page).
        </Note>
      </div>
    </Example>
  );
}

/* ── SectionLabel & Caption ──────────────────────────────────────────────── */

function TextPrimitives() {
  const [email, setEmail] = useState("");
  return (
    <Example
      label="SectionLabel and Caption"
      hint="the small uppercase label and the small grey sentence — as components and as class strings"
    >
      <Stage>
        <div data-stage="wide" className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <SectionLabel>Heating (size sm, as h3)</SectionLabel>
            <p className="text-sm text-[var(--text-secondary)]">
              The default: 12px, above a block of page content — a heading, since it is an{" "}
              <code className="font-mono">h3</code> unless told otherwise.
            </p>
            <SectionLabel size="xs" as="p">
              Legend group (size xs, as p)
            </SectionLabel>
            <p className="text-sm text-[var(--text-secondary)]">10px, for inside a dense panel — a legend, a menu row.</p>
            <fieldset className="rounded-md border border-[var(--border)] px-3 pb-3">
              <SectionLabel as="legend" className="px-1">
                as legend
              </SectionLabel>
              <p className="text-sm text-[var(--text-secondary)]">The label of a fieldset.</p>
            </fieldset>
          </div>
          <div className="space-y-3">
            <Input label="Invoice e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Caption className="mt-1">
              Invoices go to this address as PDF. Leave it empty to send them to the account&apos;s owner.
            </Caption>
            <p className="text-sm text-[var(--text-secondary)]">
              Total due <strong>€ 1,425.50</strong>{" "}
              <Caption as="span">(incl. 19 % VAT — a caption as=&quot;span&quot;, inside a line)</Caption>
            </p>
            <p className={CAPTION_CLASS}>CAPTION_CLASS on a plain &lt;p&gt;</p>
            <p className={SECTION_LABEL_CLASS.sm}>SECTION_LABEL_CLASS.sm on a plain &lt;p&gt;</p>
          </div>
        </div>
      </Stage>
      <ConstList
        items={[
          ["SECTION_LABEL_CLASS.xs", SECTION_LABEL_CLASS.xs],
          ["SECTION_LABEL_CLASS.sm", SECTION_LABEL_CLASS.sm],
          ["CAPTION_CLASS", CAPTION_CLASS],
        ]}
      />
      <div className="mt-3">
        <Note>
          <code className="font-mono">SectionLabel</code>&apos;s <code className="font-mono">as</code> is the heading
          LEVEL, so it is the caller&apos;s to pick — the kit cannot know where in the outline the label sits.
          The uppercase is CSS: write the text in normal case and a screen reader reads it as written.{" "}
          <code className="font-mono">Caption</code> is prose ABOUT the thing above it — not{" "}
          <code className="font-mono">FieldHint</code>, which hides behind a label&apos;s ? so a paragraph does
          not make one field taller than its neighbours. Both are token-coloured, so they follow the palette.
        </Note>
      </div>
    </Example>
  );
}

/* ── StatusDot ───────────────────────────────────────────────────────────── */

const DOT_TONES: StatusDotTone[] = ["brand", "neutral", "success", "warning", "danger", "info", "income", "expense"];
const DOT_SIZES: StatusDotSize[] = ["sm", "md", "lg"];

function StatusDots() {
  const [unread, setUnread] = useState(3);
  return (
    <Example
      label="StatusDot — every tone, sizes, ring and label"
      hint="the tones are ProgressBar's and Chip's, name for name, so a legend and its bar agree"
    >
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="text-xs text-[var(--text-secondary)]">
            <thead>
              <tr>
                <th className="pe-4 text-start font-medium">tone</th>
                {DOT_SIZES.map((s) => (
                  <th key={s} className="px-3 font-medium">
                    {s}
                  </th>
                ))}
                <th className="ps-3 text-start font-medium">with a label</th>
              </tr>
            </thead>
            <tbody>
              {DOT_TONES.map((tone) => (
                <tr key={tone}>
                  <td className="pe-4 font-mono">{tone}</td>
                  {DOT_SIZES.map((size) => (
                    <td key={size} className="px-3 py-1 text-center">
                      <StatusDot tone={tone} size={size} />
                    </td>
                  ))}
                  <td className="ps-3">
                    <StatusDot tone={tone} label={`${tone[0].toUpperCase()}${tone.slice(1)}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Row>
          <span className="relative inline-flex">
            <UserAvatar name="Ada Lovelace" aria-hidden={false} role="img" aria-label={`Ada Lovelace, ${unread} unread`} />
            {unread > 0 && <StatusDot tone="danger" size="md" ring className="absolute -end-0.5 -top-0.5" />}
          </span>
          <span className="relative inline-flex">
            <Bell className="size-5 text-[var(--text-secondary)]" aria-hidden />
            <StatusDot tone="brand" ring className="absolute -end-0.5 -top-0.5" />
          </span>
          <span className="relative inline-flex">
            <Bell className="size-5 text-[var(--text-secondary)]" aria-hidden />
            <StatusDot tone="brand" className="absolute -end-0.5 -top-0.5" />
          </span>
          <Button variant="ghost" size="sm" onClick={() => setUnread((n) => (n > 0 ? 0 : 3))}>
            {unread > 0 ? "Mark all read" : "Get three messages"}
          </Button>
          <StatusDot tone="success" size="lg" aria-label="Online" />
          <span className={READOUT}>← aria-label: an image named &ldquo;Online&rdquo;</span>
        </Row>
        <Row>
          <SectionLabel as="span" size="xs">
            Occupancy
          </SectionLabel>
          <StatusDot tone="success" size="lg" label="Rented" />
          <StatusDot tone="warning" size="lg" label="Notice given" />
          <StatusDot tone="danger" size="lg" label="Vacant" dotClassName="opacity-80" />
        </Row>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">ring</code> draws the surface colour round the dot, so one laid over
          the corner of an avatar or an icon reads as a separate mark (the first two) and not a smudge (the
          third, without). Position it with <code className="font-mono">className</code>. Without a{" "}
          <code className="font-mono">label</code> the dot is hidden from assistive technology — say the
          state where it IS read (the avatar&apos;s &ldquo;3 unread&rdquo;) or give the dot an{" "}
          <code className="font-mono">aria-label</code>, which makes it an image with that name. With a label
          the text is what is read and the dot is decoration; <code className="font-mono">dotClassName</code>{" "}
          styles the dot alone.
        </Note>
      </div>
    </Example>
  );
}

export function PageStructure() {
  return (
    <>
      <PageHeaders />
      <PageHeaderMinimal />
      <BreadcrumbCollapse />
      <BreadcrumbVariants />
      <TextPrimitives />
      <StatusDots />
    </>
  );
}
