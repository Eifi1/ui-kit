import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { useLocale, useT } from "../i18n";
import { usePalette, useTheme } from "../stores";

/**
 * The current page at the three screen sizes that cover most real use, side by side.
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
 */

export const DEVICES = [
  { key: "phone", width: 390, height: 844 },
  { key: "tablet", width: 768, height: 1024 },
  { key: "desktop", width: 1440, height: 900 },
] as const;

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

export function DevicePreview() {
  const t = useT();
  const { code } = useLocale();
  const mode = useTheme((s) => s.mode);
  const paletteId = usePalette((s) => s.id);
  const location = useLocation();
  const box = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(1200);

  // Scale every frame by ONE factor, so the three stay comparable: a button that is
  // 36px tall reads the same size in each, and only the layout around it differs.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const total = DEVICES.reduce((sum, d) => sum + d.width, 0) + GAP * (DEVICES.length - 1);
  const scale = Math.min(1, available / total);

  // The same page the reader is on, including the section anchor.
  const src = `${window.location.origin}${window.location.pathname}#${location.pathname}${location.hash}`;
  // Theme, palette and language live in localStorage, which a frame reads once, at load.
  // Keying on them remounts the frames when one changes in the top bar.
  const key = `${src}|${mode}|${paletteId}|${code}`;

  return (
    <div ref={box} className="w-full">
      <p className="mb-4 text-sm text-[var(--text-secondary)]">{t.chrome.previewHint}</p>
      <div className="flex items-start" style={{ gap: GAP * scale }}>
        {DEVICES.map((d) => (
          <figure key={d.key} className="m-0 shrink-0">
            <figcaption className="mb-1.5 flex items-baseline gap-2 text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{t.chrome[d.key]}</span>
              <span className="font-mono text-[var(--text-muted)]" dir="ltr">
                {d.width} × {d.height}
              </span>
            </figcaption>
            {/* The frame keeps its REAL size and is scaled with a transform; the wrapper
                takes the scaled size, so the three sit side by side without overlap. */}
            <div
              className="overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg-page)] shadow-sm"
              style={{ width: d.width * scale, height: d.height * scale }}
            >
              <iframe
                key={key}
                title={`${t.chrome[d.key]} — ${d.width} × ${d.height}`}
                src={src}
                width={d.width}
                height={d.height}
                className="block origin-top-left border-0"
                style={{ transform: `scale(${scale})` }}
              />
            </div>
          </figure>
        ))}
      </div>
    </div>
  );
}
