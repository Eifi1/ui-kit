import { AArrowDown, AArrowUp, ALargeSmall } from "lucide-react";
import { IconButton } from "../components/icon-button";
import { useAppearanceLabels, type AppearanceLabels } from "../components/appearance-labels";
import type { LabelOverride } from "../i18n/kit-labels";
import { TEXT_SIZES, useTextSize, type TextSize } from "../theme/text-size";

export interface AccountMenuTextSizeProps {
  /** The size in force. Default: the one on `<html>` ({@link useTextSize}), which is the
   *  size whoever applied it put there. */
  value?: TextSize;
  /**
   * A step: the next size down or up. The app applies it and keeps it as its Settings ▸
   * Appearance does — `useAccountAppearance`'s `pickTextSize` (this device, and the
   * account when signed in), with `appearance.saveFailed` as the toast when the account
   * refused. The kit does not apply it itself, so the two places can never disagree.
   */
  onPick: (size: TextSize) => void;
  /** The row's name. Default: `appearance.textSize` ("Text size"). */
  label?: string;
  /** The `appearance` words (`textSize`, `textSizes`, `textSmaller`, `textLarger`). */
  labels?: LabelOverride<AppearanceLabels>;
}

/**
 * The text size one tap away, INSIDE the account menu (0.46, keksdose live #426, its
 * `TextSizeRow`): the row's icon and name, the size in force, and A− / A+, which step
 * through {@link TEXT_SIZES} (Normal → Large → Extra large). A− is disabled at the
 * smallest, A+ at the largest. The browser's pinch zoom stays as it is — this is the
 * quick path to the setting, not a replacement for zoom.
 *
 * It renders its own `<li>`: drop it into `TopBarActionMenu`'s `children` beside
 * `AccountMenuLanguage`. The menu promotes the two buttons to `menuitem`s, so ↑/↓ reach
 * them like every other row, and it stays open on a step: the person sees the page grow
 * behind it and can step again. The size's name is a polite live region, so a step is
 * announced.
 */
export function AccountMenuTextSize({ value, onPick, label, labels: labelsProp }: AccountMenuTextSizeProps) {
  const labels = useAppearanceLabels(labelsProp);
  const onHtml = useTextSize().size;
  const size = value ?? onHtml;
  const index = TEXT_SIZES.indexOf(size);
  const step = (by: -1 | 1) => {
    const next = TEXT_SIZES[index + by];
    if (next) onPick(next);
  };
  return (
    <li data-account-menu-text-size="" className="flex items-center gap-2 px-3 py-1.5 text-sm">
      <ALargeSmall aria-hidden className="size-4 shrink-0 text-muted" />
      <span className="min-w-0 flex-1 truncate">
        {label ?? labels.textSize}
        <span className="ms-2 text-xs text-muted" aria-live="polite">
          {labels.textSizes[size]}
        </span>
      </span>
      <IconButton
        size="sm"
        label={labels.textSmaller}
        labelVisible={false}
        tooltip={false}
        disabled={index <= 0}
        onClick={() => step(-1)}
      >
        <AArrowDown />
      </IconButton>
      <IconButton
        size="sm"
        label={labels.textLarger}
        labelVisible={false}
        tooltip={false}
        disabled={index >= TEXT_SIZES.length - 1}
        onClick={() => step(1)}
      >
        <AArrowUp />
      </IconButton>
    </li>
  );
}
