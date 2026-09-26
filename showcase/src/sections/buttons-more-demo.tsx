import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import {
  Check,
  CloudAlert,
  CloudUpload,
  Crosshair,
  Download,
  Layers,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Trash2,
} from "lucide-react";
import {
  Button,
  ButtonGroup,
  ButtonGroupLink,
  IconButton,
  Input,
  ToggleGroup,
  UserAvatar,
} from "@eifi1/ui-kit";
import type { ButtonGroupLinkRenderProps, StatusDotTone } from "@eifi1/ui-kit";
import { Example, Note, OutTable, Row } from "../lib/section";

/**
 * BUTTONS — the 0.11 additions: `ButtonGroup elevated` and `variant="gapped"` for a
 * toolbar over content, `ButtonGroupLink` for a group member that navigates, the
 * IconButton's `xl` size, `stretch`, `success` and `custom` tones and `shape="round"`,
 * and the UserAvatar's `badge`.
 */

const READOUT = "font-mono text-xs text-[var(--text-secondary)]";
const CAPTION = "font-mono text-[11px] text-[var(--text-muted)]";

/** A picture to float controls over, with no image request: a "map" drawn in CSS from
 *  the palette's own chart colours, so it follows the palette switch too. */
const MAP_GROUND =
  "radial-gradient(circle at 25% 30%, color-mix(in oklab, var(--chart-2) 55%, transparent) 0 18%, transparent 19%), radial-gradient(circle at 70% 65%, color-mix(in oklab, var(--chart-4) 50%, transparent) 0 24%, transparent 25%), repeating-linear-gradient(45deg, color-mix(in oklab, var(--text-primary) 6%, transparent) 0 2px, transparent 2px 18px), linear-gradient(135deg, var(--chart-1), var(--chart-3))";

/** react-router's Link takes `to`, not `href`. */
const routerGroupLink = ({ href, ...props }: ButtonGroupLinkRenderProps) => <Link to={href} {...props} />;

function GroupsOverContent() {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [layer, setLayer] = useState(false);
  return (
    <Example
      label="ButtonGroup — elevated, and gapped over an image"
      hint="toolbars that float OVER content: a filled, shadowed frame, or separate discs"
    >
      <div
        className="relative h-56 overflow-hidden rounded-md border border-[var(--border)]"
        style={{ background: MAP_GROUND }}
        role="img"
        aria-label={`A map at ${zoom}% zoom, rotated ${rotation}°`}
      >
        <div
          aria-hidden
          className="absolute inset-0 grid place-items-center text-4xl font-bold text-[var(--text-inverse)] opacity-70 transition-transform"
          style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
        >
          ⌖
        </div>
        {/* joined + elevated: the frame is filled and shadowed. */}
        <ButtonGroup aria-label="Map tools" elevated className="absolute start-3 top-3">
          <IconButton variant="ghost" label="Rotate" onClick={() => setRotation((r) => (r + 45) % 360)}>
            <RotateCw />
          </IconButton>
          <IconButton variant="ghost" label="Centre on me" onClick={() => setRotation(0)}>
            <Crosshair />
          </IconButton>
          <IconButton
            variant="ghost"
            label="Layers"
            pressed={layer}
            onClick={() => setLayer((v) => !v)}
          >
            <Layers />
          </IconButton>
        </ButtonGroup>
        {/* gapped + elevated: round overlay discs, each with its own shadow. */}
        <ButtonGroup
          aria-label="Zoom"
          variant="gapped"
          elevated
          orientation="vertical"
          className="absolute bottom-3 end-3"
        >
          <IconButton variant="overlay" label="Zoom in" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
            <Plus />
          </IconButton>
          <IconButton variant="overlay" label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
            <Minus />
          </IconButton>
        </ButtonGroup>
        <ButtonGroup aria-label="Photo actions" variant="gapped" className="absolute bottom-3 start-3">
          <IconButton variant="overlay" label="Download">
            <Download />
          </IconButton>
          <IconButton variant="overlay" label="Delete">
            <Trash2 />
          </IconButton>
        </ButtonGroup>
      </div>
      <p className={`mt-2 ${READOUT}`}>
        zoom {zoom}% · rotation {rotation}° · layers {layer ? "on" : "off"}
      </p>
      <div className="mt-3">
        <Note>
          Top start: a JOINED group with <code className="font-mono">elevated</code> — its frame is filled with the
          surface (ghost members would otherwise show the picture through them) and carries the shadow of a control
          lifted over the page. Bottom end: <code className="font-mono">variant=&quot;gapped&quot;</code> +{" "}
          <code className="font-mono">elevated</code>, <code className="font-mono">orientation=&quot;vertical&quot;</code>:
          nothing is stripped from the members, so the overlay discs keep their round shape, sit a gap apart and each
          takes the shadow. Bottom start: gapped WITHOUT <code className="font-mono">elevated</code>, for comparison —
          flat discs.
        </Note>
      </div>
    </Example>
  );
}

function GroupLinks() {
  const [exports, setExports] = useState(0);
  return (
    <Example
      label="ButtonGroupLink — current and renderLink"
      hint="a group member that navigates: a real link drawn as a Button"
    >
      <div className="flex flex-wrap items-start gap-6">
        <div className="space-y-2">
          <p className={CAPTION}>links between pages · renderLink → react-router Link</p>
          <ButtonGroup aria-label="Display pages">
            <ButtonGroupLink href="/buttons" current renderLink={routerGroupLink}>
              Buttons
            </ButtonGroupLink>
            <ButtonGroupLink href="/chips-toggles" renderLink={routerGroupLink}>
              Chips
            </ButtonGroupLink>
            <ButtonGroupLink href="/feedback" renderLink={routerGroupLink}>
              Feedback
            </ButtonGroupLink>
          </ButtonGroup>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>an action beside a page · plain &lt;a&gt;</p>
          <ButtonGroup aria-label="Report">
            <Button variant="secondary" onClick={() => setExports((n) => n + 1)}>
              <Download className="size-4" aria-hidden /> Export
            </Button>
            <ButtonGroupLink href="#/stats" size="md">
              Open report
            </ButtonGroupLink>
          </ButtonGroup>
          <p className={READOUT}>exports: {exports}</p>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>size=&quot;sm&quot;, variant=&quot;ghost&quot;</p>
          <ButtonGroup aria-label="Small page links">
            <ButtonGroupLink href="/buttons" size="sm" variant="ghost" current renderLink={routerGroupLink}>
              Here
            </ButtonGroupLink>
            <ButtonGroupLink href="/layout" size="sm" variant="ghost" renderLink={routerGroupLink}>
              Disclosure
            </ButtonGroupLink>
          </ButtonGroup>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">current</code> sets <code className="font-mono">aria-current=&quot;page&quot;</code>{" "}
          and the pressed member&apos;s &ldquo;on&rdquo; look — &ldquo;Buttons&rdquo; is this page — so a row of links
          reads as a segmented switch between pages. <code className="font-mono">renderLink</code> hands the member to
          the router&apos;s <code className="font-mono">Link</code> (no reload; middle-click opens a tab, because it is
          an <code className="font-mono">&lt;a href&gt;</code>). Without it the member is a plain{" "}
          <code className="font-mono">&lt;a&gt;</code>, as &ldquo;Open report&rdquo; is. The group rounds the outer
          corners of a link exactly as of a button.
        </Note>
      </div>
    </Example>
  );
}

type Sync = "edited" | "saving" | "saved" | "failed";
const SYNC: Record<Sync, { color: string; label: string; icon: ReactNode }> = {
  edited: { color: "var(--warning)", label: "Unsaved changes — save now", icon: <Pencil /> },
  saving: { color: "var(--info)", label: "Saving…", icon: <RefreshCw /> },
  saved: { color: "var(--success)", label: "All changes saved", icon: <Check /> },
  failed: { color: "var(--danger)", label: "Save failed — retry", icon: <CloudAlert /> },
};

function IconButtonMore() {
  const [sync, setSync] = useState<Sync>("edited");
  const [presses, setPresses] = useState(0);
  const [deleted, setDeleted] = useState(0);
  const s = SYNC[sync];
  return (
    <Example
      label='IconButton — xl, stretch, tone="success", tone="custom" and shape="round"'
      hint="xl 48 · lg 44 · md 36 · sm 32 · xs 28 · 2xs 24"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <p className={CAPTION}>size — xl is new</p>
          <Row>
            {(["xl", "lg", "md", "sm", "xs", "2xs"] as const).map((size) => (
              <IconButton key={size} size={size} variant="secondary" label={`Upload (${size})`}>
                <CloudUpload />
              </IconButton>
            ))}
          </Row>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>shape=&quot;round&quot; at xl, lg, md, sm, xs</p>
          <Row>
            {(["xl", "lg", "md", "sm", "xs"] as const).map((size) => (
              <IconButton key={size} size={size} shape="round" variant="secondary" label={`Add (${size}, round)`}>
                <Plus />
              </IconButton>
            ))}
          </Row>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>stretch — level with the field beside it</p>
          <div className="flex max-w-md gap-2">
            <div className="min-w-0 flex-1">
              <Input label="Split amount" defaultValue="42.00" inputMode="decimal" />
            </div>
            <IconButton stretch variant="secondary" tone="danger" label="Delete this split" onClick={() => setDeleted((n) => n + 1)}>
              <Trash2 />
            </IconButton>
          </div>
          <div className="flex max-w-md items-start gap-2">
            <div className="min-w-0 flex-1">
              <Input label="Without stretch" defaultValue="42.00" inputMode="decimal" />
            </div>
            <IconButton variant="secondary" tone="danger" label="Delete (not stretched)">
              <Trash2 />
            </IconButton>
          </div>
          <p className={READOUT}>deleted: {deleted}</p>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>tone=&quot;success&quot; — green at rest</p>
          <Row>
            <IconButton tone="success" label="In sync">
              <Check />
            </IconButton>
            <IconButton tone="success" variant="secondary" label="In sync (secondary)">
              <Check />
            </IconButton>
            <IconButton tone="success" quiet label="In sync (quiet)">
              <Check />
            </IconButton>
          </Row>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>tone=&quot;custom&quot; toneColor — a round sync chip whose colour follows state</p>
          <Row>
            <ToggleGroup<Sync>
              aria-label="Sync state"
              size="sm"
              value={sync}
              onChange={setSync}
              options={[
                { value: "edited", label: "edited" },
                { value: "saving", label: "saving" },
                { value: "saved", label: "saved" },
                { value: "failed", label: "failed" },
              ]}
            />
            <IconButton
              shape="round"
              size="sm"
              tone="custom"
              toneColor={s.color}
              label={s.label}
              onClick={() => setPresses((n) => n + 1)}
            >
              {s.icon}
            </IconButton>
          </Row>
          <OutTable
            rows={[
              ["toneColor", s.color],
              ["label", s.label],
              ["presses", String(presses)],
            ]}
          />
        </div>
      </div>
      <div className="mt-3">
        <Note>
          <code className="font-mono">xl</code> is 48px with a 24px glyph — the one primary action of a phone screen.{" "}
          <code className="font-mono">shape=&quot;round&quot;</code> makes any size a circle.{" "}
          <code className="font-mono">stretch</code> keeps the width and takes the HEIGHT of the flex row, so the delete
          is level with the labelled field beside it (compare the second row). <code className="font-mono">tone=&quot;success&quot;</code>{" "}
          is toned at rest, like <code className="font-mono">warning</code> and <code className="font-mono">info</code>.{" "}
          <code className="font-mono">toneColor</code> sets <code className="font-mono">--icon-button-tone</code> (and
          implies <code className="font-mono">tone=&quot;custom&quot;</code>), so one variable re-colours the glyph,
          the hover wash and the focus ring together — pick a state and hover or Tab to the chip.
        </Note>
      </div>
    </Example>
  );
}

const TONES: StatusDotTone[] = ["danger", "warning", "success", "info", "brand", "neutral", "income", "expense"];

function AvatarBadges() {
  const [unread, setUnread] = useState(3);
  return (
    <Example label="UserAvatar — badge, every tone and right-to-left" hint="a status dot in the top-end corner, with words for a reader">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className={CAPTION}>badge.tone — default danger</p>
          <Row>
            {TONES.map((tone) => (
              <span key={tone} className="flex flex-col items-center gap-1">
                <UserAvatar name="Marcel Eifert" badge={{ label: `${tone} status`, tone }} />
                <span className={CAPTION}>{tone}</span>
              </span>
            ))}
          </Row>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>the dot grows with the avatar: sm · md · lg, and badge=&#123;null&#125;</p>
          <Row>
            <UserAvatar size="sm" name="Ada Lovelace" badge={{ label: "Online", tone: "success" }} />
            <UserAvatar size="md" name="Ada Lovelace" badge={{ label: "Online", tone: "success" }} />
            <UserAvatar size="lg" name="Ada Lovelace" badge={{ label: "Online", tone: "success" }} />
            <UserAvatar size="lg" name="Ada Lovelace" badge={null} />
          </Row>
        </div>
        <div className="space-y-2">
          <p className={CAPTION}>a count that comes and goes</p>
          <Row>
            <UserAvatar
              name="Marcel Eifert"
              email="marcel@example.com"
              badge={unread > 0 ? { label: `${unread} unread` } : null}
            />
            <Button size="sm" variant="secondary" onClick={() => setUnread((n) => n + 1)}>
              One more
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setUnread(0)}>
              Mark all read
            </Button>
            <span className={READOUT}>badge: {unread > 0 ? `{ label: "${unread} unread" }` : "null"}</span>
          </Row>
        </div>
        <div className="space-y-2" dir="rtl">
          <p className={CAPTION}>dir=&quot;rtl&quot; — the dot moves to the top-left</p>
          <Row>
            <UserAvatar name="ليلى حسن" badge={{ label: "٣ غير مقروءة" }} />
            <UserAvatar size="lg" name="ليلى حسن" badge={{ label: "متصل", tone: "success" }} />
          </Row>
        </div>
      </div>
      <div className="mt-3">
        <Note>
          The dot sits in the top-END corner, ringed in the surface colour, and its <code className="font-mono">label</code>{" "}
          is read as text where it sits (the initials stay hidden) — so inside a button named by its content, such as the
          account menu&apos;s trigger on the Shell page, the button&apos;s name becomes &ldquo;Account menu 3
          unread&rdquo; (the initials are hidden, so the person&apos;s name is not part of it). <code className="font-mono">label</code> is required: a coloured circle says nothing to
          someone who cannot see it. <code className="font-mono">null</code> draws no badge and no wrapper.
        </Note>
      </div>
    </Example>
  );
}

export function ButtonsMore() {
  return (
    <>
      <GroupsOverContent />
      <GroupLinks />
      <IconButtonMore />
      <AvatarBadges />
    </>
  );
}
