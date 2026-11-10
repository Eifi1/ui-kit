import { render, screen } from "@testing-library/react";
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
import type { LegalOperator } from "../legal";
import { LegalKitSection, LegalPage } from "../legal-page";

/**
 * The terms' `changes` section and its commercial variant (0.58; keksdose's legal audit
 * against the app, Marcel 2026-11-09, docs/legal-harmonization.md decision 10). No app can
 * take payment today, and the refund sentence undercut the imprint's "non-commercial", so
 * the default ends with what an objection leads to; `variant="commercial"`, keyed as the
 * imprint disclaimer's, is the same text with the refund after it. The operator is
 * synthetic.
 */

const OPERATOR: LegalOperator = {
  name: "Example Operator",
  postalCode: "0000",
  city: "Example Town",
  region: "EX",
  country: "CH",
  email: "legal@example.com",
};

const C = DEFAULT_LEGAL_LABELS.sections.terms.changes;
const section = () => document.getElementById("changes");

const CATALOGUES: Record<string, () => UiKitLabels> = {
  en: () => uiKitLabelsEn(),
  "de-CH": () => uiKitLabelsDeCh(),
  fr: () => uiKitLabelsFr(),
  it: () => uiKitLabelsIt(),
  es: () => uiKitLabelsEs(),
  hu: () => uiKitLabelsHu(),
  zh: () => uiKitLabelsZh(),
};

/** The refund sentence, as each catalogue words it — what the default must not say. */
const REFUND: Record<string, string> = {
  en: "If you have paid for a period that runs beyond that date, we refund the unused part.",
  "de-CH":
    "Haben Sie einen Zeitraum bezahlt, der über dieses Datum hinausgeht, erstatten wir den nicht genutzten Teil.",
  fr: "Si vous avez payé une période qui s’étend au-delà de cette date, nous remboursons la part non utilisée.",
  it: "Se ha pagato un periodo che va oltre tale data, Le rimborsiamo la parte non utilizzata.",
  es: "Si ha pagado un periodo que va más allá de esa fecha, le reembolsamos la parte no utilizada.",
  hu: "Ha olyan időszakra fizetett, amely ezen a napon túlnyúlik, a fel nem használt részt visszatérítjük.",
  zh: "如您已付费的期间超过该日期，我们将退还未使用部分的费用。",
};

describe('LegalKitSection section="changes" (0.58)', () => {
  it("ends with what an objection leads to, and says nothing of a refund, by default", () => {
    const { rerender } = render(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalKitSection section="changes" />
      </LegalPage>,
    );
    expect(section()).toHaveTextContent(C.body);
    expect(C.body).toMatch(/If you object to a change, we may end your account on the date it takes effect\.$/);
    expect(section()?.textContent).not.toContain("refund");
    rerender(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalKitSection section="changes" variant="non-commercial" />
      </LegalPage>,
    );
    expect(section()?.textContent).not.toContain("refund");
  });

  it("variant commercial: the same clause with the refund after it, under the same title and id", () => {
    render(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalKitSection section="warranty" />
        <LegalKitSection section="changes" variant="commercial" />
      </LegalPage>,
    );
    expect(screen.getByRole("heading", { level: 2, name: `2. ${C.title}` })).toBeInTheDocument();
    expect(section()?.textContent).toBe(`2. ${C.title}${C.commercial}`);
    expect(C.commercial).toBe(`${C.body} ${REFUND.en}`);
  });

  it("takes the provider's words, and English where a tree has no commercial text", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ legal: { sections: { terms: { changes: { commercial: "Mit Erstattung." } } } } }}>
        <LegalKitSection page="terms" section="changes" variant="commercial" />
      </UiKitProvider>,
    );
    expect(section()).toHaveTextContent("Mit Erstattung.");
    rerender(
      <UiKitProvider labels={{ legal: { sections: { terms: { changes: { title: "Änderungen", body: "Ohne." } } } } }}>
        <LegalKitSection page="terms" section="changes" variant="commercial" />
      </UiKitProvider>,
    );
    expect(section()).toHaveTextContent(C.commercial ?? "");
  });

  it.each(Object.entries(CATALOGUES))("%s: no refund by default; the commercial text adds it", (code, make) => {
    const { body, commercial } = make().legal.sections.terms.changes;
    expect(body).not.toContain(REFUND[code]);
    expect(commercial).toBeDefined();
    // Word for word the default, then the one sentence: the two texts cannot drift apart.
    expect(commercial!.startsWith(body)).toBe(true);
    expect(commercial!.slice(body.length).trim()).toBe(REFUND[code]);
  });
});
