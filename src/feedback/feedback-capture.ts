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
 *   2. {@link makeCaptureFilter} drops `display: none` subtrees — on a phone most of the
 *      document, since `DataTable` renders both layouts and hides one — and anything
 *      wholly below or to the right of the viewport, and empties what was scrolled past
 *      (see SCROLL below). Together: 27–52 s → 0.4–1.1 s, the picture 0.05% of pixels
 *      different (antialiasing).
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
 * SCROLL (0.65.2, keksdose: Marcel scrolled to a duplicate warning, and the screenshot showed
 * the top of the page with an empty photo frame). The picture is drawn from a clone, and a
 * clone has no scroll position: every scroller in it starts at its top. 0.27.0 leaned on the
 * viewport filter instead — drop what is above the viewport, and what is left starts where
 * the screen did. That held for one case only, an inner `<main>` scrolled by whole rows, and
 * failed everywhere else:
 *
 * - a box ABOVE a scroller's edge but still inside the viewport (under the app bar) stayed,
 *   so `<main>` scrolled to the warning came out as the top of the page;
 * - a scroller INSIDE the page (the receipt photo, a table box) showed its own top;
 * - on a phone the DOCUMENT scrolls (`AppShell`'s `<main>` scrolls only from `md`), the
 *   picture was the whole `#root` — 2,968 px high in the check below — and dropping what was
 *   above the viewport pulled the rest up, so an image partly scrolled past left its
 *   frame empty.
 *
 * Now the clone keeps the page's geometry and is scrolled the way the page was:
 *
 * - What was scrolled past is EMPTIED, not dropped ({@link makeCaptureFilter}): the outermost
 *   box wholly above or left of the viewport stays — its width and height are copied in px —
 *   and only its content goes, so everything after it keeps its place at the cost of one
 *   box. Inline, `contents` and table boxes are not emptied: their size is their content.
 * - modern-screenshot's `restoreScrollPosition` shifts every scroller's content by its
 *   `scrollTop` / `scrollLeft` (0.27.0 refused it because the filter had already taken the
 *   rows out it shifts by; nothing is taken out above a scroller now).
 * - A `#root` larger than the viewport is cut to the part on screen ({@link cropToViewport}):
 *   the clone goes into a viewport-sized frame, offset by the document scroll.
 * - A sticky box stays where the scroll pushed it ({@link pinSticky}), a table sizes to the
 *   rows it has ({@link fitTable}), and no scrollbar is drawn ({@link hideScrollbars}).
 *
 * Checked in Chromium at 412×860 against the page's own screenshot (8×8 px blocks compared,
 * 0.65.2): `<main>` scrolled to the warning 72% different → 0.0%, the photo box scrolled
 * 29% → 0.0%, a table box with a sticky header scrolled 13% → 0.0%, the document scrolled
 * 47–72% → 0.0–0.1%, the top of the page 5% → 0.0%. With 1,500 rows in each list a capture
 * took 0.1–0.4 s; 0.65.1 had not finished the document case after several minutes (its
 * picture was a canvas the height of the whole page).
 */

import { viewportSize } from "../hooks/use-anchored-panel";

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

/** Boxes whose size is their content: emptying one would move what follows it. */
const SIZED_BY_CONTENT = /^(inline|contents)$|^table/;

/**
 * The capture's `filter` (keksdose `capture-screenshot.ts:267`; scroll rules 0.65.2). One per
 * capture: it remembers, per element, whether its content was dropped.
 *
 * - `display: none` goes, with its subtree — it paints nothing and no descendant can.
 *   `<style>` and `<link>` are computed `display: none` too but are NOT decoration: a
 *   stylesheet inside the captured subtree still applies inside the `foreignObject`.
 *   `visibility: hidden` is deliberately not checked: a descendant may set it back.
 * - A box wholly BELOW or RIGHT of the viewport goes: nothing on screen comes after it.
 * - A box wholly ABOVE or LEFT of it stays but is EMPTIED — its children go — so what comes
 *   after it keeps its place (see SCROLL above). Not a box sized by its content.
 * - A ZERO box is kept whole: `display: contents` reports 0×0 while its children paint, and
 *   the library's filter drops a rejected node's children too.
 * - A `position: sticky` box on screen goes to `onSticky` ({@link pinSticky}).
 */
function makeCaptureFilter(onSticky: (el: HTMLElement) => void): (node: Node) => boolean {
  const emptied = new WeakSet<Element>();
  // The screen, measured once for the capture: see cropToViewport.
  const screen = viewportSize();
  return (node) => {
    const parent = node.parentElement;
    if (parent && emptied.has(parent)) return false;
    if (node.nodeType !== Node.ELEMENT_NODE) return true;
    const el = node as Element;
    const tag = el.tagName;
    const style = el.ownerDocument?.defaultView?.getComputedStyle(el);
    const display = style?.display ?? "";
    if (tag !== "STYLE" && tag !== "LINK" && display === "none") return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect || (rect.width === 0 && rect.height === 0)) return true;
    if (rect.top >= screen.height || rect.left >= screen.width) return false;
    if ((rect.bottom <= 0 || rect.right <= 0) && !SIZED_BY_CONTENT.test(display)) emptied.add(el);
    else if (style?.position === "sticky" && el instanceof HTMLElement) onSticky(el);
    return true;
  };
}

/**
 * Cut the clone of a `root` that reaches past the viewport to the part on screen (0.65.2).
 * Returns `null` when the root lies wholly inside it — nothing to cut — else the size of the
 * picture and the `onCloneNode` hook that frames the clone: the clone's content moves into a
 * copy of it that keeps its full size, shifted by how far the root starts above and left of
 * the viewport, and the clone becomes a plain frame of the picture's size that clips it.
 */
function cropToViewport(root: Element): { width: number; height: number; onCloneNode: (cloned: Node) => void } | null {
  const box = root.getBoundingClientRect();
  // The screen, not `innerWidth`: on a phone that is the LAYOUT viewport, which grows when
  // anything sticks out (430 on a 406 px screen, keksdose live #381), and the picture kept
  // a strip the reader never saw (refactor audit 2026-11-22, DUP-9).
  const screen = viewportSize();
  const left = Math.max(box.left, 0);
  const top = Math.max(box.top, 0);
  const width = Math.min(box.right, screen.width) - left;
  const height = Math.min(box.bottom, screen.height) - top;
  if (left === box.left && top === box.top && width === box.width && height === box.height) return null;
  if (width <= 0 || height <= 0) return null;
  return {
    width,
    height,
    onCloneNode(cloned) {
      if (!(cloned instanceof HTMLElement)) return;
      const page = cloned.cloneNode(false) as HTMLElement;
      page.removeAttribute("id");
      page.style.setProperty("width", `${box.width}px`);
      page.style.setProperty("height", `${box.height}px`);
      page.style.setProperty("margin", `${box.top - top}px 0 0 ${box.left - left}px`);
      page.append(...cloned.childNodes);
      cloned.removeAttribute("class");
      cloned.setAttribute(
        "style",
        `display:block;position:relative;box-sizing:border-box;margin:0;padding:0;border:0;overflow:hidden;width:${width}px;height:${height}px`,
      );
      cloned.append(page);
    },
  };
}

/**
 * The attribute that carries a stuck box's offset to its clone (0.65.2).
 *
 * A sticky box — a table's header row, an app bar — sits where the scroll pushed it, and the
 * clone has no scroll: shifted with its rows by `restoreScrollPosition`, it would go off the
 * top with them. Its offset from where it would sit unstuck is measured on the
 * page — `position: static` for one synchronous read, nothing paints in between — and the
 * clone is placed there with `position: relative`.
 */
const STUCK = "data-kit-capture-stuck";

/** The `onSticky` of {@link makeCaptureFilter}: measure how far the scroll pushed the sticky
 *  box, and tag it with that offset ("x y" in px) when it moved. Each tagged box goes into
 *  `tagged`, whose tags the caller takes off in `finally`. */
function pinSticky(tagged: HTMLElement[]): (el: HTMLElement) => void {
  return (el) => {
    const stuck = el.getBoundingClientRect();
    const before = el.style.getPropertyValue("position");
    const priority = el.style.getPropertyPriority("position");
    el.style.setProperty("position", "static", "important");
    const unstuck = el.getBoundingClientRect();
    el.style.setProperty("position", before, priority);
    if (!el.getAttribute("style")) el.removeAttribute("style");
    const x = stuck.left - unstuck.left;
    const y = stuck.top - unstuck.top;
    if (x === 0 && y === 0) return;
    el.setAttribute(STUCK, `${x} ${y}`);
    tagged.push(el);
  };
}

/** modern-screenshot's `onCloneEachNode`: a tagged sticky box's clone sits where the page
 *  showed it, and loses the tag. */
function showStuck(cloned: Node): void {
  if (!(cloned instanceof HTMLElement)) return;
  const offset = cloned.getAttribute(STUCK);
  if (offset === null) return;
  cloned.removeAttribute(STUCK);
  const [x, y] = offset.split(" ");
  cloned.style.setProperty("position", "relative");
  cloned.style.setProperty("left", `${x}px`);
  cloned.style.setProperty("top", `${y}px`);
  cloned.style.setProperty("right", "auto");
  cloned.style.setProperty("bottom", "auto");
}

/**
 * The attribute that carries a control's state from the page to its clone (0.60.1).
 *
 * The picture is drawn from a CLONE of the page, serialised, and a control's current state
 * is a property, which neither a clone nor its markup keeps: only attributes go over.
 * modern-screenshot's `copyInputValue` writes `value` onto a cloned `<select>`, which a
 * select ignores, so every select showed its first option (keksdose's 0.60 adoption: on
 * the screenshot of live #514/#515 all four swipe pickers read "— none —" whatever was
 * bound, and the report read as a settings fault); a checkbox or radio that React set showed
 * its markup's state. The selected options and the checked boxes are tagged on the page,
 * and {@link showFormState} turns the tag into `selected` / `checked` on the clone.
 *
 * A `data-` tag, never `selected` / `checked` on the page itself: a control nobody has
 * changed still follows those attributes, and putting a radio's `checked` back afterwards
 * could check it again on the live page. The tag changes no state, and goes in `finally`.
 */
const FORM_STATE = "data-kit-capture-state";

/** Tag every `<option>`, checkbox and radio under `root` with its state ("1" / "0").
 *  Returns what takes the tags off again. */
function tagFormState(root: Element): () => void {
  const tagged: Element[] = [];
  for (const el of root.querySelectorAll<HTMLOptionElement | HTMLInputElement>(
    'option, input[type="checkbox"], input[type="radio"]',
  )) {
    const on = el.tagName === "OPTION" ? (el as HTMLOptionElement).selected : (el as HTMLInputElement).checked;
    el.setAttribute(FORM_STATE, on ? "1" : "0");
    tagged.push(el);
  }
  return () => {
    for (const el of tagged) el.removeAttribute(FORM_STATE);
  };
}

/** modern-screenshot's `onCloneEachNode`: a tagged control's clone shows its original's
 *  state — `selected` on an option, `checked` on a checkbox or radio — and loses the tag. */
function showFormState(cloned: Node): void {
  if (cloned.nodeType !== Node.ELEMENT_NODE) return;
  const el = cloned as Element;
  const state = el.getAttribute(FORM_STATE);
  if (state === null) return;
  el.removeAttribute(FORM_STATE);
  el.toggleAttribute(el.tagName === "OPTION" ? "selected" : "checked", state === "1");
}

/** The parts of a table, whose rows share out the table's height. */
const TABLE_PARTS = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TD", "TH"]);

/**
 * modern-screenshot's `onCloneEachNode`: a table part's clone loses its copied `height`
 * (0.65.2). The copy is the height of ALL the rows, and the rows below the viewport are not in
 * the clone ({@link makeCaptureFilter}): the table shared the missing rows' height out over
 * the ones left, and 29 px rows drew as 41 px (check above). A table sizes to its content, as
 * on the page.
 */
function fitTable(cloned: Node): void {
  if (cloned instanceof HTMLElement && TABLE_PARTS.has(cloned.tagName)) cloned.style.removeProperty("height");
}

/**
 * modern-screenshot's `onCreateForeignObjectSvg`: no scrollbars in the picture (0.65.2). The
 * clone is not scrolled, so each scrollbar it drew showed its thumb at the top, whatever the
 * page showed — and a phone overlays its scrollbars, so they were never on its screen at all.
 */
function hideScrollbars(svg: SVGSVGElement): void {
  const style = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = "*{scrollbar-width:none}";
  svg.prepend(style);
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
export async function captureAppScreenshot({
  rootId = "root",
}: CaptureAppScreenshotOptions = {}): Promise<File | null> {
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
  const untag = tagFormState(el);
  const crop = cropToViewport(el);
  const stuck: HTMLElement[] = [];
  let blob: Blob;
  try {
    blob = await domToBlob(el, {
      // Falls back to PNG where WebP cannot be encoded; the File is named from the blob.
      type: "image/webp",
      quality: 0.9,
      font: false,
      includeStyleProperties: [...CAPTURE_STYLE_PROPERTIES],
      filter: makeCaptureFilter(pinSticky(stuck)),
      // Each scroller at the place it was scrolled to, and only the part on screen (0.65.2).
      features: { restoreScrollPosition: true },
      onCreateForeignObjectSvg: hideScrollbars,
      ...crop,
      // Each select at its chosen option, each box as it is (0.60.1); each stuck box where
      // the page showed it, each table row at its own height (0.65.2).
      onCloneEachNode: (cloned) => {
        showFormState(cloned);
        showStuck(cloned);
        fitTable(cloned);
      },
    });
  } finally {
    untag();
    for (const s of stuck) s.removeAttribute(STUCK);
  }
  const type = blob.type || "image/png";
  return new File([blob], `screenshot.${EXTENSIONS[type] ?? "png"}`, { type });
}
