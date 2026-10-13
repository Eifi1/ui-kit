import axe from "axe-core";

/**
 * axe over one rendered card, with the rules jsdom can judge — the showcase's page check
 * (showcase/src/__tests__/page-axe.ts): the ARIA rules, `label`, `button-name`,
 * `link-name`, `list` / `listitem` and the duplicate ids. Colour contrast and the layout
 * rules need a browser; the Playwright sweep has them.
 */
const RULES = axe
  .getRules()
  .map((rule) => rule.ruleId)
  .filter(
    (id) =>
      id.startsWith("aria-") ||
      ["label", "button-name", "link-name", "list", "listitem", "duplicate-id", "duplicate-id-aria"].includes(id),
  );

/** `rule: <opening tag>` per violation under `root`; `[]` when clean. */
export async function axeViolations(root: Element): Promise<string[]> {
  const result = await axe.run(root, {
    runOnly: { type: "rule", values: RULES },
    resultTypes: ["violations"],
    selectors: false,
    ancestry: false,
    xpath: false,
  });
  return result.violations.flatMap((violation) => violation.nodes.map((node) => `${violation.id}: ${node.html}`));
}
