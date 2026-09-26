import { useMemo } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../lib/cn";
import { encodeQr } from "../lib/qr-encode";
import type { QrErrorCorrection } from "../lib/qr-encode";

export interface QrCodeProps extends Omit<ComponentPropsWithoutRef<"svg">, "children" | "viewBox"> {
  /** The text to encode (UTF-8) — an `otpauth://` URI, a URL, a pairing code. */
  value: string;
  /** The accessible name. Without it the code is decorative (`aria-hidden`): say what
   *  it is for, not what it encodes — nobody wants a URI read out. */
  label?: string;
  /** Default `"M"`, raised automatically where the size allows it. */
  errorCorrection?: QrErrorCorrection;
  /** The quiet zone, in modules. The spec asks for 4; less reads worse. Default 4. */
  margin?: number;
}

/**
 * A QR code as one inline SVG — no canvas, no data URL, no dependency (see
 * `lib/qr-encode.ts` for why the encoder lives in the kit).
 *
 * Sized by CSS (`className="size-48"`); the SVG scales without blurring because every
 * module is a whole unit of the viewBox and `shape-rendering` is `crispEdges`.
 *
 * **Black on white, always — the one literal colour pair in the kit.** A camera looks
 * for the contrast between the modules and their quiet zone; on the dark theme a
 * surface-coloured background makes a code slow to acquire, and an inverted one is not
 * read at all by several authenticator apps. The quiet zone is part of the SVG, so the
 * code carries its own white border wherever it is placed.
 *
 * A value too long for any QR version (≈2.9 kB) renders nothing rather than throwing
 * in render.
 */
export function QrCode({
  value,
  label,
  errorCorrection = "M",
  margin = 4,
  className,
  ...rest
}: QrCodeProps) {
  const path = useMemo(() => {
    try {
      const { modules, size } = encodeQr(value, { errorCorrection });
      // One path, one sub-path per horizontal run of dark modules: a few hundred
      // commands rather than one <rect> per module.
      let d = "";
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; ) {
          if (!modules[y][x]) {
            x++;
            continue;
          }
          let run = 1;
          while (x + run < size && modules[y][x + run]) run++;
          d += `M${x + margin} ${y + margin}h${run}v1h-${run}z`;
          x += run;
        }
      }
      return { d, extent: size + margin * 2 };
    } catch {
      return null;
    }
  }, [value, errorCorrection, margin]);

  if (!path) return null;
  return (
    <svg
      {...rest}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${path.extent} ${path.extent}`}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("block", className)}
    >
      <rect width={path.extent} height={path.extent} fill="#ffffff" />
      <path d={path.d} fill="#000000" />
    </svg>
  );
}
