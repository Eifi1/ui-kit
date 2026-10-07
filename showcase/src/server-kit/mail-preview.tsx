import { useLayoutEffect, useRef, useState } from "react";
import { ToggleGroup } from "@eifi1/ui-kit";
import type { ApiMail } from "./api";

/**
 * The sample mails a server-kit release renders, shown as mails: the subject above, the
 * body in a frame of a mail client's width.
 *
 * SANDBOXED, `sandbox=""` with `srcDoc`: the HTML is the release's, and a mail is the
 * one document on this site that is meant to be read as someone else's page. An empty
 * sandbox gives it no scripts, no forms, no top-level navigation and an opaque origin —
 * it cannot reach this page or its storage, and its links go nowhere.
 *
 * A FIXED WIDTH, scaled. A mail is laid out for a ~600px column, and that is what a
 * reader checks it at; on a phone the frame keeps that width and is scaled down to fit,
 * the way a mail client's preview pane shows a desktop mail, rather than reflowed into
 * something no recipient sees. The sandbox hides the document's height from this page,
 * so the frame's height is fixed too — the samples are a few short paragraphs.
 *
 * LIGHT, whatever the theme: mail clients paint a mail on white, and so does this. The
 * frame is `color-scheme: light` on the system colour `Canvas` — the browser's own
 * document white, not a colour this page invents — so a dark showcase does not put the
 * mail's default black text on a dark ground.
 */

const MAIL_WIDTH = 600;
const MAIL_HEIGHT = 300;

/** The frame's scale for a box `width` wide: 1 at 600px and up, smaller below. */
export function mailScale(width: number): number {
  return width > 0 ? Math.min(1, width / MAIL_WIDTH) : 1;
}

function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    // Observing reports the first size at once, then every change.
    const observer = new ResizeObserver(([entry]) => setScale(mailScale(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return { ref, scale };
}

export function MailFrame({ mail }: { mail: ApiMail }) {
  const { ref, scale } = useFitScale();
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] shadow-sm">
      <div className="flex min-w-0 items-baseline gap-2 border-b border-[var(--border)] bg-[var(--bg-surface-2)] px-3 py-2 text-sm">
        <span className="shrink-0 text-xs text-[var(--text-muted)]">Subject</span>
        <span lang={mail.locale} className="min-w-0 font-medium text-[var(--text-primary)] [overflow-wrap:anywhere]">
          {mail.subject}
        </span>
      </div>
      <div ref={ref} dir="ltr" className="relative overflow-hidden" style={{ height: MAIL_HEIGHT * scale }}>
        <iframe
          // A frame's accessible name — the attribute assistive technology reads for an
          // <iframe>, not a hover tooltip.
          title={`${mail.title} — ${mail.locale}`}
          sandbox=""
          srcDoc={mail.html}
          loading="lazy"
          className="absolute start-0 top-0 block origin-top-left border-0"
          style={{
            width: MAIL_WIDTH,
            height: MAIL_HEIGHT,
            transform: scale < 1 ? `scale(${scale})` : undefined,
            colorScheme: "light",
            background: "Canvas",
          }}
        />
      </div>
    </div>
  );
}

/** One sample mail, its languages behind a switch. */
export function MailPreview({ variants }: { variants: readonly ApiMail[] }) {
  const [locale, setLocale] = useState(variants[0].locale);
  const mail = variants.find((v) => v.locale === locale) ?? variants[0];
  return (
    // 600px of mail and its 1px border: on a wide page the frame does not stretch past
    // the column the mail is laid out for.
    <figure className="min-w-0 max-w-[602px] space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="text-sm font-medium text-[var(--text-primary)]">
          {mail.title} <code className="ms-1 font-mono text-xs text-[var(--text-muted)]">{mail.id}</code>
        </figcaption>
        {variants.length > 1 && (
          // Beside the caption where there is room; the whole row on a phone.
          <div className="w-full sm:w-auto sm:min-w-44">
            <ToggleGroup
              size="sm"
              ariaLabel={`Language of “${mail.title}”`}
              options={variants.map((v) => ({ value: v.locale, label: v.locale }))}
              value={locale}
              onChange={setLocale}
            />
          </div>
        )}
      </div>
      <MailFrame mail={mail} />
    </figure>
  );
}

/** Every sample mail of the release, grouped by id in the export's order. */
export function groupMails(mails: readonly ApiMail[]): ApiMail[][] {
  const byId = new Map<string, ApiMail[]>();
  for (const mail of mails) {
    if (!byId.has(mail.id)) byId.set(mail.id, []);
    byId.get(mail.id)!.push(mail);
  }
  return [...byId.values()];
}

export function MailPreviews({ mails }: { mails: readonly ApiMail[] }) {
  return (
    // Side by side only where two whole 600px mails fit; never two half-size ones.
    <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(min(100%,602px),1fr))]">
      {groupMails(mails).map((variants) => (
        <MailPreview key={variants[0].id} variants={variants} />
      ))}
    </div>
  );
}
