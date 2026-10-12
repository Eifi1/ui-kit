import axe from "axe-core";

/**
 * axe on every showcase page mount (refactor audit 2026-10, DOC-10; the module audit of
 * 2026-09-22 had asked for it). The page shards already mount each page once, so this is
 * the cheapest place to catch an accessibility regression in a kit component before it
 * reaches three apps.
 *
 * ONLY THE RULES jsdom CAN JUDGE: the ARIA ones (roles, attributes and their values,
 * required children and parents, names of the ARIA widgets), `label`, `button-name`,
 * `link-name`, `list` / `listitem`, and duplicate ids. jsdom has no layout and Vitest
 * loads no app stylesheet, so colour contrast, target size, `region` and the other
 * landmark and visibility rules would report on a page nobody sees; those are the
 * Playwright sweep's (`check:sweep`) business.
 */
export const AXE_RULES: readonly string[] = axe
  .getRules()
  .map((rule) => rule.ruleId)
  .filter((id) => id.startsWith("aria-") || ["label", "button-name", "link-name", "list", "listitem"].includes(id));

/**
 * What axe finds today and is known: each with its reason. A kit bug stays here until its
 * fix lands (then its entry goes, and the shard holds the fix); a specimen's own mistake
 * is fixed in the showcase instead of listed. Matched on the rule, the page (when given)
 * and the start of the element's HTML as axe prints it.
 */
export const AXE_KNOWN: ReadonlyArray<{
  rule: string;
  pages?: readonly string[];
  html: RegExp;
  reason: string;
}> = [
  {
    rule: "label",
    html: /^<input [^>]*class="sr-only"[^>]*type="file"|^<input [^>]*type="file"[^>]*class="sr-only"/,
    reason:
      "kit: FileDropzone (file-dropzone.tsx:522) and FeedbackAttachmentField's single-file mode " +
      "(feedback-attachment.tsx:497) leave their sr-only file input in the tab order with no name, beside " +
      "the button that is the way in; the other modes and useFilePicker take it out (tabIndex -1, aria-hidden)",
  },
  {
    rule: "label",
    pages: ["feedback-inbox"],
    html: /^<textarea /,
    reason:
      "kit: FeedbackNoteEditor names its textarea only through `placeholder` (feedback-inbox.tsx:425); " +
      "without one it is read as just 'edit text'",
  },
  {
    rule: "aria-conditional-attr",
    html: /^<tr [^>]*aria-expanded=/,
    reason:
      "kit: DataTable puts aria-expanded on the row that opens a detail (data-table.tsx:1568); ARIA allows " +
      "it on a treegrid row, not a table row",
  },
  {
    rule: "aria-required-children",
    html: /^<div role="tablist"/,
    reason:
      "kit: Tabs draws the active tab's remove × inside the tablist (tabs.tsx:546), which may own tabs only",
  },
];

export interface AxeFinding {
  rule: string;
  /** The element's opening tag (axe's `html`). */
  html: string;
}

/** The attributes whose value is a list of ids. */
const ID_REFS = [
  "aria-activedescendant",
  "aria-controls",
  "aria-describedby",
  "aria-details",
  "aria-errormessage",
  "aria-flowto",
  "aria-labelledby",
  "aria-owns",
];

const openingTag = (el: Element) => el.outerHTML.slice(0, el.outerHTML.indexOf(">") + 1);

/**
 * axe's `duplicate-id` and `duplicate-id-aria`, in one pass. axe's own rules query the
 * document once per id, which on a 1,200-element page took 1.5–2.5 s of a jsdom run; this
 * counts the ids once. An id used twice is `duplicate-id-aria` when an ARIA attribute or a
 * `<label for>` points at it (the reference then reaches the wrong element), and
 * `duplicate-id` otherwise. One finding per id, on its first element inside `root`.
 */
export function duplicateIds(root: Element, exclude?: Element): AxeFinding[] {
  const all = [...root.ownerDocument.querySelectorAll("[id]")];
  const count = new Map<string, number>();
  for (const el of all) count.set(el.id, (count.get(el.id) ?? 0) + 1);
  const referenced = new Set<string>();
  for (const el of root.ownerDocument.querySelectorAll(ID_REFS.map((a) => `[${a}]`).join(","))) {
    for (const attr of ID_REFS) for (const id of (el.getAttribute(attr) ?? "").split(/\s+/)) if (id) referenced.add(id);
  }
  for (const label of root.ownerDocument.querySelectorAll("label[for]")) referenced.add(label.getAttribute("for")!);
  const findings: AxeFinding[] = [];
  const seen = new Set<string>();
  for (const el of all) {
    if (!el.id || (count.get(el.id) ?? 0) < 2 || seen.has(el.id)) continue;
    if (!root.contains(el) || exclude?.contains(el)) continue;
    seen.add(el.id);
    findings.push({ rule: referenced.has(el.id) ? "duplicate-id-aria" : "duplicate-id", html: openingTag(el) });
  }
  return findings;
}

/** The elements the HTML default stylesheet hides (`display: none`), as jsdom applies it. */
const HIDDEN_BY_DEFAULT = new Set([
  "area", "base", "basefont", "datalist", "head", "link", "meta", "noembed", "noframes", "param", "rp", "script",
  "style", "template", "title",
]);

/** An element's `visibility`: its own inline value, else its nearest ancestor's. */
function inheritedVisibility(element: Element): string {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const own = (el as HTMLElement).style?.visibility;
    if (own && own !== "inherit") return own;
  }
  return "visible";
}

/**
 * `getComputedStyle` for the length of an axe run.
 *
 * axe asks every element whether it is hidden, and jsdom answers each call by cloning its
 * declarations and matching every rule of its default stylesheet against the element:
 * 2–2.5 ms an element, 7.5 of 8.5 s on the 3,000-element Calendar heatmap page (profiled),
 * and a DOM change between two of axe's rules drops jsdom's cache, so it can happen twice.
 *
 * So the three properties axe's visibility test reads — `display`, `visibility`,
 * `content-visibility` — are answered from what jsdom's cascade has to go on here: the
 * inline style, the `hidden` attribute and the default stylesheet's hidden elements.
 * Vitest loads no app stylesheet (vitest.config.ts `css`), so the Tailwind classes the
 * kit and the showcase style with have no rules in jsdom anyway. The one sheet a page
 * can hold is one a library injects at run time — sonner's, for its toaster — so a
 * toaster's elements, and every other property, still go to jsdom (once per element).
 */
function styleForAxe(original: typeof window.getComputedStyle): typeof window.getComputedStyle {
  const memo = new WeakMap<Element, CSSStyleDeclaration>();
  const real = (element: Element) => {
    let style = memo.get(element);
    if (!style) {
      style = original.call(window, element);
      memo.set(element, style);
    }
    return style;
  };
  return function (element: Element, pseudo?: string | null) {
    if (pseudo) return original.call(window, element, pseudo);
    if (element.closest("[data-sonner-toaster]")) return real(element);
    const inline = (element as HTMLElement).style;
    const fast: Record<string, () => string> = {
      display: () =>
        inline?.display ||
        (element.hasAttribute("hidden") ||
        HIDDEN_BY_DEFAULT.has(element.localName) ||
        (element.localName === "dialog" && !element.hasAttribute("open"))
          ? "none"
          : "block"),
      visibility: () => inheritedVisibility(element),
      "content-visibility": () => inline?.getPropertyValue("content-visibility") || "visible",
    };
    return new Proxy({} as CSSStyleDeclaration, {
      get(_, key) {
        if (key === "getPropertyValue") {
          return (property: string) => fast[property]?.() ?? real(element).getPropertyValue(property);
        }
        const value: unknown = Reflect.get(real(element), key);
        return typeof value === "function" ? value.bind(real(element)) : value;
      },
    });
  } as typeof window.getComputedStyle;
}

/**
 * Runs {@link AXE_RULES} and {@link duplicateIds} over `root` (less `exclude`) and returns
 * what {@link AXE_KNOWN} does not explain, for the page `slug`.
 *
 * Kept near a second for a large page: `getComputedStyle` is {@link styleForAxe}'s, and
 * axe builds no CSS selectors for what it finds (`selectors: false`; the HTML says which
 * element) — making one unique is a `querySelectorAll` per element.
 */
export async function axeFindings(root: Element, slug: string, exclude?: Element): Promise<AxeFinding[]> {
  const original = window.getComputedStyle;
  window.getComputedStyle = styleForAxe(original);
  try {
    const result = await axe.run(exclude ? { include: [root], exclude: [exclude] } : root, {
      runOnly: { type: "rule", values: [...AXE_RULES] },
      resultTypes: ["violations"],
      selectors: false,
      ancestry: false,
      xpath: false,
    });
    const found = [
      ...result.violations.flatMap((violation) => violation.nodes.map((node) => ({ rule: violation.id, html: node.html }))),
      ...duplicateIds(root, exclude),
    ];
    return found.filter(
      (finding) =>
        !AXE_KNOWN.some(
          (known) =>
            known.rule === finding.rule && (!known.pages || known.pages.includes(slug)) && known.html.test(finding.html),
        ),
    );
  } finally {
    window.getComputedStyle = original;
  }
}
