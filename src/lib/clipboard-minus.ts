/**
 * The copy handler for the one minus sign (0.49 KIT-1b, Marcel's follow-up to KIT-1).
 *
 * The kit prints a negative with U+2212 (lib/minus.ts). A spreadsheet does not read that
 * as a number: a figure copied out of a kit table and pasted into Excel landed as text.
 * So while a selection inside the page is copied, every U+2212 standing directly before a
 * number — optionally after a currency code or symbol and spaces: "−CHF 1,250.50",
 * "−€2,000", "−12%" — becomes the ASCII "-" in the clipboard, in `text/plain` AND in
 * `text/html` (Excel pastes the HTML flavour, as cells). The page keeps "−".
 *
 * A copy with no such minus is left to the browser untouched, and so is any copy out of an
 * input, a textarea or an editable element: what the person typed is theirs.
 *
 * Installed once per document by `UiKitProvider` (`copyAsciiMinus`, default `true`) —
 * the one part every app mounts, the signed-out pages included.
 */

/** U+2212, then (optionally) a currency code or symbol, then spaces, then a digit. */
const MINUS_BEFORE_NUMBER = /\u2212(?=(?:[A-Z]{3}|\p{Sc})?[\s\u00a0\u202f]*\d)/gu;

/**
 * `text` with each U+2212 that stands before a number (in the sense above) as the ASCII
 * hyphen-minus, every other character as it was — for text an app hands a machine that
 * did not come from a formatter's `minus: "ascii"`.
 */
export function asciiMinusInNumbers(text: string): string {
  return text.replace(MINUS_BEFORE_NUMBER, "-");
}

function hasMinusBeforeNumber(text: string): boolean {
  MINUS_BEFORE_NUMBER.lastIndex = 0;
  const found = MINUS_BEFORE_NUMBER.test(text);
  MINUS_BEFORE_NUMBER.lastIndex = 0;
  return found;
}

/** An input, a textarea or an editable element: a copy there is the person's own text. */
function isEditable(node: Node | null | undefined): boolean {
  const el = node instanceof Element ? node : node?.parentElement;
  if (!el) return false;
  if (el.closest("input, textarea, select")) return true;
  return (el as HTMLElement).isContentEditable === true || el.closest('[contenteditable=""], [contenteditable="true"]') !== null;
}

/** Table parts copied alone are wrapped back into a table, which Excel reads as cells. */
function wrapTableParts(container: HTMLElement): string {
  const first = container.firstElementChild?.tagName;
  const html = container.innerHTML;
  if (first === "TD" || first === "TH") return `<table><tbody><tr>${html}</tr></tbody></table>`;
  if (first === "TR") return `<table><tbody>${html}</tbody></table>`;
  if (first === "TBODY" || first === "THEAD" || first === "TFOOT") return `<table>${html}</table>`;
  return html;
}

function onCopy(event: ClipboardEvent): void {
  if (event.defaultPrevented || !event.clipboardData) return;
  const doc = (event.target as Node | null)?.ownerDocument ?? document;
  if (isEditable(event.target as Node | null) || isEditable(doc.activeElement)) return;
  const selection = doc.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
  if (isEditable(selection.anchorNode) || isEditable(selection.focusNode)) return;
  const text = selection.toString();
  if (!hasMinusBeforeNumber(text)) return;

  const container = doc.createElement("div");
  for (let i = 0; i < selection.rangeCount; i++) container.appendChild(selection.getRangeAt(i).cloneContents());
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    node.nodeValue = asciiMinusInNumbers(node.nodeValue ?? "");
  }
  event.clipboardData.setData("text/plain", asciiMinusInNumbers(text));
  event.clipboardData.setData("text/html", wrapTableParts(container));
  event.preventDefault();
}

const installs = new WeakMap<Document, number>();

/**
 * Listen for copies on `doc` until the returned function is called. Counted: nested
 * providers install it once, and the last one to go removes it.
 */
export function installClipboardMinus(doc: Document = document): () => void {
  const count = installs.get(doc) ?? 0;
  if (count === 0) doc.addEventListener("copy", onCopy);
  installs.set(doc, count + 1);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    const left = (installs.get(doc) ?? 1) - 1;
    installs.set(doc, left);
    if (left === 0) doc.removeEventListener("copy", onCopy);
  };
}
