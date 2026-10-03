import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { KeyRound, RotateCcw } from "lucide-react";
import {
  AlertBanner,
  Button,
  EmptyState,
  Input,
  KIT_LANGUAGES,
  LoadingState,
  ServerWakeNotice,
  Spinner,
  TranslationExportButton,
  TranslationLocaleTabs,
  TranslationReviewPanel,
  WriteLockProvider,
  createServerWake,
  dropReviews,
  fromApiReview,
  mergeReviews,
  toApiWrite,
  toast,
  useSearchParamState,
  useServerWakeStage,
} from "@eifi1/ui-kit";
import type {
  ApiTranslationReview,
  TranslationReviewKey,
  TranslationReviewSaveInfo,
  TranslationReviewWrite,
} from "@eifi1/ui-kit";
import { useLocale } from "../i18n";
import { REVIEW_BUDGET_MS, createReviewClient, isReviewApiError } from "./client";
import type { ReviewClient } from "./client";
import { buildKitRows, kitCatalogues, referenceLocaleFor } from "./rows";
import {
  buildBase,
  isDevBuild,
  normaliseBase,
  readDevBase,
  readStoredToken,
  storeDevBase,
  storeToken,
} from "./session";

/**
 * /kit-review — the kit's own words, reviewed live against keksdose's review database.
 *
 * keksdose's /translations lists the kit's labels beside its own strings as `kit.…` rows
 * and stores a verdict per (locale, key). This page reads and writes THOSE rows, through
 * keksdose's API, so a reviewer can work through the kit's words where the kit lives:
 * the rows are built the way keksdose builds them (./rows.ts), the requests are keksdose's
 * own routes (./client.ts), and a verdict given here shows on keksdose's page and back.
 *
 * Who may do it is keksdose's to say: it mints a short-lived review token and opens
 * `#/kit-review?token=…`. The token leaves the address at once (sessionStorage, this tab
 * only); without one the page explains itself and fetches nothing but `/health`.
 *
 * keksdose sleeps (Cloud Run, no minimum instance), so the first request after a break
 * starts it. `/health` is pinged on arrival so it is warming while the reviewer reads,
 * every call has a 60 s budget with retries (client.ts), and the wait is said in words —
 * inline while the review loads, by the kit's ServerWakeNotice after that.
 */

/** Counts every call this page makes — reads AND writes: each is a small JSON request a
 *  reviewer is waiting on, none an upload or a download (the default counts GETs only). */
const wake = createServerWake({ shouldWatch: () => true });

/** keksdose's chunk: the server takes 2000 per request. */
const SAVE_CHUNK = 1000;

const BUDGET_S = Math.round(REVIEW_BUDGET_MS / 1000);

const languageLabel = (code: string) => KIT_LANGUAGES.find((l) => l.code === code)?.nativeName ?? code;

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : "That did not work. Please try again.");

interface Loaded {
  locales: string[];
  areas: string[] | null;
  reviews: ApiTranslationReview[];
  strings: Record<string, Record<string, string>>;
}

/** A load's outcome, tagged with what it was for: `session` (base + token) and `key`
 *  (the session + the reload count). */
type LoadResult = { key: string; session: string } & ({ ok: true; data: Loaded } | { ok: false; error: unknown });

export function KitReviewPage() {
  // ── Where: the build's base, or (dev builds only) one typed in ──
  const dev = isDevBuild();
  const fromBuild = buildBase();
  const [devBase, setDevBase] = useState<string | null>(() => (dev ? readDevBase() : null));
  const base = fromBuild ?? (dev ? normaliseBase(devBase) : undefined);

  // ── The token: handed over in the address, kept for this tab ──
  const [urlToken, setUrlToken] = useSearchParamState("token", "", { history: "replace" });
  const [token, setToken] = useState<string | null>(() => urlToken || readStoredToken());
  const [handedOver, setHandedOver] = useState(urlToken);
  const [expired, setExpired] = useState(false);
  if (urlToken && urlToken !== handedOver) {
    // A new link into a tab that is already open.
    setHandedOver(urlToken);
    setToken(urlToken);
    setExpired(false);
  }
  useEffect(() => {
    if (!urlToken) return;
    storeToken(urlToken);
    // `replace`: the entry WITH the token is rewritten, not left behind for Back.
    setUrlToken("");
  }, [urlToken, setUrlToken]);

  const takeToken = (next: string) => {
    storeToken(next);
    setToken(next);
    setExpired(false);
  };
  // Either way the panel's Undo toasts go too: they would write with the token just dropped.
  const forget = () => {
    storeToken(null);
    setToken(null);
    setExpired(false);
    toast.dismiss();
  };
  const expire = useCallback(() => {
    storeToken(null);
    setToken(null);
    setExpired(true);
    toast.dismiss();
  }, []);

  // ── Abort everything when the page goes ──
  const life = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    life.current = controller;
    return () => controller.abort();
  }, []);

  // ── Wake the server while the reviewer reads ──
  const [health, setHealth] = useState<{ base: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!base) return;
    const controller = new AbortController();
    createReviewClient({ base, watcher: wake })
      .health({ signal: controller.signal })
      .then(
        () => setHealth({ base, ok: true }),
        (error: unknown) => {
          if (!isReviewApiError(error, "aborted")) setHealth({ base, ok: false });
        },
      );
    return () => controller.abort();
  }, [base]);
  const serverState = !base || health?.base !== base ? "waking" : health.ok ? "awake" : "unreachable";

  // ── The review ──
  const client = useMemo<ReviewClient | null>(
    () => (base && token ? createReviewClient({ base, token, watcher: wake }) : null),
    [base, token],
  );
  const session = base && token ? `${base}\n${token}` : null;
  const [reload, setReload] = useState(0);
  const loadKey = session ? `${session}\n${reload}` : null;
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (!client || !session || !loadKey) return;
    const controller = new AbortController();
    const { signal } = controller;
    (async (): Promise<Loaded> => {
      const answer = await client.list({ signal });
      const strings = kitCatalogues(answer.locales);
      return { locales: answer.locales, areas: answer.areas ?? null, reviews: answer.reviews, strings };
    })().then(
      (data) => {
        if (!signal.aborted) setResult({ key: loadKey, session, ok: true, data });
      },
      (error: unknown) => {
        if (signal.aborted || isReviewApiError(error, "aborted")) return;
        if (isReviewApiError(error, "unauthorized")) expire();
        else setResult({ key: loadKey, session, ok: false, error });
      },
    );
    return () => controller.abort();
  }, [client, session, loadKey, expire]);

  const current = result && result.session === session ? result : null;
  const loading = loadKey !== null && result?.key !== loadKey;
  const data = current?.ok ? current.data : null;
  const loadError = current && !current.ok && current.key === loadKey ? current.error : null;

  // ── Writes: through the panel's queue, one at a time; the lock holds them during a reload ──
  const [writing, setWriting] = useState(0);
  const send = async <T,>(work: (c: ReviewClient, signal: AbortSignal | undefined) => Promise<T>): Promise<T> => {
    if (!client) throw new Error("Not connected to keksdose.");
    setWriting((n) => n + 1);
    try {
      return await work(client, life.current?.signal);
    } catch (error) {
      if (isReviewApiError(error, "unauthorized")) expire();
      throw error;
    } finally {
      setWriting((n) => n - 1);
    }
  };
  const patchReviews = (update: (reviews: ApiTranslationReview[]) => ApiTranslationReview[]) =>
    setResult((prev) => (prev?.ok ? { ...prev, data: { ...prev.data, reviews: update(prev.data.reviews) } } : prev));

  const onSave = async (writes: TranslationReviewWrite[], { toasted }: TranslationReviewSaveInfo) => {
    const items = writes.map(toApiWrite);
    const written = await send(async (c, signal) => {
      const out: ApiTranslationReview[] = [];
      for (const part of chunks(items, SAVE_CHUNK)) out.push(...(await c.save(part, { signal })));
      return out;
    });
    // The answer patches the copy, so a click does not download every verdict again.
    patchReviews((reviews) => mergeReviews(reviews, written));
    // The panel answers an approval with its own Undo toast; only the rest is ours.
    if (!toasted) toast.success("Saved");
  };
  const onClear = async (keys: TranslationReviewKey[], { toasted }: TranslationReviewSaveInfo) => {
    await send(async (c, signal) => {
      for (const part of chunks(keys, SAVE_CHUNK)) await c.clear(part, { signal });
    });
    patchReviews((reviews) => dropReviews(reviews, keys));
    if (!toasted) toast.success("Back to unreviewed");
  };

  // ── Rows ──
  const rowsByLocale = useMemo(
    () => (data ? buildKitRows(data.locales, data.strings, data.reviews.map(fromApiReview), data.areas) : null),
    [data],
  );
  const allRows = useMemo(() => (rowsByLocale ? [...rowsByLocale.values()].flat() : []), [rowsByLocale]);
  const allowed = data?.locales ?? [];
  const [localeParam, setLocaleParam] = useSearchParamState("locale", "", { history: "replace" });
  const locale = allowed.includes(localeParam) ? localeParam : (allowed[0] ?? "");
  const { tag } = useLocale();
  const formatDate = useCallback(
    (iso: string) => new Date(iso).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" }),
    [tag],
  );

  // ── States ──
  const changeDevBase = (next: string | null) => {
    storeDevBase(next);
    setDevBase(next);
  };
  const clearDevBase = fromBuild ? undefined : () => changeDevBase(null);
  if (!base) return <NotConfigured dev={dev} devBase={devBase} onDevBase={changeDevBase} />;

  if (!token) {
    return (
      <Shell base={base} onClearDevBase={clearDevBase}>
        {expired && (
          <AlertBanner tone="warning" data-expired="">
            <Titled title="Your review token has expired or was revoked">
              It has been dropped from this tab. Open the kit review again from keksdose&rsquo;s Translations page, or
              paste a new token below.
            </Titled>
          </AlertBanner>
        )}
        <Intro />
        <TokenForm onToken={takeToken} />
        <ServerLine state={serverState} />
      </Shell>
    );
  }

  if (loadError) {
    const forbidden = isReviewApiError(loadError, "forbidden");
    return (
      <Shell base={base} onClearDevBase={clearDevBase}>
        <AlertBanner
          tone="danger"
          data-load-error=""
          action={
            forbidden ? undefined : (
              <Button size="sm" variant="secondary" onClick={() => setReload((n) => n + 1)}>
                <RotateCcw aria-hidden className="size-4" />
                Retry
              </Button>
            )
          }
        >
          <Titled title={forbidden ? "keksdose refused this token" : "The review could not be loaded"}>
            {messageOf(loadError)}
          </Titled>
        </AlertBanner>
        {forbidden && <TokenForm onToken={takeToken} label="Another review token" />}
        <div>
          <Button variant="ghost" size="sm" onClick={forget}>
            Forget this token
          </Button>
        </div>
      </Shell>
    );
  }

  if (!data || !rowsByLocale) return <Waiting />;

  const rows = rowsByLocale.get(locale) ?? [];
  return (
    <Shell base={base} onClearDevBase={clearDevBase}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-secondary)]">
          {allRows.length.toLocaleString(tag)} kit strings in {allowed.length === 1 ? "one language" : `${allowed.length} languages`}
          , as keksdose&rsquo;s Translations page lists them.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <TranslationExportButton
            rows={allRows}
            locales={allowed}
            fileName={`ui-kit-translation-corrections-${new Date().toISOString().slice(0, 10)}.json`}
          />
          <Button
            variant="ghost"
            size="sm"
            pending={loading}
            disabledReason={writing > 0 ? "Waiting for a save to finish." : undefined}
            onClick={() => setReload((n) => n + 1)}
          >
            <RotateCcw aria-hidden className="size-4" />
            Reload
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabledReason={writing > 0 ? "Waiting for a save to finish." : undefined}
            onClick={forget}
          >
            <KeyRound aria-hidden className="size-4" />
            Forget token
          </Button>
        </div>
      </div>
      {allowed.length > 1 && (
        <TranslationLocaleTabs
          locales={allowed.map((code) => ({ value: code, label: languageLabel(code), rows: rowsByLocale.get(code) ?? [] }))}
          active={locale}
          onChange={setLocaleParam}
        />
      )}
      {allRows.length === 0 ? (
        <EmptyState
          title="Nothing of the kit's to review with this token"
          hint={
            data.areas
              ? `Its grant is limited to ${data.areas.join(", ")}, and the kit's words lie outside it.`
              : "keksdose granted no language this page can show."
          }
        />
      ) : (
        // A reload replaces the verdicts underneath the panel: hold writes until it is back.
        <WriteLockProvider locked={loading} reason="Reloading the review — saving waits until it is back.">
          <TranslationReviewPanel
            // A new locale is a new list: the editor and the selection belong to the old one.
            key={locale}
            rows={rows}
            localeLabel={languageLabel(locale)}
            referenceLabel={languageLabel(referenceLocaleFor(locale))}
            swipe
            groupBy="namespace"
            undo
            onSave={onSave}
            onClear={onClear}
            areas={data.areas}
            sourceLabels={{ kit: "Kit" }}
            storageKey="kit-review"
            formatDate={formatDate}
            formatError={messageOf}
          />
        </WriteLockProvider>
      )}
      {/* Covers what happens after the first load — a save or a reload that meets a
          sleeping server. The first load says it inline (`Waiting`). */}
      <ServerWakeNotice watcher={wake} appName="keksdose" />
    </Shell>
  );
}

// ── Parts ──────────────────────────────────────────────────────────────────────

/** A banner's first line in bold, then the explanation. */
function Titled({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span className="block">
      <span className="block font-medium text-[var(--text-primary)]">{title}</span>
      <span className="mt-0.5 block">{children}</span>
    </span>
  );
}

function Shell({
  base,
  onClearDevBase,
  children,
}: {
  base: string;
  /** Set when the base was typed in on this device (dev builds): offers to change it. */
  onClearDevBase?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-4">
      {children}
      <p className="text-xs text-[var(--text-muted)]">
        Talking to <code className="break-all font-mono">{base}</code>
        {onClearDevBase && (
          <>
            {" "}
            — a development base, set on this device.{" "}
            <Button variant="link" size="sm" onClick={onClearDevBase}>
              Change
            </Button>
          </>
        )}
      </p>
    </div>
  );
}

function Intro() {
  return (
    <div className="max-w-3xl space-y-2 text-sm text-[var(--text-secondary)]">
      <p>
        Every string the kit renders, in each language keksdose ships, as the rows keksdose&rsquo;s{" "}
        <code className="font-mono">/translations</code> page lists under <code className="font-mono">kit.</code> —
        and the same verdicts, stored in keksdose&rsquo;s database. Approving a string here approves it there.
      </p>
      <p>
        To start, open keksdose&rsquo;s Translations page and follow its link to the kit review: keksdose opens this
        page with a short-lived review token, which leaves the address at once and is kept for this tab only. Or paste
        a token here.
      </p>
    </div>
  );
}

function TokenForm({ onToken, label = "Review token" }: { onToken: (token: string) => void; label?: string }) {
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  return (
    <form
      className="flex max-w-xl flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) onToken(trimmed);
      }}
    >
      <div className="min-w-0 flex-1 basis-60">
        <Input
          label={label}
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <Button type="submit" variant="primary" disabled={!trimmed}>
        Use this token
      </Button>
    </form>
  );
}

function ServerLine({ state }: { state: "waking" | "awake" | "unreachable" }) {
  const text =
    state === "awake"
      ? "keksdose is awake."
      : state === "unreachable"
        ? `keksdose did not answer within ${BUDGET_S} s — it may still be starting, or be down.`
        : "Waking keksdose — it sleeps when nobody uses it, so it is started now, while you read.";
  return (
    <p className="flex items-center gap-2 text-xs text-[var(--text-muted)]" data-server={state}>
      {state === "waking" && <Spinner label={null} className="size-3" />}
      {text}
    </p>
  );
}

/** The first load, in words that follow the kit's watcher: loading, slow, waking. */
function Waiting() {
  const stage = useServerWakeStage(wake);
  if (stage !== "waking") {
    return (
      <LoadingState
        label={stage === "slow" ? "Still loading — keksdose is taking longer than usual." : "Loading the kit review…"}
      />
    );
  }
  return (
    <div className="py-8" data-waking="">
      <AlertBanner tone="warning" icon={<Spinner label={null} className="size-4" />}>
        <Titled title="Waking the server…">
          keksdose sleeps when nobody is using it, and the first request after a break has to start it again — that
          can take up to a minute. This page keeps asking for {BUDGET_S} seconds; the review fills in by itself.
        </Titled>
      </AlertBanner>
    </div>
  );
}

function NotConfigured({
  dev,
  devBase,
  onDevBase,
}: {
  dev: boolean;
  devBase: string | null;
  onDevBase: (base: string | null) => void;
}) {
  const [value, setValue] = useState(devBase ?? "");
  const valid = normaliseBase(value);
  return (
    <div className="min-w-0 space-y-4">
      <EmptyState
        title="The live review is not configured in this build"
        hint={
          <>
            This page reads and writes keksdose&rsquo;s review database, and this build was made without its address (
            <code className="font-mono">VITE_REVIEW_API_BASE</code>). The GitHub Pages build sets it from the repository
            variable <code className="font-mono">REVIEW_API_BASE</code>; a local dev server or a fork has none.
          </>
        }
      />
      {dev && (
        <form
          className="flex max-w-xl flex-wrap items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (valid) onDevBase(valid);
          }}
        >
          <div className="min-w-0 flex-1 basis-60">
            <Input
              label="API base (development only)"
              placeholder="http://localhost:8000/api/v1"
              hint="Kept on this device. keksdose must allow this origin in its CORS settings."
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={value}
              invalid={value.trim() !== "" && !valid}
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!valid} className="mt-1">
            Use this base
          </Button>
          {devBase && (
            <Button type="button" variant="ghost" className="mt-1" onClick={() => onDevBase(null)}>
              Clear
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
