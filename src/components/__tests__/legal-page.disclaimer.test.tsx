import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { DEFAULT_LEGAL_LABELS } from "../legal";
import type { LegalOperator } from "../legal";
import { LegalKitSection, LegalPage } from "../legal-page";

/**
 * The imprint disclaimer's commercial variant (0.32.0, docs/billing-harmonization.md §8,
 * legal decision 7): chosen per app, in the release that turns its billing on. The
 * non-commercial default does not change. The operator is synthetic.
 */

const OPERATOR: LegalOperator = {
  name: "Example Operator",
  postalCode: "0000",
  city: "Example Town",
  region: "EX",
  country: "CH",
  email: "legal@example.com",
};

const D = DEFAULT_LEGAL_LABELS.sections.impressum.disclaimer;
const section = () => document.getElementById("disclaimer");

describe('LegalKitSection section="disclaimer" variant', () => {
  it("keeps the non-commercial text by default and under its own name", () => {
    const { rerender } = render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="disclaimer" />
      </LegalPage>,
    );
    expect(section()).toHaveTextContent(D.body);
    expect(section()).toHaveTextContent("private, non-commercial project");
    rerender(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="disclaimer" variant="non-commercial" />
      </LegalPage>,
    );
    expect(section()).toHaveTextContent(D.body);
  });

  it("says commercial service and Merchant of Record, under the same title and id", () => {
    render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="operator" />
        <LegalKitSection section="contact" />
        <LegalKitSection section="disclaimer" variant="commercial" />
      </LegalPage>,
    );
    expect(screen.getByRole("heading", { level: 2, name: D.title })).toBeInTheDocument();
    const text = section()?.textContent ?? "";
    expect(text).toBe(`${D.title}${D.commercial}`);
    expect(text).toContain("commercial service");
    expect(text).toContain("Merchant of Record");
    expect(text).not.toContain("non-commercial");
    expect(text).not.toContain("closed beta");
  });

  it("takes the provider's words, and falls back to English for a catalogue without the key", () => {
    const { rerender } = render(
      <UiKitProvider labels={{ legal: { sections: { impressum: { disclaimer: { commercial: "Kommerziell." } } } } }}>
        <LegalKitSection page="impressum" section="disclaimer" variant="commercial" />
      </UiKitProvider>,
    );
    expect(section()).toHaveTextContent("Kommerziell.");
    rerender(
      <UiKitProvider labels={{ legal: { sections: { impressum: { disclaimer: { title: "Haftung", body: "Privat." } } } } }}>
        <LegalKitSection page="impressum" section="disclaimer" variant="commercial" />
      </UiKitProvider>,
    );
    expect(section()).toHaveTextContent(D.commercial ?? "");
  });
});
