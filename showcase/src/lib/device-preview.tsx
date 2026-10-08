import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button, ToggleGroup, cn } from "@eifi1/ui-kit";
import { useLocale, useT } from "../i18n";
import { usePalette, useTheme } from "../stores";
import { TEXT_SIZES, type TextSize } from "../../../src/theme/text-size";
import { useAppearanceLabels } from "../../../src/components/appearance-labels";

/**
 * The current page at the screen sizes that cover most real use — one at a time at
 * real size, or the three side by side.
 *
 * Each frame is the WHOLE showcase in an `<iframe>` at the device's real CSS width, then
 * scaled down to fit — not a CSS imitation of a phone. That is the point: the shell's
 * own breakpoints decide what renders (the bottom bar and the page row below `md`, the
 * contents rail from `xl`), media queries answer for the frame's width, and a phone
 * specimen that only works on a desktop shows up broken here, where it would.
 *
 * The frames follow the route, theme, palette and language: they load the same URL,
 * read the same localStorage, and are remounted when any of those change. A frame never
 * offers the preview itself (see `isEmbedded`), so it cannot recurse.
 *
 * And the TEXT SIZE (0.32, docs/text-size-harmonization.md §8) is a second axis: every
 * device at Normal, Large or Extra large, each frame loaded with `?text-size=` (stores.ts),
 * so the frames can differ from each other and from the page — which is what shows that
 * a tablet at 150 % gets the phone layout. Plus the narrowest case the kit designs for, a
 * 360 px phone at 150 %: 240 px of layout (§3.3).
 */

export const DEVICES = [
  { key: "phone", width: 390, height: 844 },
  { key: "tablet", width: 768, height: 1024 },
  { key: "desktop", width: 1440, height: 900 },
] as const;

/** The worst case (§3.3): a 360 px phone at Extra large, 240 px of effective width. Its
 *  size is part of what it is, so the size axis does not apply to it. */
export const SMALL_PHONE = { key: "small", width: 360, height: 780, size: "xlarge" } as const;

/** True inside a preview frame — the chrome hides the preview control there. */
export function isEmbedded(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    // A cross-origin parent throws on access — which also means "embedded".
    return true;
  }
}

const GAP = 24;

type DeviceKey = (typeof DEVICES)[number]["key"];
type PreviewChoice = DeviceKey | typeof SMALL_PHONE.key | "all";
interface Frame {
  key: DeviceKey | typeof SMALL_PHONE.key;
  width: number;
  height: number;
  size: TextSize;
}

/** The last choice, per browser, so a reader who checks every page on a phone does not
 *  pick "Phone" again on each one. Wrapped: storage can be unavailable. */
const CHOICE_KEY = "uikit-showcase-preview-device";
function readChoice(): PreviewChoice {
  try {
    const v = localStorage.getItem(CHOICE_KEY);
    return v === "phone" || v === "tablet" || v === "desktop" || v === "small" || v === "all" ? v : "phone";
  } catch {
    return "phone";
  }
}
function writeChoice(v: PreviewChoice) {
  try {
    localStorage.setItem(CHOICE_KEY, v);
  } catch {
    /* private mode: the choice just is not remembered */
  }
}

/** The size axis' last choice, likewise. */
const SIZE_KEY = "uikit-showcase-preview-text-size";
function readSize(): TextSize {
  try {
    const v = localStorage.getItem(SIZE_KEY);
    return v === "large" || v === "xlarge" ? v : "normal";
  } catch {
    return "normal";
  }
}
function writeSize(v: TextSize) {
  try {
    localStorage.setItem(SIZE_KEY, v);
  } catch {
    /* as above */
  }
}

/**
 * The preview: ONE device at a time at its real CSS width, shrunk only when the window
 * is narrower than the device — or, as the fourth choice, all three side by side.
 *
 * It used to be only the three together, scaled to fit: on a 1280px laptop that drew
 * the phone about 150px wide, too small to read, which is the size a reader opened the
 * preview to check. One device at a time shows a phone at 390px, as a phone does, with
 * a switcher above it — no browser resizing, no developer tools.
 */
export function DevicePreview({ onExit }: { onExit?: () => void }) {
  const t = useT();
  const appearance = useAppearanceLabels();
  const { code } = useLocale();
  const mode = useTheme((s) => s.mode);
  const paletteId = usePalette((s) => s.id);
  const location = useLocation();
  const box = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(1200);
  const [choice, setChoiceState] = useState<PreviewChoice>(readChoice);
  const setChoice = (v: PreviewChoice) => {
    setChoiceState(v);
    writeChoice(v);
  };
  const [size, setSizeState] = useState<TextSize>(readSize);
  const setSize = (v: TextSize) => {
    setSizeState(v);
    writeSize(v);
  };

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const shown: readonly Frame[] =
    choice === "small"
      ? [SMALL_PHONE]
      : (choice === "all" ? DEVICES : DEVICES.filter((d) => d.key === choice)).map((d) => ({ ...d, size }));
  // One factor for every frame shown, so side by side they stay comparable: a 36px
  // button reads the same size in each. A single device is at 1:1 unless the window is
  // narrower than it (the phone bezel's 2 × 10px included).
  const isPhone = (key: Frame["key"]) => key === "phone" || key === "small";
  const bezel = (key: Frame["key"]) => (isPhone(key) ? 20 : 0);
  const total = shown.reduce<number>((sum, d) => sum + d.width + bezel(d.key), 0) + GAP * (shown.length - 1);
  const scale = Math.min(1, available / total);

  // The same page the reader is on, including the section anchor, at the frame's own
  // text size (the query string, read before the router's hash — stores.ts).
  const src = (frameSize: TextSize) =>
    `${window.location.origin}${window.location.pathname}?text-size=${frameSize}#${location.pathname}${location.hash}`;
  // Theme, palette and language live in localStorage, which a frame reads once, at load.
  // Keying on them remounts the frames when one changes in the top bar.
  const key = `${location.pathname}${location.hash}|${mode}|${paletteId}|${code}`;
  const smallLabel = `${t.chrome.phone} ${SMALL_PHONE.width} · ${appearance.textSizes[SMALL_PHONE.size]}`;
  const nameOf = (frame: Frame) => (frame.key === "small" ? t.chrome.phone : t.chrome[frame.key]);

  const options: Array<{ value: PreviewChoice; label: string }> = [
    ...DEVICES.map((d) => ({ value: d.key as PreviewChoice, label: t.chrome[d.key] })),
    { value: "small", label: smallLabel },
    { value: "all", label: t.chrome.allDevices },
  ];
  const sizeOptions = TEXT_SIZES.map((value) => ({ value, label: appearance.textSizes[value] }));

  return (
    <div ref={box} className="w-full">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ToggleGroup
          aria-label={t.chrome.devicePreview}
          options={options}
          value={choice}
          onChange={setChoice}
          className="w-auto"
        />
        {/* The size axis. The small phone is at Extra large by definition, so the group
            shows that and is not a control there. */}
        <ToggleGroup
          aria-label={appearance.textSize}
          options={sizeOptions}
          value={choice === "small" ? SMALL_PHONE.size : size}
          onChange={setSize}
          disabled={choice === "small"}
          className="w-auto"
        />
        {onExit && (
          <Button variant="secondary" size="sm" onClick={onExit}>
            <ArrowLeft aria-hidden className="size-4" />
            {t.chrome.previewExit}
          </Button>
        )}
      </div>
      <p className="mb-4 max-w-prose text-sm text-[var(--text-secondary)]">{t.chrome.previewHint}</p>
      <div className={cn("flex items-start", shown.length === 1 && "justify-center")} style={{ gap: GAP * scale }}>
        {shown.map((d) => {
          const phone = isPhone(d.key);
          const sizeLabel = appearance.textSizes[d.size];
          return (
            <figure key={d.key} className="m-0 shrink-0">
              <figcaption className="mb-1.5 flex items-baseline gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-primary)]">{nameOf(d)}</span>
                <span className="font-mono text-[var(--text-muted)]" dir="ltr">
                  {d.width} × {d.height}
                </span>
                <span>{sizeLabel}</span>
              </figcaption>
              {/* The frame keeps its REAL size and is scaled with a transform; the wrapper
                  takes the scaled size, so frames sit side by side without overlap. A
                  phone gets a bezel, so it reads as a phone and not as a narrow panel. */}
              <div
                className={cn(
                  "overflow-hidden bg-[var(--bg-page)] shadow-sm",
                  phone
                    ? "rounded-[2rem] border-[10px] border-[var(--text-primary)]"
                    : "rounded-lg border border-[var(--border-strong)]",
                )}
                style={{
                  width: (d.width + bezel(d.key)) * scale,
                  height: (d.height + bezel(d.key)) * scale,
                }}
              >
                <iframe
                  key={`${key}|${d.size}`}
                  title={`${nameOf(d)} — ${d.width} × ${d.height} · ${sizeLabel}`}
                  src={src(d.size)}
                  width={d.width}
                  height={d.height}
                  className="block origin-top-left border-0"
                  style={{ transform: `scale(${scale})` }}
                />
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
