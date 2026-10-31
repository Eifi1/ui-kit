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
 *
 * And the STRUCTURE rules, which read only the tree (refactor audit 2026-10-30, DOC-7):
 * a control inside a control (row actions, a chip's remove button, a card link), a native
 * select's name, the image roles (charts, sparklines, the QR code), description lists,
 * input buttons, `autocomplete` values (the auth forms), positive tabindex, a field with
 * two labels, table headers and their cells, `<summary>`'s name, and a presentational
 * role that a focusable element or a global ARIA attribute overrides.
 */
const STRUCTURE_RULES = [
  "nested-interactive",
  "select-name",
  "role-img-alt",
  "svg-img-alt",
  "image-alt",
  "definition-list",
  "dlitem",
  "input-button-name",
  "autocomplete-valid",
  "tabindex",
  "form-field-multiple-labels",
  "empty-table-header",
  "td-headers-attr",
  "th-has-data-cells",
  "summary-name",
  "presentation-role-conflict",
];

export const AXE_RULES: readonly string[] = axe
  .getRules()
  .map((rule) => rule.ruleId)
  .filter(
    (id) =>
      id.startsWith("aria-") ||
      ["label", "button-name", "link-name", "list", "listitem", ...STRUCTURE_RULES].includes(id),
  );

/** One known finding: the rule, the pages it is known on (all when left out), the start
 *  of the element's HTML as axe prints it, and why it is there. */
export interface AxeKnown {
  rule: string;
  pages?: readonly string[];
  html: RegExp;
  reason: string;
}

/**
 * What axe finds today and is known: each with its reason. A kit bug stays here until its
 * fix lands (then its entry goes, and the shard holds the fix); a specimen's own mistake
 * is fixed in the showcase instead of listed. Matched on the rule, the page (when given)
 * and the start of the element's HTML as axe prints it.
 *
 * Empty from round 0.34 (the five kit bugs the check found when it landed were fixed:
 * FileDropzone's and FeedbackAttachmentField's single-mode file input, FeedbackNoteEditor's
 * unnamed box, DataTable's `aria-expanded` on a `<tr>`, Tabs' × inside the tablist) until
 * 0.52's structure rules (DOC-7) found the ones below on their first run. Each names the
 * area that owns the fix.
 */
export const AXE_KNOWN: readonly AxeKnown[] = [
  {
    rule: "empty-table-header",
    pages: ["calendar-heatmap"],
    html: /^<div role="rowheader" aria-label="[^"]+" class="overflow-hidden pe-1 text-micro/,
    reason:
      "CalendarHeatmap (charts) prints every other weekday, as a contribution graph does, and names all seven " +
      "with aria-label; axe's best-practice rule wants visible text in a header. Charts' call: a sr-only name " +
      "in the blank rows would satisfy it.",
  },
  {
    rule: "empty-table-header",
    pages: ["measured-grid"],
    html: /^<div role="columnheader" aria-label="[^"]+" class="border-s border-subtle"><\/div>/,
    reason:
      "MeasuredGrid's (tables) row-actions column header has no visible text by design, only " +
      "`labels.rowActions` as aria-label; a sr-only span with the same words would satisfy the rule.",
  },
  {
    rule: "nested-interactive",
    pages: ["buttons"],
    html: /^<div (?:class="relative h-56 [^"]*" style="[^"]*" )?role="img" aria-label="(?:A map at|Camera viewfinder)/,
    reason:
      'The specimen\'s own backdrop (showcase/src/sections/buttons-012-demo.tsx): a role="img" stand-in for a ' +
      "map or a camera with the FloatingActionButton inside it. Fix in the showcase: no role on the backdrop, " +
      "or the picture's name on a sibling.",
  },
  {
    rule: "nested-interactive",
    pages: ["links"],
    html: /^<div role="button" tabindex="0" class="flex min-w-0 flex-wrap items-center justify-between/,
    reason:
      "The specimen (showcase/src/sections/links-demo.tsx) is a clickable row with a TextLink inside, the pattern " +
      "TextLink's stopPropagation exists for; the nesting is what it demonstrates.",
  },
  {
    rule: "definition-list",
    pages: ["media"],
    html: /^<dl class="space-y-1 font-mono/,
    reason:
      "The specimen's status readout (showcase/src/sections/media-demo.tsx) is a <dl> of plain <div>s. Fix in " +
      "the showcase: a <div>, or <dt>/<dd> pairs.",
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
  "area",
  "base",
  "basefont",
  "datalist",
  "head",
  "link",
  "meta",
  "noembed",
  "noframes",
  "param",
  "rp",
  "script",
  "style",
  "template",
  "title",
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
 * what `known` ({@link AXE_KNOWN} unless a test passes its own) does not explain, for the
 * page `slug`.
 *
 * Kept near a second for a large page: `getComputedStyle` is {@link styleForAxe}'s, and
 * axe builds no CSS selectors for what it finds (`selectors: false`; the HTML says which
 * element) — making one unique is a `querySelectorAll` per element.
 */
export async function axeFindings(
  root: Element,
  slug: string,
  exclude?: Element,
  known: readonly AxeKnown[] = AXE_KNOWN,
): Promise<AxeFinding[]> {
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
      ...result.violations.flatMap((violation) =>
        violation.nodes.map((node) => ({ rule: violation.id, html: node.html })),
      ),
      ...duplicateIds(root, exclude),
    ];
    return found.filter(
      (finding) =>
        !known.some(
          (entry) =>
            entry.rule === finding.rule &&
            (!entry.pages || entry.pages.includes(slug)) &&
            entry.html.test(finding.html),
        ),
    );
  } finally {
    window.getComputedStyle = original;
  }
}
