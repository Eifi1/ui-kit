import { formatNumber } from "@eifi1/ui-kit";

/**
 * `new Intl.NumberFormat(locale, options)` for the showcase's own figures — a demo's
 * column renderers, chart axes and tooltips — but through the kit's `formatNumber`, so a
 * negative carries the typographic minus, U+2212, like every kit component (0.49, KIT-1).
 * An app's own figures beside kit components should do the same.
 */
export function numberFormat(
  locale?: string,
  options: Intl.NumberFormatOptions = {},
): { format: (value: number) => string } {
  return { format: (value: number) => formatNumber(value, { locale, options }) };
}
