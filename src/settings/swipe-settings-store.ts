import { useMemo } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { persist } from "zustand/middleware";
import { logger } from "../lib/logger";
import { readStored, readStoredJson, removeStored, writeStoredJson } from "../lib/safe-storage";
import { registerDeviceSetting } from "../lib/device-settings";
import type { Direction } from "../lib/direction";
import { DEFAULT_FEEDBACK_SWIPE, FEEDBACK_SWIPE_ACTIONS, type FeedbackSwipeAction } from "../feedback/feedback-swipe";
import {
  DEFAULT_TRANSLATION_REVIEW_SWIPE,
  TRANSLATION_REVIEW_SWIPE_ACTIONS,
  type TranslationReviewSwipeAction,
} from "../lib/translation-review";

/**
 * Which swipe does what, as each person binds it: the store behind {@link SwipeSetting}
 * (keksdose's Settings → Interaction, feedback #144 rebuilt for #404; Kurvenschmiede offers
 * the same card for its feedback inbox, Marcel 2026-11-12).
 *
 * It lived in keksdose (`shared/state/swipe-prefs-store.ts`) while keksdose was the only app
 * with the setting. The two lists it binds that are the kit's — the feedback inbox and the
 * translation review — take their ids from the kit, and a second app offering the setting
 * would have copied the store, its normalising and its card. So the kit owns them, and an
 * app's own lists (keksdose's transactions, accounts, budget) join as surfaces it declares.
 *
 * PHYSICAL SIDES. A surface keeps a `right` and a `left` ladder, because that is what the
 * card asks ("Swipe right") and what a person means by it. The kit's bindings are LOGICAL
 * (`end` toward the reading end), so the hand-off maps them: in a left-to-right page `right`
 * is `end` ({@link useSwipeBinding}, `dir`). keksdose stored the same two ladders, so its
 * stored bindings move in unchanged (`legacy`).
 */

/** The empty slot: a ladder's filler where a stage binds nothing. Not an action — the
 *  absence of one — so no surface lists it, and the hand-off drops it. */
export const SWIPE_NONE = "none";

/** {@link SWIPE_NONE}'s type. */
export type SwipeNone = typeof SWIPE_NONE;

/** The side a drag goes to, as the person sees it. */
export type SwipeSide = "right" | "left";

/** A ladder's stage: 0 at the first threshold, 1 at the longer drag. */
export type SwipeSlot = 0 | 1;

const SIDES: readonly SwipeSide[] = ["right", "left"];

/** Two stages a side, as SwipeableRow arms them: a short drag and a long one. More would
 *  spread the thresholds over the card's width until none is easy to hit. */
const SLOTS = 2;

/**
 * One surface's bindings: per physical side an ordered ladder, index 0 at the first
 * threshold, index 1 at the longer drag, {@link SWIPE_NONE} where a stage binds nothing.
 * The store always holds two entries a side, so no read has to check the length.
 */
export interface SwipeLadders<Id extends string = string> {
  right: readonly (Id | SwipeNone)[];
  left: readonly (Id | SwipeNone)[];
}

/**
 * A list whose rows swipe, as a settings store offers it: the ids its pickers list and the
 * ladders it ships with. The kit's two are {@link FEEDBACK_SWIPE_SURFACE} and
 * {@link TRANSLATION_REVIEW_SWIPE_SURFACE}; an app declares its own lists the same way
 * (keksdose's transactions, accounts and budget) and resolves their ids against its rows.
 */
export interface SwipeSurface<Id extends string = string> {
  /** The ids a stage can bind, in the order the pickers list them. An id a stored binding
   *  holds that is not here reads as the empty slot. */
  actions: readonly Id[];
  /** What a person who never chose gets, and what "Restore the shipped defaults" puts back. */
  defaults: SwipeLadders<Id>;
  /**
   * Which of the kit's lists this is, so {@link SwipeSetting} names it and its actions in
   * the kit's words — `feedback` from the status names, `translationReview` from the review
   * panel's. Left out on an app's own surface, which names itself through the card's
   * `surfaceLabels`.
   */
  kind?: "feedback" | "translationReview";
}

/** The surfaces a store offers, by id — the id is the key the bindings are stored under. */
export type SwipeSurfaces = Readonly<Record<string, SwipeSurface>>;

/** The action ids of a surface. */
export type SwipeActionOf<T> = T extends SwipeSurface<infer Id> ? Id : string;

/** A kit binding's ladders, logical sides — `FeedbackSwipeBinding`'s and
 *  `TranslationReviewSwipeBinding`'s shape, with the empty slots left out. */
export interface SwipeBinding<Id extends string = string> {
  /** A drag toward the reading START, nearest threshold first. */
  start: readonly Id[];
  /** A drag toward the reading END, nearest threshold first. */
  end: readonly Id[];
}

/** Pad or cut a ladder to {@link SLOTS} stages. */
function ladder<Id extends string>(ids: readonly (Id | SwipeNone)[] | undefined): (Id | SwipeNone)[] {
  return Array.from({ length: SLOTS }, (_, i) => ids?.[i] ?? SWIPE_NONE);
}

/**
 * The feedback inbox's phone cards (§4.5 of the feedback contract): `advance`, `done`,
 * `postpone`, `wont_do`. Its defaults are {@link DEFAULT_FEEDBACK_SWIPE}, the inbox's own
 * when it is told nothing, read left to right (`end` is right), so the two cannot drift.
 */
export const FEEDBACK_SWIPE_SURFACE: SwipeSurface<FeedbackSwipeAction> = Object.freeze({
  actions: FEEDBACK_SWIPE_ACTIONS,
  defaults: Object.freeze({
    right: Object.freeze(ladder(DEFAULT_FEEDBACK_SWIPE.end as readonly FeedbackSwipeAction[])),
    left: Object.freeze(ladder(DEFAULT_FEEDBACK_SWIPE.start as readonly FeedbackSwipeAction[])),
  }),
  kind: "feedback" as const,
});

/**
 * The translation review's phone cards (`TranslationReviewPanel`'s `swipe`): `approve`,
 * `edit`, `clear`. Its defaults are {@link DEFAULT_TRANSLATION_REVIEW_SWIPE}, approve to the
 * right and the editor to the left, each with an empty long stage.
 */
export const TRANSLATION_REVIEW_SWIPE_SURFACE: SwipeSurface<TranslationReviewSwipeAction> = Object.freeze({
  actions: TRANSLATION_REVIEW_SWIPE_ACTIONS,
  defaults: Object.freeze({
    right: Object.freeze(ladder(DEFAULT_TRANSLATION_REVIEW_SWIPE.end)),
    left: Object.freeze(ladder(DEFAULT_TRANSLATION_REVIEW_SWIPE.start)),
  }),
  kind: "translationReview" as const,
});

/**
 * One surface's stored ladders as the kit's bindings take them: logical sides, the empty
 * slots left out. `dir` is the page's reading direction (default `"ltr"`, which all seven
 * of the kit's languages are): there `right` is `end`, and in a right-to-left page `start`.
 * Duplicates stay — the plans drop a stage that repeats an earlier one, row by row.
 */
export function swipeBindingFrom<Id extends string>(
  ladders: SwipeLadders<Id> | undefined,
  { dir = "ltr" }: { dir?: Direction } = {},
): SwipeBinding<Id> {
  const side = (ids: readonly (Id | SwipeNone)[] | undefined): Id[] =>
    (ids ?? []).filter((id): id is Id => id !== SWIPE_NONE);
  const right = side(ladders?.right);
  const left = side(ladders?.left);
  return dir === "rtl" ? { start: right, end: left } : { start: left, end: right };
}

/** Every surface's ladders, by id. */
export type SwipeLadderMap = Readonly<Record<string, SwipeLadders>>;

/** What the store holds — persisted whole, `surfaces` and `baseline`. */
export interface SwipeSettingsState {
  /** Each surface's bindings, by the surface's id. */
  surfaces: SwipeLadderMap;
  /**
   * The person's OWN defaults, once they declared some (keksdose dev#472: "Set my current
   * selection as default values"): what {@link reset} goes back to. `null` until then.
   * Worth a second copy of the map because Reset is the only way out of an experiment, and
   * landing on the shipped map undid, for anyone who had rebound on purpose, the bindings
   * they meant to keep.
   */
  baseline: SwipeLadderMap | null;
  /** Bind one stage of one side of one surface. An id the surface does not list binds the
   *  empty slot, and a surface the store does not offer is left alone. */
  bind(surface: string, side: SwipeSide, slot: SwipeSlot, action: string): void;
  /** Keep the current bindings as the person's defaults. */
  saveAsDefault(): void;
  /** Back to the person's defaults, or to the shipped ones when none are saved. */
  reset(): void;
  /** Back to the shipped bindings, forgetting the person's defaults. */
  resetToShipped(): void;
}

/**
 * An app's own swipe store that came before this one — keksdose's `keksdose-swipe-prefs`
 * — read once and moved under the new key, so nobody loses a binding to the move.
 */
export interface SwipeSettingsLegacy {
  /** The key the old store persisted under (a zustand persist envelope). Removed once its
   *  bindings are under the new key. */
  storageKey: string;
  /**
   * The old envelope's `state`, and the `version` it was stored at, in this store's shape:
   * `{ surfaces: { <id>: { right, left } }, baseline }`. Default: read as it is, which is
   * keksdose's v4 shape exactly. Pass the old store's own steps for its older versions. A
   * throw moves nothing.
   */
  migrate?: (state: unknown, version: number) => unknown;
}

export interface SwipeSettingsOptions<S extends SwipeSurfaces> {
  /** The app's localStorage key, like the theme store's (`keksdose-swipe-settings`). */
  storageKey: string;
  /** The surfaces the app offers, by id, in the order the card lists them. The kit's own
   *  are {@link FEEDBACK_SWIPE_SURFACE} and {@link TRANSLATION_REVIEW_SWIPE_SURFACE}. */
  surfaces: S;
  /** An earlier store of the app's to move in from; see {@link SwipeSettingsLegacy}. */
  legacy?: SwipeSettingsLegacy;
}

export interface SwipeSettingsStore<S extends SwipeSurfaces = SwipeSurfaces> {
  /** The zustand hook: the bindings and the four actions. */
  useSwipeSettings: UseBoundStore<StoreApi<SwipeSettingsState>>;
  /**
   * One surface's bindings in the shape `FeedbackInbox`'s and `TranslationReviewPanel`'s
   * `swipe` take — `{ start, end }`, the empty slots left out — the same object until the
   * person rebinds that surface:
   *
   * ```tsx
   * <FeedbackInbox swipe={useSwipeBinding("feedback")} … />
   * <TranslationReviewPanel swipe={useSwipeBinding("translations")} … />
   * ```
   */
  useSwipeBinding<K extends keyof S & string>(
    surface: K,
    options?: { dir?: Direction },
  ): SwipeBinding<SwipeActionOf<S[K]>>;
  /** The surfaces it was made with, for {@link SwipeSetting}. */
  surfaces: S;
}

/** The format version under `storageKey`. Its own numbering, not the legacy store's. */
const VERSION = 1;

/** zustand's envelope, any object; what it holds is checked surface by surface. */
const isEnvelope = (blob: unknown): blob is { state?: unknown; version?: unknown } =>
  typeof blob === "object" && blob !== null;

/**
 * A stored surface entry checked against what the surface offers: two stages a side, each
 * an id the surface lists or the empty slot. A blob written before an action was RETIRED
 * (keksdose dev#473 took the budget's `assign` out) would otherwise keep a binding whose
 * picker has no matching option, so it would render blank and the next change to another
 * stage would save that blank as a choice. A side that is not a list takes the surface's
 * default — a blob written before the surface existed.
 */
function normalizeLadders(saved: unknown, surface: SwipeSurface): SwipeLadders {
  const entry = saved as Partial<Record<SwipeSide, unknown>> | null | undefined;
  const known = new Set<string>(surface.actions);
  const side = (value: unknown, fallback: readonly string[]): string[] => {
    const list = Array.isArray(value) ? (value as unknown[]) : fallback;
    return Array.from({ length: SLOTS }, (_, i) => {
      const id = list[i];
      return typeof id === "string" && known.has(id) ? id : SWIPE_NONE;
    });
  };
  return { right: side(entry?.right, surface.defaults.right), left: side(entry?.left, surface.defaults.left) };
}

/** Every offered surface, normalised; a surface the app no longer offers is dropped. */
function normalizeMap(saved: unknown, surfaces: SwipeSurfaces): Record<string, SwipeLadders> {
  const map = (typeof saved === "object" && saved !== null ? saved : {}) as Record<string, unknown>;
  const out: Record<string, SwipeLadders> = {};
  for (const [id, surface] of Object.entries(surfaces)) {
    out[id] = normalizeLadders(Object.hasOwn(map, id) ? map[id] : undefined, surface);
  }
  return out;
}

/** The ladders each surface ships with, fresh arrays. */
function shippedMap(surfaces: SwipeSurfaces): Record<string, SwipeLadders> {
  return normalizeMap({}, surfaces);
}

/**
 * Move the legacy store's bindings under `storageKey` — once, before the store reads it:
 * only while the new key holds nothing, and the old key is removed only once the new one
 * reads back, so a write the browser refused (quota, blocked storage) costs nothing. What
 * the blob holds is checked by the store's own merge as it hydrates.
 */
function moveLegacy(storageKey: string, legacy: SwipeSettingsLegacy | undefined): void {
  if (!legacy || legacy.storageKey === storageKey || readStored(storageKey) !== null) return;
  const old = readStoredJson(legacy.storageKey, isEnvelope);
  if (!old) return;
  let state: unknown;
  try {
    const version = typeof old.version === "number" ? old.version : 0;
    state = legacy.migrate ? legacy.migrate(old.state, version) : old.state;
  } catch {
    return;
  }
  const blob = (typeof state === "object" && state !== null ? state : {}) as { surfaces?: unknown; baseline?: unknown };
  writeStoredJson(storageKey, {
    state: { surfaces: blob.surfaces ?? null, baseline: blob.baseline ?? null },
    version: VERSION,
  });
  if (readStored(storageKey) !== null) removeStored(legacy.storageKey);
}

/**
 * Build a swipe-settings store bound to the app's storage key, shaped like
 * `createThemeStore`: one per app, at module scope.
 *
 * ```ts
 * export const swipeSettings = createSwipeSettingsStore({
 *   storageKey: "kurvenschmiede-swipe-settings",
 *   surfaces: { feedback: FEEDBACK_SWIPE_SURFACE },
 * });
 * ```
 *
 * - `useSwipeSettings` — the zustand hook; {@link SwipeSetting} reads and writes it.
 * - `useSwipeBinding(surface)` — that surface's binding for the kit's list.
 *
 * What it reads is checked against the surfaces: an id a surface does not list is the
 * empty slot, a short side is padded, a surface missing from the blob takes its defaults
 * and one the app stopped offering is dropped — the baseline the same way. It joins "Reset
 * this device's settings" as an appearance setting, through `resetToShipped`.
 */
export function createSwipeSettingsStore<const S extends SwipeSurfaces>({
  storageKey,
  surfaces,
  legacy,
}: SwipeSettingsOptions<S>): SwipeSettingsStore<S> {
  moveLegacy(storageKey, legacy);
  const useSwipeSettings = create<SwipeSettingsState>()(
    logger(
      persist(
        (set) => ({
          surfaces: shippedMap(surfaces),
          baseline: null,
          bind: (surface, side, slot, action) =>
            set((s) => {
              const offered = Object.hasOwn(surfaces, surface) ? surfaces[surface] : undefined;
              const current = s.surfaces[surface];
              if (!offered || !current || (slot !== 0 && slot !== 1) || !SIDES.includes(side)) return {};
              const next = [...current[side]];
              next[slot] = offered.actions.includes(action) ? action : SWIPE_NONE;
              return { surfaces: { ...s.surfaces, [surface]: { ...current, [side]: next } } };
            }),
          saveAsDefault: () => set((s) => ({ baseline: s.surfaces })),
          reset: () => set((s) => ({ surfaces: s.baseline ?? shippedMap(surfaces) })),
          resetToShipped: () => set({ surfaces: shippedMap(surfaces), baseline: null }),
        }),
        {
          name: storageKey,
          version: VERSION,
          partialize: (s) => ({ surfaces: s.surfaces, baseline: s.baseline }),
          // No older format of the kit's yet. A blob of another version (a newer kit's, read
          // after a downgrade) is read for what it holds, through the same merge.
          migrate: (persisted) => persisted as Pick<SwipeSettingsState, "surfaces" | "baseline">,
          merge: (persisted, current) => {
            const blob = persisted as Partial<Pick<SwipeSettingsState, "surfaces" | "baseline">> | null | undefined;
            return {
              ...current,
              surfaces: normalizeMap(blob?.surfaces, surfaces),
              // Through the same path: a baseline saved before a surface existed would
              // otherwise reset that surface to holes (keksdose dev#472).
              baseline: blob?.baseline ? normalizeMap(blob.baseline, surfaces) : null,
            };
          },
        },
      ),
      "swipe-settings",
    ),
  );
  // Reset this device's settings (docs/settings-harmonization.md §11.4): the shipped
  // bindings AND no saved defaults — a plain `reset` would go back to those.
  registerDeviceSetting({
    key: storageKey,
    kind: "appearance",
    reset: () => useSwipeSettings.getState().resetToShipped(),
  });

  function useSwipeBinding<K extends keyof S & string>(
    surface: K,
    { dir = "ltr" }: { dir?: Direction } = {},
  ): SwipeBinding<SwipeActionOf<S[K]>> {
    const ladders = useSwipeSettings((s) => s.surfaces[surface]);
    // One object per stored ladder: an inbox that keys its plan on the binding re-plans
    // only when the person rebinds this surface.
    return useMemo(
      () => swipeBindingFrom(ladders as SwipeLadders<SwipeActionOf<S[K]>> | undefined, { dir }),
      [ladders, dir],
    );
  }

  return { useSwipeSettings, useSwipeBinding, surfaces };
}
