import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "../lib/cn";

export type AlertTone = "danger" | "warning" | "neutral";

/** Single source for the warning-callout frame (feedback #277): colored tones
 * use a 2px border with compensating padding because a 1px colored border
 * anti-aliases asymmetrically when the card centers on a half-pixel offset
 * (feedback #264) — and the padding keeps toggling tones from shifting layout. */
export function alertFrameClass(tone: AlertTone): string {
  switch (tone) {
    case "danger":
      return "rounded-md border-2 p-[11px] border-rose-400 bg-rose-50 dark:border-rose-600 dark:bg-rose-900/20";
    case "warning":
      return "rounded-md border-2 p-[11px] border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-900/20";
    case "neutral":
      return "rounded-md border p-3 border-slate-200 dark:border-slate-700";
  }
}

const TONE_TEXT: Record<Exclude<AlertTone, "neutral">, string> = {
  danger: "text-rose-900 dark:text-rose-100",
  warning: "text-amber-900 dark:text-amber-200",
};

const TONE_ICON: Record<Exclude<AlertTone, "neutral">, string> = {
  danger: "text-rose-600 dark:text-rose-400",
  warning: "text-amber-600 dark:text-amber-400",
};

/** Static warning/danger callout box with the shared frame and an icon. */
export function AlertBanner({
  tone = "danger",
  className,
  children,
}: {
  tone?: Exclude<AlertTone, "neutral">;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-2 text-sm", alertFrameClass(tone), TONE_TEXT[tone], className)}>
      <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[tone])} />
      <span className="flex-1">{children}</span>
    </div>
  );
}
