import { useState, useSyncExternalStore } from "react";

import type { LabelOverride } from "../i18n/kit-labels";
import { cn } from "../lib/cn";
import { parseIsoDate, subscribeToday, todayIso } from "../lib/dates";
import { useDayFormatter } from "../lib/day-format";
import { isBareIsoDay } from "../lib/iso-day";
import { readStored, writeStored } from "../lib/safe-storage";
import { AlertBanner } from "./alert-banner";
import { DEFAULT_LEGAL_LABELS, LEGAL_HREFS, useLegalLabels, warnLegalOnce } from "./legal";
import type { LegalLabels } from "./legal";
import { TextLink } from "./text-link";

/**
 * One announced change to the terms or the privacy policy — an entry of the list
 * `GET /api/v1/legal/changes` answers (docs/legal-harmonization.md §3.5).
 *
 * The SAME shape as server-kit's builder, which writes it on the server: a field added or
 * renamed here and not there (or there and not here) is an app whose notice says nothing.
 * Change the two together.
 */
export interface LegalChangeAnnouncement {
  /** The page whose text changes. */
  page: "terms" | "privacy";
  /** The day the new text takes effect, ISO `YYYY-MM-DD` — at least 30 days after it was
   *  announced (decision 10: the notice period). */
  effective: string;
  /** Where the new text can be read. Default: the page's own route (`/terms`, `/privacy`).
   *  `null` is "none" as well: server-kit's model (`str | None = None`) writes the absent
   *  field out as `null` on the wire. */
  href?: string | null;
}

export interface LegalChangeNoticeProps {
  /**
   * The announcements, as `GET /api/v1/legal/changes` (server-kit's `LEGAL_CHANGES_PATH`)
   * answered them: possibly empty, or not there yet (`query.data` while it loads). The
   * server lists a change from the day it is announced through its effective day; the
   * notice shows a banner per announcement until that day has passed on the app's own
   * calendar (the day itself included), soonest first, the terms before the privacy policy
   * on the same day — whatever order the list came in. An entry that is not one (another
   * page, a date that is not a real `YYYY-MM-DD`) is left out: a bad answer never takes
   * the app down.
   */
  announcements?: readonly LegalChangeAnnouncement[] | null;
  /**
   * Where a dismissal is remembered, in `localStorage` through the kit's safe storage: one
   * key per announcement, `<storageKey>.<page>.<effective>`. Default
   * `kit.legalChange.dismissed`. A new announcement (a later date) shows again, however
   * often an earlier one was dismissed.
   */
  storageKey?: string;
  /** The language the date is written in. Default: the `<UiKitProvider locale>`. */
  locale?: string;
  /** On the root, the column of banners. */
  className?: string;
  labels?: LabelOverride<LegalLabels>;
}

const DEFAULT_STORAGE_KEY = "kit.legalChange.dismissed";

/** Is `value` an announcement the notice can show? The list comes from a server, so its
 *  entries are checked rather than trusted. */
function isAnnouncement(value: unknown): value is LegalChangeAnnouncement {
  if (typeof value !== "object" || value === null) return false;
  const { page, effective, href } = value as Record<string, unknown>;
  return (
    (page === "terms" || page === "privacy") &&
    // A bare, zero-padded day: the comparison with today is on the strings.
    isBareIsoDay(effective) &&
    parseIsoDate(effective) !== null &&
    (href === undefined || href === null || typeof href === "string")
  );
}

/** The announcements still to come on `today` — the effective day itself included —
 *  each (page, effective) once, soonest first and the terms first on one day. */
function pending(list: unknown, today: string): LegalChangeAnnouncement[] {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: LegalChangeAnnouncement[] = [];
  for (const entry of list as unknown[]) {
    if (!isAnnouncement(entry)) {
      // Not the entry itself in the message: whatever it is, printing it must not throw.
      warnLegalOnce(
        'LegalChangeNotice: an entry is not { page: "terms" | "privacy", effective: "YYYY-MM-DD" }; it is left out.',
      );
      continue;
    }
    const id = `${entry.page}.${entry.effective}`;
    if (entry.effective < today || seen.has(id)) continue;
    seen.add(id);
    out.push(entry);
  }
  const rank = (a: LegalChangeAnnouncement) => (a.page === "terms" ? 0 : 1);
  return out.sort((a, b) => (a.effective === b.effective ? rank(a) - rank(b) : a.effective < b.effective ? -1 : 1));
}

/**
 * The in-app notice of an announced change to the terms or the privacy policy
 * (docs/legal-harmonization.md §3.5, decision 10; keksdose's legal audit against the app,
 * Marcel 2026-11-09). The terms promise a material change "at least 30 days before it
 * takes effect, by email and in the app": server-kit's terms-change mail is the email,
 * this is the app.
 *
 * Per announcement, an info banner: "Our Terms of Service change on 9 December 2026. Read
 * the new text" — the date in the reader's language and the app's date preference, as the
 * legal pages' "Last updated" line writes it — until its effective date has passed. Its ×
 * dismisses it on this device, remembered per (page, effective) in `localStorage`; a
 * browser that refuses storage hides it until the next load.
 *
 * It never blocks the app: no modal, no focus taken, no question to answer — continued use
 * is not consent here, the terms' own clause says what is. Render it where the signed-in
 * app shows page-wide news (under the top bar, above the page) and hand it the list:
 *
 *     const { data } = useQuery({ queryKey: ["legal-changes"], queryFn: fetchLegalChanges });
 *     <LegalChangeNotice announcements={data} />
 *
 * Nothing to show, nothing rendered: no empty box, no gap.
 */
export function LegalChangeNotice({
  announcements,
  storageKey = DEFAULT_STORAGE_KEY,
  locale,
  className,
  labels: labelsProp,
}: LegalChangeNoticeProps) {
  const labels = useLegalLabels(labelsProp);
  const words = { ...DEFAULT_LEGAL_LABELS.changeNotice!, ...labels.changeNotice };
  const day = useDayFormatter(undefined, locale);
  // The kit's "today" — the dev clock's day while one is set (`setToday`), so a notice can
  // be walked past its date without waiting a month.
  const today = useSyncExternalStore(subscribeToday, todayIso, todayIso);
  // Dismissed here, this mount: hidden at once, and still hidden where storage refuses the
  // write (private mode, blocked site data).
  const [dismissed, setDismissed] = useState<readonly string[]>([]);

  const keyOf = (a: LegalChangeAnnouncement) => `${storageKey}.${a.page}.${a.effective}`;
  const shown = pending(announcements, today).filter(
    (a) => !dismissed.includes(keyOf(a)) && readStored(keyOf(a)) === null,
  );
  if (shown.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {shown.map((a) => {
        const key = keyOf(a);
        const href = a.href ? a.href : LEGAL_HREFS[a.page];
        return (
          <AlertBanner
            key={key}
            tone="info"
            onDismiss={() => {
              writeStored(key, "1");
              setDismissed((keys) => [...keys, key]);
            }}
            data-legal-change={a.page}
          >
            <p>
              {words[a.page](day(a.effective, { style: "long" }))}{" "}
              <TextLink href={href} tone="inherit" underline="always" className="font-medium">
                {words.read}
              </TextLink>
            </p>
          </AlertBanner>
        );
      })}
    </div>
  );
}
