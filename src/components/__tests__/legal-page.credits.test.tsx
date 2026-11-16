import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import type { UiKitLabels } from "../../i18n/kit-labels";
import { uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { uiKitLabelsEs } from "../../i18n/locales/es";
import { uiKitLabelsFr } from "../../i18n/locales/fr";
import { uiKitLabelsHu } from "../../i18n/locales/hu";
import { uiKitLabelsIt } from "../../i18n/locales/it";
import { uiKitLabelsZh } from "../../i18n/locales/zh";
import { DEFAULT_LEGAL_LABELS } from "../legal";
import type { LegalLabels, LegalOperator } from "../legal";
import { LEGAL_SKELETON, LegalKitSection, LegalPage } from "../legal-page";

/**
 * The imprint's credits (0.63): the kit's default chart palette is anyplot.ai's categorical
 * palette "Imprint", and every app that colours its charts from it says so on its imprint —
 * keksdose, kastlan, Kurvenschmiede and Staunlabor each wrote the same sentence with two
 * links of their own. Now it is the kit's section, worded once in seven languages, and
 * OPTIONAL: an app that does not use the palette leaves it out. Both links count for
 * anyplot.ai (`referrer`): no `noreferrer`, no `nofollow`. The operator is synthetic.
 */

const OPERATOR: LegalOperator = {
  name: "Example Operator",
  postalCode: "0000",
  city: "Example Town",
  region: "EX",
  country: "CH",
  email: "legal@example.com",
};

const CATALOGUES: Record<string, () => UiKitLabels> = {
  en: () => uiKitLabelsEn(),
  "de-CH": () => uiKitLabelsDeCh(),
  fr: () => uiKitLabelsFr(),
  it: () => uiKitLabelsIt(),
  es: () => uiKitLabelsEs(),
  hu: () => uiKitLabelsHu(),
  zh: () => uiKitLabelsZh(),
};

/** Where each language names the site before the palette ("az anyplot.ai „Imprint” nevű …"). */
const SITE_FIRST = new Set(["hu", "zh"]);

const section = () => document.getElementById("credits")!;
const links = () => within(section()).getAllByRole("link");
const credits = (labels: UiKitLabels) =>
  (labels.legal.sections.impressum as LegalLabels["sections"]["impressum"]).credits!;

describe('LegalKitSection section="credits" (0.63)', () => {
  it("is the imprint's last kit section, optional, after the app's own", () => {
    const keys = LEGAL_SKELETON.impressum.sections.map((s) => s.key);
    expect(keys).toEqual(["operator", "contact", "disclaimer", "*", "credits"]);
    const entry = LEGAL_SKELETON.impressum.sections.find((s) => s.key === "credits");
    expect(entry).toEqual({ key: "credits", owner: "kit", optional: true });
    // No other section is optional: an app's skeleton test keeps every one of them.
    const optional = Object.values(LEGAL_SKELETON).flatMap((p) => p.sections.filter((s) => s.optional));
    expect(optional.map((s) => s.key)).toEqual(["credits"]);
  });

  it("names the palette and the site, each a new-tab link that counts for anyplot.ai", () => {
    render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="operator" />
        <LegalKitSection section="contact" />
        <LegalKitSection section="disclaimer" />
        <LegalKitSection section="credits" />
      </LegalPage>,
    );
    expect(within(section()).getByRole("heading", { level: 2 })).toHaveTextContent("Credits");
    const [palette, site] = links();
    expect(palette).toHaveAccessibleName("Imprint (opens in a new tab)");
    expect(palette).toHaveAttribute("href", "https://anyplot.ai/palette");
    expect(site).toHaveAccessibleName("anyplot.ai (opens in a new tab)");
    expect(site).toHaveAttribute("href", "https://anyplot.ai");
    for (const link of [palette, site]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener");
      expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    }
    const text = section()
      .querySelector("p")!
      .textContent!.replace(/ ?\(opens in a new tab\)/g, "");
    expect(text).toBe(
      "The colours in the charts come from “Imprint”, the categorical palette of anyplot.ai. Its eight hues were " +
        "validated by anyplot.ai against deuteranopia, protanopia and tritanopia and tuned for warm paper.",
    );
    expect(text).not.toMatch(/drawing/);
  });

  it("renders outside a LegalPage too: the imprint is its only page", () => {
    render(<LegalKitSection section="credits" />);
    expect(links().map((a) => a.getAttribute("href"))).toEqual(["https://anyplot.ai/palette", "https://anyplot.ai"]);
  });

  it("a page without it follows the skeleton once its optional sections are set aside", () => {
    const { container } = render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="operator" />
        <LegalKitSection section="contact" />
        <LegalKitSection section="disclaimer" />
      </LegalPage>,
    );
    const ids = [...container.querySelectorAll("section")].map((s) => s.id);
    const required = LEGAL_SKELETON.impressum.sections.filter((s) => s.key !== "*" && !s.optional).map((s) => s.key);
    expect(ids.filter((id) => required.includes(id))).toEqual(required);
  });

  it.each(Object.keys(CATALOGUES))("%s: both links, in the language's order, around its own words", (code) => {
    const labels = CATALOGUES[code]();
    const words = credits(labels);
    expect(words.title).not.toBe("");
    for (const token of ["{palette}", "{site}"]) expect(words.body.split(token)).toHaveLength(2);
    expect(words.body.indexOf("{site}") < words.body.indexOf("{palette}")).toBe(SITE_FIRST.has(code));
    render(
      <UiKitProvider labels={labels}>
        <LegalPage page="impressum" operator={OPERATOR}>
          <LegalKitSection section="credits" />
        </LegalPage>
      </UiKitProvider>,
    );
    expect(within(section()).getByRole("heading")).toHaveTextContent(words.title);
    const hrefs = links().map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(
      SITE_FIRST.has(code)
        ? ["https://anyplot.ai", "https://anyplot.ai/palette"]
        : ["https://anyplot.ai/palette", "https://anyplot.ai"],
    );
    for (const link of links()) expect(link).toHaveAttribute("rel", "noopener");
    // The words between the links are the catalogue's, to the character.
    const [before, , after] = words.body.split(/\{palette\}|\{site\}/);
    expect(section().textContent).toContain(before);
    expect(section().textContent).toContain(after);
  });

  it("an app's own legal labels without the key fall back to the kit's English", () => {
    const { credits: _dropped, ...impressum } = DEFAULT_LEGAL_LABELS.sections.impressum;
    render(
      <LegalPage
        page="impressum"
        operator={OPERATOR}
        labels={{ sections: { impressum: impressum as LegalLabels["sections"]["impressum"] } }}
      >
        <LegalKitSection section="credits" />
      </LegalPage>,
    );
    expect(screen.getByRole("heading", { name: "Credits" })).toBeInTheDocument();
    expect(links()).toHaveLength(2);
  });
});
