import type { ButtonHTMLAttributes } from "react";
import { Check, Copy, X } from "lucide-react";
import { cn } from "../lib/cn";
import { useKitLabels } from "../i18n/kit-labels";
import { useAnnounce } from "../hooks/use-announce";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";
import type { CopyState } from "../hooks/use-copy-to-clipboard";
import { Button, IconButton } from "./ui";
import type { ButtonSize, ButtonTone, ButtonVariant, IconButtonSize, IconButtonTone } from "./ui";
import { Tooltip } from "./tooltip";
import type { TooltipSide } from "./tooltip";

/** The words a copy button says. The visible three are short on purpose (they
 *  replace the button's own text in the `label` variant); the two announcements
 *  are the sentences a screen reader hears, since the button's focus never moves. */
export interface CopyButtonLabels {
  copy: string;
  copied: string;
  failed: string;
  copiedAnnouncement: string;
  failedAnnouncement: string;
}

export const DEFAULT_COPY_BUTTON_LABELS: CopyButtonLabels = {
  copy: "Copy",
  copied: "Copied",
  failed: "Couldn’t copy",
  copiedAnnouncement: "Copied to clipboard",
  failedAnnouncement: "Couldn’t copy to the clipboard",
};

export interface CopyButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "onClick"> {
  /** What to copy. A function is read at click time — for a value that is expensive
   *  to build (a CSV of the table) or that changes under the button. */
  text: string | (() => string);
  /** `icon` (default): a square icon button whose tooltip states the result.
   *  `label`: a text button whose words change to the result. */
  variant?: "icon" | "label";
  /** The idle accessible name — and, in the `label` variant, the visible text:
   *  "Copy IBAN" says WHAT is copied, which a row of three copy icons needs. Default
   *  `copyButton.copy`. */
  label?: string;
  /** The button's own look. Default: `ghost` for the icon, `secondary` for the label. */
  buttonVariant?: ButtonVariant;
  /** The icon variant's IconButton size (default `sm`). The `label` variant takes a
   *  Button size, `sm` or `md` — passed only when given, so an existing label button
   *  keeps its look (keksdose budget-share-card and jobs-panel wanted the compact one). */
  size?: IconButtonSize | ButtonSize;
  /** The icon variant's IconButton tone (e.g. `muted`, so a row of copy icons is no
   *  heavier than the row's other actions); in the `label` variant a Button tone,
   *  which applies to `link` / `ghost`. The copied / failed colour still wins. */
  tone?: IconButtonTone | ButtonTone;
  /** Keep the click and Enter/Space from reaching a clickable row around the button,
   *  as IconButton's own `stopPropagation` does (keksdose feedback-page, users-panel). */
  stopPropagation?: boolean;
  /** Icon variant only: where the result tooltip opens. */
  tooltipSide?: TooltipSide;
  /** Pass through to the tooltip — needed inside a scroll container (see Tooltip). */
  tooltipPortal?: boolean;
  /** ms until the button returns to idle. Default 2000. */
  resetAfter?: number;
  /** Called with the real outcome once the copy settles. */
  onCopied?: (ok: boolean) => void;
  labels?: Partial<CopyButtonLabels>;
}

const ICONS: Record<CopyState, typeof Copy> = { idle: Copy, copied: Check, failed: X };

/**
 * A button that copies a value and tells the truth about whether it did.
 *
 * keksdose asked for it after two of its own copy buttons said "Copied" on a build
 * where the copy had failed (no Clipboard API over plain http). This one takes its
 * state from {@link useCopyToClipboard}, which reads the result, and has a `failed`
 * state that looks and sounds different from success.
 *
 * The result is spoken through {@link useAnnounce}: activating the button moves no
 * focus, so without a live region a screen-reader user hears nothing at all. A
 * failure goes through an ASSERTIVE region and a success through a polite one — the
 * failure is the news that changes what they do next.
 *
 * The icon variant keeps the SAME accessible name in every state. A button renaming
 * itself under the focus is announced inconsistently across readers; the live region
 * is the channel that is actually heard.
 */
export function CopyButton({
  text,
  variant = "icon",
  label,
  buttonVariant,
  size,
  tone,
  stopPropagation,
  tooltipSide = "top",
  tooltipPortal = false,
  resetAfter = 2000,
  onCopied,
  labels,
  className,
  disabled,
  ...rest
}: CopyButtonProps) {
  const words = useKitLabels("copyButton", DEFAULT_COPY_BUTTON_LABELS, labels);
  const { state, copy } = useCopyToClipboard({ resetAfter });
  const polite = useAnnounce();
  const assertive = useAnnounce({ politeness: "assertive" });

  const idleText = label ?? words.copy;
  const stateText = state === "copied" ? words.copied : state === "failed" ? words.failed : idleText;
  const Icon = ICONS[state];
  const iconTone =
    state === "copied" ? "text-[var(--success)]" : state === "failed" ? "text-[var(--danger)]" : undefined;

  const onClick = async () => {
    const ok = await copy(typeof text === "function" ? text() : text);
    if (ok) polite.announce(words.copiedAnnouncement);
    else assertive.announce(words.failedAnnouncement);
    onCopied?.(ok);
  };

  const regions = (
    <>
      <span {...polite.regionProps} />
      <span {...assertive.regionProps} />
    </>
  );

  if (variant === "label") {
    return (
      <>
        <Button
          type="button"
          {...rest}
          disabled={disabled}
          variant={buttonVariant ?? "secondary"}
          size={size === "sm" || size === "md" ? size : undefined}
          tone={tone === "default" || tone === "muted" || tone === "danger" ? tone : undefined}
          data-state={state}
          onClick={(e) => {
            if (stopPropagation) e.stopPropagation();
            void onClick();
          }}
          onKeyDown={(e) => {
            if (stopPropagation && (e.key === "Enter" || e.key === " ")) e.stopPropagation();
            rest.onKeyDown?.(e);
          }}
          className={className}
        >
          <Icon aria-hidden className={cn("size-4 shrink-0", iconTone)} />
          {stateText}
        </Button>
        {regions}
      </>
    );
  }

  return (
    <>
      <Tooltip label={stateText} side={tooltipSide} portal={tooltipPortal}>
        <IconButton
          type="button"
          {...rest}
          disabled={disabled}
          aria-label={idleText}
          variant={buttonVariant ?? "ghost"}
          size={(size ?? "sm") as IconButtonSize}
          tone={tone as IconButtonTone | undefined}
          stopPropagation={stopPropagation}
          data-state={state}
          onClick={() => void onClick()}
          className={cn(iconTone, className)}
        >
          <Icon aria-hidden />
        </IconButton>
      </Tooltip>
      {regions}
    </>
  );
}
