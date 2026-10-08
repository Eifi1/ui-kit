import { useKitLabels } from "../i18n/kit-labels";
import type { ContrastMode } from "../theme/contrast";
import type { TextSize } from "../theme/text-size";

/**
 * The `appearance` namespace (0.32, docs/text-size-harmonization.md §6): the words of the
 * two new settings in the core `appearance` group — `TextSizeSetting` and
 * `ContrastSetting` — and of any quick switch an app builds from the same vocabulary (the
 * showcase's top bar). Like every kit label: prop > `<UiKitProvider labels={{ appearance
 * }}>` > English.
 */
export interface AppearanceLabels {
  /** The text-size setting's name. */
  textSize: string;
  /** One line under it: what changes, so "Large" is not mistaken for zoom. */
  textSizeHelp: string;
  /** The three steps, in {@link TEXT_SIZES} order. */
  textSizes: Record<TextSize, string>;
  /** The contrast setting's name. */
  contrast: string;
  /** One line under it. */
  contrastHelp: string;
  /** The three choices, in {@link CONTRAST_MODES} order. */
  contrastModes: Record<ContrastMode, string>;
  /**
   * The account could not keep the pick (`useAccountAppearance`'s `pickTextSize` /
   * `pickContrast` rejected): this device keeps it, the account doesn't. For the app's
   * toast or the line under the setting (0.32.1, keksdose's 0.32 report).
   */
  saveFailed: string;
}

export const DEFAULT_APPEARANCE_LABELS: AppearanceLabels = {
  textSize: "Text size",
  textSizeHelp: "Larger letters, and a layout that makes room for them.",
  textSizes: { normal: "Normal", large: "Large", xlarge: "Extra large" },
  contrast: "Contrast",
  contrastHelp: "More contrast darkens quiet text and lines, and thickens focus frames. System follows this device.",
  contrastModes: { system: "System", standard: "Standard", more: "More" },
  saveFailed: "Couldn't save this to your account. It still applies on this device.",
};

/** The `appearance` namespace, resolved — English, then the provider, then `labels`. For
 *  an app's catalogue entries and quick switches, without restating the defaults. */
export function useAppearanceLabels(labels?: Partial<AppearanceLabels>): AppearanceLabels {
  return useKitLabels("appearance", DEFAULT_APPEARANCE_LABELS, labels);
}
