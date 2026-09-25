/**
 * Swiss Standard German respelling, shared by the `de-CH` and `de-CH-informal`
 * translations. Internal: it lives outside `src/i18n/locales/` because every file there
 * becomes a public `@eifi1/ui-kit/i18n/<code>` subpath.
 *
 * "ss" for every "ß" (Schliessen, Grösse) is the one systematic difference in UI text.
 * Function labels are wrapped: their RESULT is respelled, so an argument the app passes
 * in (a file name, a phrase to type) is respelled too — which is what a Swiss app
 * writing "ss" everywhere wants.
 */
export function swiss<T>(value: T): T {
  if (typeof value === "string") return respell(value) as T;
  if (typeof value === "function") {
    const fn = value as (...args: unknown[]) => unknown;
    return ((...args: unknown[]) => swiss(fn(...args))) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, swiss(v)])) as T;
  }
  return value;
}

function respell(text: string): string {
  return text.replace(/ß/g, "ss").replace(/ẞ/g, "SS");
}
