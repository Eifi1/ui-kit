/**
 * `captureAppScreenshot` — the picture of the app a feedback report attaches (0.27.0,
 * docs/feedback-harmonization.md §5).
 *
 * Lifted from keksdose `frontend/src/features/feedback/capture-screenshot.ts` (live #271),
 * which is the canon: Kurvenschmiede carried a second copy (`capture-page.ts`) with none of
 * its speed-ups, and kastlan had no capture at all. Each app wrote the same three awkward
 * decisions — which element, which library, what to do when it throws — and they drifted
 * the moment there were two copies (Kurvenschmiede feedback #128 says exactly that).
 *
 * WHY IT IS FAST (keksdose live #271: *"Capture screenshot — That takes ages in my mobile
 * phone"*). `modern-screenshot` deep-clones the subtree and inlines every node's computed
 * style onto the clone, because the final image is an SVG `foreignObject` that carries no
 * stylesheets. By default it walks the WHOLE computed style (~340 longhands in Chrome) per
 * element; keksdose's /transactions has ~4,800 elements under `#root` at phone width, so
 * that was ~1.6 million `getPropertyValue` calls before a pixel was drawn — 21–52 s on a
 * desktop CPU, 153–160 s with the CPU throttled 4×. Two levers fixed it, both kept here:
 *
 *   1. {@link CAPTURE_STYLE_PROPERTIES} — copy the ~140 longhands a Tailwind v4 app built
 *      on this kit actually uses. Alone: 21 s → 1.8 s.
 *   2. {@link inViewport} drops `display: none` subtrees — on a phone most of the
 *      document, since `DataTable` renders both layouts and hides one — and anything
 *      wholly outside the viewport. Together: 27–52 s → 0.4–1.1 s, the picture
 *      0.05% of pixels different (antialiasing).
 *
 * Plus WebP at 0.9 (222 KB → 46 KB, an upload a phone makes on a mobile connection) with
 * the file named from what the canvas ACTUALLY produced — a browser without WebP encodes
 * PNG, and a "screenshot.webp" that is a PNG is refused by the server on its type — and
 * `font: false`, since the app's faces are same-origin and already in the page.
 *
 * WHY THE PEER IS LOADED DYNAMICALLY. `modern-screenshot` is an OPTIONAL peer
 * (`peerDependenciesMeta.optional`, like `sonner`), and this module is re-exported by the
 * barrel: a static import would make every app that imports a Button install it. It is
 * imported inside the function, so an app pays nothing until somebody presses "Capture
 * screenshot", and an app without it gets a REJECTED promise — which the submit dialog
 * turns into the "Could not capture a screenshot" toast (`feedbackToast.captureFailed`).
 *
 * WHAT IS NOT HERE: Kurvenschmiede's `features: { restoreScrollPosition: true }` (its
 * feedback #153: a capture of a scrolled `<main>` came out as the TOP of the page). The
 * viewport filter already answers that case — what is scrolled out of view is dropped, so
 * what remains is what was on screen, give or take the part of the first row that was
 * scrolled past (checked in Chromium, 0.27.0: an inner `<main>` scrolled to row 20 captures
 * rows 20–26). Both together are worse than either: the clone is translated by the scroll
 * offset AFTER the rows above were dropped, and the picture came out blank below the
 * header (same check).
 */

/**
 * The computed properties copied onto the clone (keksdose `capture-screenshot.ts:94`).
 *
 * LONGHANDS only: `getPropertyValue()` resolves a shorthand to `""` whenever its longhands
 * disagree, so `"border"` would silently drop every one-sided border. Chosen by what
 * Tailwind v4 emits rather than by what looks complete: `font-variant-numeric` because
 * money is `tabular-nums`, the SVG paint properties because every icon is a lucide `<svg>`
 * inheriting `stroke: currentColor`.
 */
const CAPTURE_STYLE_PROPERTIES: readonly string[] = [
  // box
  "display",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "box-sizing",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "overflow-x",
  "overflow-y",
  "z-index",
  "float",
  "clear",
  "aspect-ratio",
  "inset-inline-start",
  "inset-inline-end",
  // flex + grid
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "align-items",
  "align-self",
  "align-content",
  "justify-content",
  "justify-items",
  "justify-self",
  "row-gap",
  "column-gap",
  "order",
  "grid-template-columns",
  "grid-template-rows",
  "grid-column-start",
  "grid-column-end",
  "grid-row-start",
  "grid-row-end",
  "grid-auto-flow",
  "grid-auto-rows",
  "grid-auto-columns",
  // type
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant-numeric",
  "font-feature-settings",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-align",
  "text-indent",
  "text-transform",
  "text-overflow",
  "text-decoration-line",
  "text-decoration-color",
  "text-decoration-style",
  "text-decoration-thickness",
  "text-underline-offset",
  "white-space",
  "word-break",
  "overflow-wrap",
  "vertical-align",
  "direction",
  "list-style-type",
  "list-style-position",
  "-webkit-line-clamp",
  "-webkit-box-orient",
  "-webkit-text-fill-color",
  // paint
  "background-color",
  "background-image",
  "background-position",
  "background-repeat",
  "background-size",
  "background-clip",
  "background-origin",
  "opacity",
  "visibility",
  "box-shadow",
  "filter",
  "backdrop-filter",
  "mix-blend-mode",
  "clip-path",
  // borders + outline
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-right-radius",
  "border-bottom-left-radius",
  "outline-width",
  "outline-style",
  "outline-color",
  "outline-offset",
  // transform
  "transform",
  "transform-origin",
  "rotate",
  "scale",
  "translate",
  // tables
  "border-collapse",
  "border-spacing",
  "table-layout",
  "caption-side",
  // replaced content + svg
  "object-fit",
  "object-position",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-opacity",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-dasharray",
  "stroke-dashoffset",
  "shape-rendering",
  "paint-order",
];

/** The extension that belongs to what the canvas actually produced (keksdose
 *  `capture-screenshot.ts:247`). */
const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * Keep a node only if it can paint inside the viewport (keksdose `capture-screenshot.ts:267`).
 *
 * - `display: none` goes, with its subtree — it paints nothing and no descendant can.
 *   `<style>` and `<link>` are computed `display: none` too but are NOT decoration: a
 *   stylesheet inside the captured subtree still applies inside the `foreignObject`.
 *   `visibility: hidden` is deliberately not checked: a descendant may set it back.
 * - A box wholly outside the viewport goes: the root is viewport-sized (the app scrolls an
 *   inner `<main>`), so it would have been clipped away unseen.
 * - A ZERO box is kept: `display: contents` reports 0×0 while its children paint, and the
 *   library's filter drops a rejected node's children too.
 */
function inViewport(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return true;
  const el = node as Element;
  const tag = el.tagName;
  if (tag !== "STYLE" && tag !== "LINK") {
    const display = el.ownerDocument?.defaultView?.getComputedStyle(el).display;
    if (display === "none") return false;
  }
  const rect = el.getBoundingClientRect?.();
  if (!rect) return true;
  if (rect.width === 0 && rect.height === 0) return true;
  return !(rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth);
}

/** What `captureAppScreenshot` takes. */
export interface CaptureAppScreenshotOptions {
  /**
   * The id of the element to capture. Default `"root"` — the app's mount point, which is
   * right on purpose: the kit's `Modal` portals to `document.body` as a SIBLING of `#root`,
   * so capturing `#root` leaves the feedback dialog and its backdrop out of the picture
   * without a single filter rule.
   */
  rootId?: string;
}

/**
 * Snapshot the app view behind the feedback dialog, as a `File` ready for the upload —
 * `screenshot.webp`, or `screenshot.png` where the browser cannot encode WebP.
 *
 * - Resolves `null` when there is no element with `rootId` — nothing to capture.
 * - **Rejects** when the optional peer `modern-screenshot` is not installed (the error
 *   says so), or when the capture itself fails. It never swallows: what to say about a
 *   failure is the caller's — `useFeedbackSubmit` toasts `feedbackToast.captureFailed`.
 *
 * Call it from the "Capture screenshot" button's own click and nowhere else (keksdose
 * checked: running it at dialog OPEN was suspected and was never the cause of the wait).
 */
export async function captureAppScreenshot({ rootId = "root" }: CaptureAppScreenshotOptions = {}): Promise<File | null> {
  let domToBlob: (typeof import("modern-screenshot"))["domToBlob"];
  try {
    ({ domToBlob } = await import("modern-screenshot"));
  } catch (cause) {
    throw new Error(
      "@eifi1/ui-kit: captureAppScreenshot needs the optional peer `modern-screenshot` — install it (npm i modern-screenshot).",
      { cause },
    );
  }
  const el = document.getElementById(rootId);
  if (!el) return null;
  const blob = await domToBlob(el, {
    // Falls back to PNG where WebP cannot be encoded; the File is named from the blob.
    type: "image/webp",
    quality: 0.9,
    font: false,
    includeStyleProperties: [...CAPTURE_STYLE_PROPERTIES],
    filter: inViewport,
  });
  const type = blob.type || "image/png";
  return new File([blob], `screenshot.${EXTENSIONS[type] ?? "png"}`, { type });
}
