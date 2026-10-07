import { useEffect } from "react";
import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import { readStored, writeStored } from "../lib/safe-storage";
import type { LandingSession } from "./landing-actions";
import { LoadingState } from "../components/loading-state";

/**
 * 0.31.1: a session that is still being restored — an app whose access token lives in
 * memory reads it back from its refresh token first (kastlan's 0.31 adoption). Until
 * then `/` neither shows the landing nor resumes, and a public page neither shows nor
 * redirects: both render `loading` instead.
 */
export type RoutingSession = LandingSession | "loading";

/**
 * The public routes' logic (docs/landing-demo-harmonization.md §3): what `/` shows,
 * which pages a session skips, and the page a session resumes on — keksdose's
 * `RootEntry`, `RedirectIfAuthed` and use-last-visited-page.ts, for every app.
 * Router-aware (react-router), so they belong to the `./shell` entry.
 */

/* ── ?next= ──────────────────────────────────────────────────────────────── */

/** The query parameter that carries "where I was actually trying to go" through the
 *  sign-in bounce (keksdose's `NEXT_PARAM`). */
export const NEXT_PARAM = "next";

/**
 * A `?next=` value that is safe to navigate to, or null.
 *
 * Same-origin PATHS only, decided by the URL PARSER rather than by string prefix —
 * this is the open-redirect check, and it is the reason this lives in one place
 * instead of at each call site.
 *
 * The prefix version ("starts with `/`, does not start with `//`") let two shapes
 * through that the browser resolves cross-origin, because the WHATWG parser does not
 * read them as text: a backslash after the leading slash counts as a second slash for
 * a special scheme, so `/\evil.example` resolves to `https://evil.example/`; and tab,
 * LF and CR are STRIPPED anywhere in the input before parsing, so `/<TAB>/evil.example`
 * becomes `//evil.example`. Asking the same parser the browser will use closes every
 * such shape at once, including ones nobody has thought of yet, and it normalises what
 * comes back instead of echoing the caller's spelling.
 *
 * keksdose's (shared/hooks/use-last-visited-page.ts), verbatim but for the fallback
 * origin.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const base = typeof window !== "undefined" ? window.location.origin : "https://kit.invalid";
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/* ── The last visited page (§3.2) ────────────────────────────────────────── */

/** A path to leave out: a string is the path and everything under it (`/demo` is
 *  `/demo` and `/demo/ended`; `/` is only `/`), a RegExp is tested on the pathname. */
export type PathPattern = string | RegExp;

/**
 * The pages never recorded as a resume target (§3.2): the landing (`/`, `/welcome`), the
 * auth pages, the demo's own (`/demo*`) and the legal pages. The 404 has no path of its
 * own — call {@link useLastVisitedPage} inside the signed-in layout, as keksdose does,
 * and it never sees one. The app adds its own one-shot routes (keksdose:
 * `/banks/callback`, `/join`, `/share-target`) through `exclude`.
 */
export const DEFAULT_LAST_VISITED_EXCLUDES: readonly PathPattern[] = Object.freeze([
  "/",
  "/welcome",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/demo",
  "/impressum",
  "/privacy",
  "/terms",
]);

function matchesPath(pathname: string, pattern: PathPattern): boolean {
  if (typeof pattern !== "string") return new RegExp(pattern.source, pattern.flags.replace("g", "")).test(pathname);
  if (pattern === "/") return pathname === "/";
  const base = pattern.endsWith("/") ? pattern.slice(0, -1) : pattern;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Whether `pathname` is one of the defaults or the app's `exclude`. */
function isExcluded(pathname: string, exclude: readonly PathPattern[]): boolean {
  return [...DEFAULT_LAST_VISITED_EXCLUDES, ...exclude].some((pattern) => matchesPath(pathname, pattern));
}

export interface LastVisitedPageOptions {
  /** The device key: `<app>.lastVisitedPage` (§3.2), one per app on the origin. */
  key: string;
  /** The app's own paths to leave out, ON TOP of {@link DEFAULT_LAST_VISITED_EXCLUDES}. */
  exclude?: readonly PathPattern[];
  /** `false` records nothing — while the session is still being restored, say. */
  enabled?: boolean;
}

/**
 * Remember the page a session is on (path and query), on every navigation, so `/` — a
 * revisit, a fresh sign-in, the installed PWA, whose `start_url` is `/` — resumes there
 * (§3.2, keksdose feedback #59). Device-local, in `localStorage` under `key`; a blocked
 * storage records nothing.
 *
 * Call it once in the signed-in layout. The excluded paths are never written, so a
 * one-shot page (a bank callback, an invitation link) never becomes the place the next
 * launch opens on.
 */
export function useLastVisitedPage({ key, exclude = [], enabled = true }: LastVisitedPageOptions): void {
  const { pathname, search } = useLocation();
  // Decided here, so the effect depends on the answer and not on an `exclude` array the
  // caller likely builds inline.
  const skip = !enabled || isExcluded(pathname, exclude);
  useEffect(() => {
    if (skip) return;
    writeStored(key, pathname + search);
  }, [key, pathname, search, skip]);
}

/**
 * The page {@link useLastVisitedPage} remembered under `key` — checked by
 * {@link safeNextPath}, so a value someone planted in storage cannot leave the origin —
 * or `fallback` (default `null`) when there is none or storage is blocked. A string
 * fallback narrows the answer to a string, for react-router's `to`.
 */
export function readLastVisitedPage(key: string, fallback: string): string;
export function readLastVisitedPage(key: string, fallback?: null): string | null;
export function readLastVisitedPage(key: string, fallback: string | null = null): string | null {
  return safeNextPath(readStored(key)) ?? fallback;
}

/** Forget the remembered page — on an explicit sign-out, so the next account does not
 *  resume on the previous one's page. */
export function clearLastVisitedPage(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // storage blocked: there is nothing to forget
  }
}

/* ── RootEntry ───────────────────────────────────────────────────────────── */

export interface RootEntryProps {
  /** Without a session `/` is the landing; with one (real or demo) it resumes;
   *  `"loading"` while the app restores one. */
  session: RoutingSession;
  /** What shows while `session` is `"loading"`. Default: the kit's `LoadingState`. */
  loading?: ReactNode;
  /** The remembered page — `readLastVisitedPage(key)`. */
  resumePath?: string | null;
  /** The landing page element. */
  landing: ReactNode;
  /** The app's home: where a session goes with nothing to resume (keksdose `/budget`,
   *  kastlan and Kurvenschmiede `/dashboard`). */
  home: string;
}

/**
 * The `/` route (§3.1): the landing for a visitor, and for a session — real or demo —
 * the last visited page, else the app's home. Indexed and canonical `/` for the visitor;
 * a crawler never has a session, so for it `/` is stable.
 *
 * keksdose showed a session with nothing remembered the landing; the contract sends it
 * home instead, because a session at `/` came to use the app. The landing stays one tap
 * away at `/welcome`, where the signed-in brand link points.
 */
export function RootEntry({ session, resumePath, landing, home, loading }: RootEntryProps) {
  if (session === "loading") return <>{loading ?? <LoadingState />}</>;
  if (session === "none") return <>{landing}</>;
  const resume = safeNextPath(resumePath);
  return <Navigate to={resume && resume !== "/" ? resume : home} replace />;
}

/* ── RedirectIfAuthed ────────────────────────────────────────────────────── */

export interface RedirectIfAuthedProps {
  /** `"loading"` while the app restores a session: neither the page nor a redirect. */
  session: RoutingSession;
  /** What shows while `session` is `"loading"`. Default: the kit's `LoadingState`. */
  loading?: ReactNode;
  /**
   * Let a DEMO session through (§5.6): on `/login`, `/register` and the app's invitation
   * pages, so a demo visitor can sign in or accept an invitation — a successful one
   * replaces the demo session. Default `false`: on `/demo` a live demo continues instead
   * of starting a second one (§5.2), and on `/forgot-password` a demo has no password.
   */
  allowDemo?: boolean;
  /** Where a redirected session goes: the resume target —
   *  `readLastVisitedPage(key, home)`. A safe `?next=` goes first. */
  fallback: string;
  /** The page. Left out, an `<Outlet />`: the component is a layout route around the
   *  public pages, as in keksdose. */
  children?: ReactNode;
}

/**
 * Public pages a session skips (§3.1): a signed-in visitor at `/login` goes back into
 * the app, to a safe `?next=` when the URL carries one (a share invitation or a push
 * deep link opened with a live session in another tab — keksdose) and else to
 * `fallback`.
 *
 * A demo session passes where `allowDemo` says so (§5.6). Mount one wrapper with
 * `allowDemo` around `/login`, `/register` and the invitation pages, and one without
 * around `/demo` (and `/forgot-password`).
 */
export function RedirectIfAuthed({ session, allowDemo = false, fallback, children, loading }: RedirectIfAuthedProps) {
  const { search } = useLocation();
  if (session === "loading") return <>{loading ?? <LoadingState />}</>;
  if (session === "none" || (session === "demo" && allowDemo)) {
    return children === undefined ? <Outlet /> : <>{children}</>;
  }
  const next = safeNextPath(new URLSearchParams(search).get(NEXT_PARAM));
  return <Navigate to={next ?? fallback} replace />;
}
