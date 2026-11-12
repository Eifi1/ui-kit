import { useState } from "react";
import { ArrowLeft, ArrowRight, BookmarkCheck, RotateCcw } from "lucide-react";

import { useKitLabels, type LabelOverride } from "../i18n/kit-labels";
import { Button } from "../components/button";
import { ChoiceField, type ChoiceFieldOption } from "../components/choice-field";
import { NavPills } from "../components/nav-pills";
import { SectionLabel } from "../components/text";
import {
  DEFAULT_TRANSLATION_REVIEW_LABELS,
  type TranslationReviewLabels,
} from "../components/translation-review-labels";
import { useFeedbackStatusLabels, type FeedbackStatusLabels } from "../feedback/feedback-labels";
import { CARD_DESCRIPTION_CLASS } from "./settings-card-classes";
import { useSettingsLayout } from "./settings-context";
import { SettingsSection, type SettingsSectionProps } from "./settings-section";
import {
  SWIPE_NONE,
  type SwipeSettingsStore,
  type SwipeSide,
  type SwipeSlot,
  type SwipeSurface,
} from "./swipe-settings-store";
import { DEFAULT_SWIPE_SETTING_LABELS } from "./swipe-setting-labels";

/* ── Labels ──────────────────────────────────────────────────────────────── */

/** Every string {@link SwipeSetting} renders of its own — the `swipeSetting` namespace of
 *  `<UiKitProvider labels>`, overridable per instance through `labels`. The kit's lists'
 *  actions are named in their own words: the feedback statuses (`feedbackStatus`) and the
 *  review panel's buttons (`translationReview`), as the swipe panels name them. */
export interface SwipeSettingLabels {
  /** The card's title, and the app's catalogue entry's. */
  title: string;
  /** The line under it. */
  description: string;
  /** The accessible name of the strip of lists. */
  surfacePicker: string;
  /** The kit's lists' names, by `SwipeSurface.kind`. */
  surfaces: { feedback: string; translationReview: string };
  /** A side's heading, the name of its two pickers' group. */
  right: string;
  left: string;
  /** The pickers: the first threshold and the longer drag. */
  primary: string;
  secondary: string;
  /** The empty slot's option. */
  none: string;
  /** The feedback list's `advance`: one step along the chain, to whichever status is next. */
  nextStatus: string;
  /** The line under the pickers: what the two stages do. */
  help: string;
  /** Keep the current bindings as the person's defaults. */
  saveDefault: string;
  /** Back to the shipped bindings — while no defaults of the person's are saved. */
  reset: string;
  /** Back to the person's saved defaults. */
  resetMine: string;
  /** Said once defaults are saved, before {@link resetShipped}. */
  defaultSaved: string;
  /** The link back to the shipped bindings, forgetting the saved ones. */
  resetShipped: string;
  /** For the app's catalogue entry (`keywords`); the card never reads it. */
  keywords: string;
}

// Defined in ./swipe-setting-labels, which holds no component code.
export { DEFAULT_SWIPE_SETTING_LABELS };

/** The words of a surface the app added: its name on the strip, and each action's name in
 *  the pickers — plain text, since a native `<option>` holds nothing else. */
export interface SwipeSurfaceLabels {
  name?: string;
  actions?: Readonly<Record<string, string>>;
}

/* ── The card ────────────────────────────────────────────────────────────── */

/** The card's DOM id by default: its catalogue entry's `anchor`, the `?focus=` target. */
export const SWIPE_SETTING_ANCHOR = "settings-swipe";

const SIDES: readonly SwipeSide[] = ["right", "left"];
const SLOTS: readonly SwipeSlot[] = [0, 1];

export interface SwipeSettingProps extends Omit<
  SettingsSectionProps,
  "anchor" | "title" | "description" | "action" | "children"
> {
  /** The app's store, from `createSwipeSettingsStore`. */
  store: Pick<SwipeSettingsStore, "useSwipeSettings" | "surfaces">;
  /**
   * The surfaces to offer, by id, in this order. Default: every surface of the store, in
   * its order. keksdose offers the translation review's only to a reviewer, whose page it
   * is. An id the store does not have is skipped; none at all renders nothing.
   */
  surfaces?: readonly string[];
  /**
   * The words of the app's own surfaces, by id — its name, and its actions' — in the app's
   * language. The kit's surfaces (a `kind`) are named by the kit; an entry here overrides
   * those words too. A surface or action without words shows its id.
   */
  surfaceLabels?: Readonly<Record<string, SwipeSurfaceLabels>>;
  /** The card's DOM id, its catalogue entry's `anchor`. Default {@link SWIPE_SETTING_ANCHOR}. */
  anchor?: string;
  labels?: LabelOverride<SwipeSettingLabels>;
}

interface SurfaceWords {
  name: string;
  actions: Readonly<Record<string, string>>;
}

/**
 * Which swipe does what, per list — the card of `createSwipeSettingsStore`'s store
 * (keksdose's Settings → Interaction, feedback #144 rebuilt for #404).
 *
 * Per list, four pickers: a short and a long swipe, to the right and to the left. There is
 * no on/off switch — both stages of a side on "none" is how a side goes quiet, the same
 * statement with one control fewer (#404: *"that checkbox only toggles whether swipe works
 * or not. That is not the point and it should work always"*). An action a row cannot take
 * drops out of the ladder there, and the next one moves up (the line under the pickers).
 *
 * - **One list at a time** (keksdose live #234): a {@link NavPills} strip that wraps rather
 *   than scrolls (#332), the pickers of the list it names under it. Four lists of four
 *   pickers in one column was sixteen selects to scroll past. With one list there is no
 *   strip.
 * - **The list is in the URL** inside a {@link SettingsLayout} (live #235): the path segment
 *   after the group, `/settings/interaction/feedback`, read and set through the layout's
 *   `sub` and `selectSub` — a replace, so switching lists does not fill the back stack. An
 *   unknown segment falls back to the first list. Outside a layout the choice is local.
 * - **"Set as my defaults"** (dev#472): Reset then comes back to them, and the shipped
 *   bindings stay one link away.
 *
 * Each side is a `<fieldset>` named by its heading, so a screen reader hears "Swipe right"
 * before the two "Short swipe" / "Long swipe" pickers in it, and the right side's are not
 * confused with the left's.
 *
 * The app adds the catalogue entry, `{ id, group, anchor: SWIPE_SETTING_ANCHOR, title,
 * keywords }` (title and keywords from these labels): inside a `SettingsLayout`,
 * `SettingsSection` throws in development without it.
 */
export function SwipeSetting({
  store,
  surfaces: offeredProp,
  surfaceLabels,
  anchor = SWIPE_SETTING_ANCHOR,
  labels: labelsProp,
  ...rest
}: SwipeSettingProps) {
  const labels = useKitLabels("swipeSetting", DEFAULT_SWIPE_SETTING_LABELS, labelsProp);
  const status = useFeedbackStatusLabels();
  const review = useKitLabels("translationReview", DEFAULT_TRANSLATION_REVIEW_LABELS);
  const { useSwipeSettings, surfaces: specs } = store;
  const bound = useSwipeSettings((s) => s.surfaces);
  const baseline = useSwipeSettings((s) => s.baseline);
  const bind = useSwipeSettings((s) => s.bind);
  const saveAsDefault = useSwipeSettings((s) => s.saveAsDefault);
  const reset = useSwipeSettings((s) => s.reset);
  const resetToShipped = useSwipeSettings((s) => s.resetToShipped);

  const layout = useSettingsLayout();
  const [localSub, setLocalSub] = useState<string | null>(null);
  const offered = (offeredProp ?? Object.keys(specs)).filter((id) => Object.hasOwn(specs, id));
  const sub = layout ? layout.sub : localSub;
  const surface = sub !== null && offered.includes(sub) ? sub : offered[0];
  // The layout owns the path: this card knows which list it binds, not which group it is
  // filed under.
  const setSurface = (next: string) => (layout ? layout.selectSub(next) : setLocalSub(next));

  if (surface === undefined) return null;

  const wordsOf = (id: string): SurfaceWords => {
    const spec = specs[id] as SwipeSurface;
    const kit = kitWords(spec, labels, status, review);
    const app = surfaceLabels?.[id];
    return { name: app?.name ?? kit?.name ?? id, actions: { ...kit?.actions, ...app?.actions } };
  };
  const words = wordsOf(surface);
  const options: ChoiceFieldOption<string>[] = [
    { value: SWIPE_NONE, label: labels.none },
    ...specs[surface].actions.map((id) => ({ value: id, label: words.actions[id] ?? id })),
  ];
  const ladders = bound[surface];

  return (
    <SettingsSection
      {...rest}
      anchor={anchor}
      title={labels.title}
      description={labels.description}
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={saveAsDefault}>
            <BookmarkCheck className="size-4" aria-hidden />
            {labels.saveDefault}
          </Button>
          <Button variant="secondary" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
            {baseline ? labels.resetMine : labels.reset}
          </Button>
        </div>
      }
    >
      {baseline && (
        <p className={CARD_DESCRIPTION_CLASS}>
          {labels.defaultSaved}{" "}
          <Button type="button" variant="link" size="sm" onClick={resetToShipped}>
            {labels.resetShipped}
          </Button>
        </p>
      )}
      <div className="border-t border-subtle pt-3">
        {offered.length > 1 && (
          // Not Tabs: the pills switch the rest of the card and are no `role="tab"`, so the
          // current one is `aria-current`; a group, not a `<nav>`: it is not the page's
          // navigation.
          <NavPills
            aria-label={labels.surfacePicker}
            landmark={false}
            className="mb-3"
            items={offered.map((id) => ({ value: id, label: wordsOf(id).name }))}
            current={surface}
            onSelect={setSurface}
          />
        )}
        {/* Keyed on the list, so switching mounts its own four pickers rather than handing
            the last list's selects another option set. */}
        <div key={surface} className="grid min-w-0 gap-3 sm:grid-cols-2">
          {SIDES.map((side) => (
            <fieldset key={side} className="min-w-0 space-y-2">
              <SectionLabel as="legend" className="flex items-center gap-1.5">
                {side === "right" ? (
                  <ArrowRight className="size-3.5" aria-hidden />
                ) : (
                  <ArrowLeft className="size-3.5" aria-hidden />
                )}
                {labels[side]}
              </SectionLabel>
              {SLOTS.map((slot) => (
                <ChoiceField
                  key={slot}
                  // A select at every width: five answers are wider than half a card.
                  layout="select"
                  label={slot === 0 ? labels.primary : labels.secondary}
                  value={ladders?.[side][slot] ?? SWIPE_NONE}
                  onChange={(action) => bind(surface, side, slot, action)}
                  options={options}
                />
              ))}
            </fieldset>
          ))}
        </div>
      </div>
      <p className={CARD_DESCRIPTION_CLASS}>{labels.help}</p>
    </SettingsSection>
  );
}

/**
 * The kit's words for one of its own lists — the words its swipe panels say, so the picker
 * names an action as the drag will: the status it sets (`done` → "Done"), the review
 * panel's button (`edit` → "Needs a change"). Only `advance` has its own: its panel says the
 * NEXT status, which depends on the row.
 */
function kitWords(
  spec: SwipeSurface,
  labels: SwipeSettingLabels,
  status: FeedbackStatusLabels,
  review: TranslationReviewLabels,
): SurfaceWords | null {
  switch (spec.kind) {
    case "feedback":
      return {
        name: labels.surfaces.feedback,
        actions: { advance: labels.nextStatus, done: status.DONE, postpone: status.POSTPONED, wont_do: status.WONT_DO },
      };
    case "translationReview":
      return {
        name: labels.surfaces.translationReview,
        actions: { approve: review.approve, edit: review.flag, clear: review.reset },
      };
    default:
      return null;
  }
}
