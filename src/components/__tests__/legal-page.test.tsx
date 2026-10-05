import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { DEFAULT_LEGAL_LABELS, LegalSection } from "../legal";
import type { LegalOperator } from "../legal";
import { LEGAL_SKELETON, LegalAcceptCheckbox, LegalKitSection, LegalPage } from "../legal-page";

/**
 * The 0.28 legal pages (docs/legal-harmonization.md §3–§5): keksdose's frame, the kit's
 * sections filled in with the operator, numbering, ids and `{ref:key}` — forward ones
 * included — and the terms checkbox. The operator is synthetic: the kit holds no
 * personal data, its tests neither.
 */

const OPERATOR: LegalOperator = {
  name: "Example Operator",
  postalCode: "0000",
  city: "Example Town",
  region: "EX",
  country: "CH",
  email: "legal@example.com",
};

const L = DEFAULT_LEGAL_LABELS;

const headings = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
const sectionIds = (container: HTMLElement) => [...container.querySelectorAll("section")].map((s) => s.id);

afterEach(() => {
  document.head.querySelectorAll('meta[name="robots"]').forEach((m) => m.remove());
});

/** keksdose's privacy page, in the 0.28 shape: kit and app sections in the skeleton's
 *  order, a forward reference in section 2, one in an app paragraph. */
function PrivacyPage() {
  return (
    <LegalPage page="privacy" operator={OPERATOR}>
      <LegalKitSection section="controller" />
      <LegalSection key="data" heading="What data we process" body="Receipts: see section {ref:retention} for how long." />
      <LegalKitSection section="legal_basis">Your consent (Art. 6(1)(a) GDPR) for what you switch on yourself.</LegalKitSection>
      <LegalSection key="third_parties" heading="Hosting and processors" body="Example Cloud." />
      <LegalKitSection section="browser" entries={["your sign-in tokens", "the language you picked"]}>
        Signing out also wipes the offline copy.
      </LegalKitSection>
      <LegalSection key="transfers" heading="International data transfers" body="None." />
      <LegalSection key="retention" heading="Retention and deletion" body="Write to the address in section {ref:contact}." />
      <LegalKitSection section="rights">{"Export it under Settings.\nDelete it there too (section {ref:retention})."}</LegalKitSection>
      <LegalKitSection section="contact" />
    </LegalPage>
  );
}

describe("LegalPage — the frame (§3.2)", () => {
  it("draws the header, the back link home, the title, the notice, the sections and the footer", () => {
    render(
      <LegalPage page="terms" operator={OPERATOR} header={<header>Example App</header>}>
        <LegalKitSection section="warranty" />
      </LegalPage>,
    );
    expect(screen.getByText("Example App")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: L.backHome })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(L.titles.terms);
    expect(screen.getByRole("note")).toHaveTextContent(L.notice.beta);
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { level: 1 }));
    const footer = screen.getByRole("contentinfo");
    const nav = within(footer).getByRole("navigation", { name: L.navLabel });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/impressum",
      "/privacy",
      "/terms",
    ]);
    // The default footer marks the page it is on.
    expect(within(nav).getByRole("link", { name: L.links.terms })).toHaveAttribute("aria-current", "page");
  });

  it("gives each page its notice — the privacy notice on the privacy policy — and takes the app's", () => {
    const { unmount } = render(<PrivacyPage />);
    expect(screen.getByRole("note")).toHaveTextContent(L.notice.privacy);
    unmount();
    render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="operator" />
      </LegalPage>,
    );
    expect(screen.getByRole("note")).toHaveTextContent(L.notice.beta);
  });

  it("takes homeHref, its own notice, no notice, no footer and its own footer", () => {
    const { rerender } = render(
      <LegalPage page="terms" operator={OPERATOR} homeHref="/login" notice="Ours." footer={null}>
        <LegalKitSection section="changes" />
      </LegalPage>,
    );
    expect(screen.getByRole("link", { name: L.backHome })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("note")).toHaveTextContent("Ours.");
    expect(screen.queryByRole("contentinfo")).toBeNull();
    rerender(
      <LegalPage page="terms" operator={OPERATOR} notice={null} footer={<footer>Own footer</footer>}>
        <LegalKitSection section="changes" />
      </LegalPage>,
    );
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByRole("contentinfo")).toHaveTextContent("Own footer");
  });

  it("embeds as a preview: h2 title with h3 sections, no <main>, no noindex", () => {
    render(
      <LegalPage page="terms" operator={OPERATOR} headingAs="h2" landmark={false} noIndex={false}>
        <LegalKitSection section="warranty" />
      </LegalPage>,
    );
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(L.titles.terms);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(`1. ${L.sections.terms.warranty.title}`);
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("calls useNoIndex: the marker is there while the page is, and gone after", () => {
    const { unmount } = render(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalKitSection section="law" />
      </LegalPage>,
    );
    expect(document.head.querySelectorAll('meta[name="robots"][content="noindex"]')).toHaveLength(1);
    unmount();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it("reaches every part inside with its labels prop", () => {
    render(
      <LegalPage
        page="terms"
        operator={OPERATOR}
        labels={{ backHome: "Home", titles: { terms: "Conditions" }, sections: { terms: { warranty: { title: "As is" } } } }}
      >
        <LegalKitSection section="warranty" />
      </LegalPage>,
    );
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Conditions");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("1. As is");
    // The rest of the namespace stays the kit's.
    expect(screen.getByText(L.sections.terms.warranty.body)).toBeInTheDocument();
  });
});

describe("LegalPage — numbering and ids (§4.1)", () => {
  it("numbers the privacy sections in render order and gives each its key as id", () => {
    const { container } = render(<PrivacyPage />);
    expect(headings()).toEqual([
      "1. Controller",
      "2. What data we process",
      "3. Legal basis",
      "4. Hosting and processors",
      "5. What your browser stores",
      "6. International data transfers",
      "7. Retention and deletion",
      "8. Your rights",
      "9. Contact for data protection",
    ]);
    // An app section's id is its React key: keksdose's `SECTIONS.map((s) => <LegalSection key={s} …/>)`.
    expect(sectionIds(container)).toEqual([
      "controller",
      "data",
      "legal_basis",
      "third_parties",
      "browser",
      "transfers",
      "retention",
      "rights",
      "contact",
    ]);
  });

  it("follows the skeleton (§4.2): the fixed keys in its order", () => {
    const { container } = render(<PrivacyPage />);
    const ids = sectionIds(container);
    const fixed = LEGAL_SKELETON.privacy.sections.map((s) => s.key).filter((k) => k !== "*");
    expect(ids.filter((id) => fixed.includes(id))).toEqual(fixed);
  });

  it("does not number the imprint", () => {
    render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="operator" />
        <LegalKitSection section="contact" />
        <LegalKitSection section="disclaimer" />
        <LegalSection key="credits" heading="Credits" body="Palette: Paul Tol." />
      </LegalPage>,
    );
    expect(headings()).toEqual(["Operator", "Contact", "Liability for content and links", "Credits"]);
  });

  it("numbers the terms, with sections in arrays and fragments, and an explicit id winning over the key", () => {
    const APP = ["scope", "no_advice"];
    const { container } = render(
      <LegalPage page="terms" operator={OPERATOR}>
        {APP.map((key) => (
          <LegalSection key={key} heading={key} body="…" />
        ))}
        <>
          <LegalSection key="accounts" id="accounts-and-access" heading="accounts" body="…" />
          <>
            <LegalKitSection section="warranty" />
            {false}
            {null}
          </>
        </>
        <p>Not a section — passed through, not counted.</p>
        <LegalKitSection section="law" />
      </LegalPage>,
    );
    expect(headings()).toEqual(["1. scope", "2. no_advice", "3. accounts", "4. No warranty", "5. Governing law"]);
    expect(sectionIds(container)).toEqual(["scope", "no_advice", "accounts-and-access", "warranty", "law"]);
    expect(screen.getByText("Not a section — passed through, not counted.")).toBeInTheDocument();
  });

  it("renders a section it cannot see (wrapped in an app component) unnumbered", () => {
    function Wrapped() {
      return <LegalSection heading="Hidden from the walk" body="…" />;
    }
    render(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalKitSection section="warranty" />
        <Wrapped />
      </LegalPage>,
    );
    expect(headings()).toEqual(["1. No warranty", "Hidden from the walk"]);
  });

  it("does not hand a nested section its parent's number or id", () => {
    const { container } = render(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalSection key="scope" heading="Scope">
          <LegalSection heading="Detail" headingAs="h3" body="…" />
        </LegalSection>
      </LegalPage>,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(/^Detail$/);
    expect(sectionIds(container)).toEqual(["scope", ""]);
  });

  it("raises no React key warning for static children, arrays or fragments", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<PrivacyPage />);
    render(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalKitSection section="warranty" />
        <>
          <LegalKitSection section="liability" />
          <LegalKitSection section="changes" />
        </>
        {["a", "b"].map((k) => (
          <LegalSection key={k} heading={k} />
        ))}
      </LegalPage>,
    );
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });
});

describe("LegalPage — {ref:key} (§4.1)", () => {
  it("resolves a FORWARD reference to the target's number, linked to its id", () => {
    render(<PrivacyPage />);
    const data = screen.getByRole("heading", { name: "2. What data we process" }).closest("section")!;
    const ref = within(data).getByRole("link", { name: "7" });
    expect(ref).toHaveAttribute("href", "#retention");
    expect(data).toHaveTextContent("Receipts: see section 7 for how long.");
  });

  it("resolves a reference to a kit section, and one in an app paragraph of a kit section", () => {
    render(<PrivacyPage />);
    const retention = screen.getByRole("heading", { name: "7. Retention and deletion" }).closest("section")!;
    expect(within(retention).getByRole("link", { name: "9" })).toHaveAttribute("href", "#contact");
    const rights = screen.getByRole("heading", { name: "8. Your rights" }).closest("section")!;
    expect(within(rights).getByRole("link", { name: "7" })).toHaveAttribute("href", "#retention");
  });

  it("links a reference on the unnumbered imprint by the target's heading", () => {
    render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="operator" />
        <LegalKitSection section="contact" />
        <LegalSection key="credits" heading="Credits" body="Questions: see {ref:contact}." />
      </LegalPage>,
    );
    expect(screen.getByRole("link", { name: L.sections.impressum.contact.title })).toHaveAttribute("href", "#contact");
  });

  it("leaves a reference to no section visible as its token, and text outside a page alone", () => {
    render(
      <LegalPage page="terms" operator={OPERATOR}>
        <LegalSection key="scope" heading="Scope" body="See {ref:nowhere}." />
      </LegalPage>,
    );
    expect(screen.getByText("See {ref:nowhere}.")).toBeInTheDocument();
  });
});

describe("LegalKitSection (§4.3)", () => {
  it("fills the imprint's operator and contact in, the country named in the page's language", () => {
    const { container, unmount } = render(
      <LegalPage page="impressum" operator={OPERATOR}>
        <LegalKitSection section="operator" />
        <LegalKitSection section="contact" />
      </LegalPage>,
    );
    const operator = container.querySelector("#operator p")!;
    expect(operator.textContent).toBe(
      "Example Operator\n0000 Example Town\nSwitzerland\n\nThe full postal address is supplied on request to anyone with a legitimate legal interest; write to the contact address below.",
    );
    expect(operator.className).toContain("whitespace-pre-line");
    expect(container.querySelector("#contact")).toHaveTextContent("Email: legal@example.com");
    unmount();

    render(
      <UiKitProvider locale="de-CH">
        <LegalPage page="terms" operator={OPERATOR}>
          <LegalKitSection section="law" />
        </LegalPage>
      </UiKitProvider>,
    );
    expect(screen.getByText(/place of jurisdiction is Example Town \(EX\), Schweiz\.$/)).toBeInTheDocument();
  });

  it("names the country in the page's own locale prop over the provider's", () => {
    render(
      <UiKitProvider locale="de-CH">
        <LegalPage page="privacy" operator={OPERATOR} locale="fr">
          <LegalKitSection section="controller" />
        </LegalPage>
      </UiKitProvider>,
    );
    expect(screen.getByText(/0000 Example Town, Suisse/)).toBeInTheDocument();
  });

  it("puts the app paragraph after the kit's text for legal_basis", () => {
    const { container } = render(<PrivacyPage />);
    const paragraphs = [...container.querySelectorAll("#legal_basis p")].map((p) => p.textContent);
    expect(paragraphs).toEqual([
      L.sections.privacy.legal_basis.body,
      "Your consent (Art. 6(1)(a) GDPR) for what you switch on yourself.",
    ]);
  });

  it("puts the app paragraph between the rights and the authorities, line breaks kept", () => {
    const { container } = render(<PrivacyPage />);
    const paragraphs = [...container.querySelectorAll("#rights p")];
    expect(paragraphs.map((p) => p.textContent)).toEqual([
      L.sections.privacy.rights.lead,
      "Export it under Settings.\nDelete it there too (section 7).",
      L.sections.privacy.rights.tail,
    ]);
    expect(paragraphs[1].className).toContain("whitespace-pre-line");
  });

  it("renders the browser entries as a list between its two sentences, the app paragraph last", () => {
    const { container } = render(<PrivacyPage />);
    const section = container.querySelector("#browser")!;
    const blocks = [...section.querySelectorAll(":scope > div > div > *")];
    expect(blocks.map((b) => b.tagName)).toEqual(["P", "UL", "P", "P"]);
    expect(blocks[0]).toHaveTextContent(L.sections.privacy.browser.lead);
    expect(within(blocks[1] as HTMLElement).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "your sign-in tokens",
      "the language you picked",
    ]);
    expect(blocks[2]).toHaveTextContent(L.sections.privacy.browser.tail);
    expect(blocks[3]).toHaveTextContent("Signing out also wipes the offline copy.");
  });

  it("tells the two contacts apart by the page", () => {
    const { container } = render(<PrivacyPage />);
    expect(container.querySelector("#contact")).toHaveTextContent(
      `${L.sections.privacy.contact.title}For any privacy request, contact: legal@example.com`,
    );
  });

  it("works outside a page with page and operator props, and says what is missing otherwise", () => {
    const { container } = render(<LegalKitSection section="contact" page="impressum" operator={OPERATOR} />);
    expect(container.querySelector("section#contact")).toHaveTextContent("Email: legal@example.com");
    // Unambiguous keys need no page.
    render(<LegalKitSection section="warranty" />);
    expect(screen.getByRole("heading", { name: L.sections.terms.warranty.title })).toBeInTheDocument();

    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<LegalKitSection section="contact" />)).toThrow(/more than one page/);
    expect(() => render(<LegalKitSection section="law" />)).toThrow(/names the operator/);
    expect(() =>
      render(
        <LegalPage page="impressum" operator={OPERATOR}>
          <LegalKitSection section="warranty" />
        </LegalPage>,
      ),
    ).toThrow(/not one of the kit's sections of the impressum page/);
    error.mockRestore();
  });

  it("has a label entry for every kit section of the skeleton, and no other", () => {
    for (const page of ["impressum", "privacy", "terms"] as const) {
      const kit = LEGAL_SKELETON[page].sections.filter((s) => s.owner !== "app").map((s) => s.key);
      expect(Object.keys(L.sections[page]).sort(), page).toEqual([...kit].sort());
    }
  });
});

describe("LegalAcceptCheckbox (§3.4)", () => {
  it("is a required checkbox whose label links the terms and the privacy policy by their titles", () => {
    const onCheckedChange = vi.fn();
    render(<LegalAcceptCheckbox checked={false} onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox");
    expect(box).toBeRequired();
    expect(box).not.toBeChecked();
    expect(screen.getByRole("link", { name: L.titles.terms })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: L.titles.privacy })).toHaveAttribute("href", "/privacy");
    // The accessible name: the required star is aria-hidden, the word comes from `required`.
    expect(box).toHaveAccessibleName("I accept the Terms of Service and the Privacy Policy");
    fireEvent.click(box);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("takes the hrefs", () => {
    render(<LegalAcceptCheckbox checked onCheckedChange={() => {}} termsHref="/legal/terms" privacyHref="/legal/privacy" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(screen.getByRole("link", { name: L.titles.terms })).toHaveAttribute("href", "/legal/terms");
    expect(screen.getByRole("link", { name: L.titles.privacy })).toHaveAttribute("href", "/legal/privacy");
  });

  it("adds nothing around a placeholder: Italian's elided article stays glued to the link", () => {
    render(
      <LegalAcceptCheckbox
        checked={false}
        onCheckedChange={() => {}}
        labels={{
          accept: "Accetto le {terms} e l’{privacy}",
          titles: { terms: "Condizioni d’uso", privacy: "Informativa sulla privacy" },
        }}
      />,
    );
    const privacy = screen.getByRole("link", { name: "Informativa sulla privacy" });
    const label = privacy.closest("label")!;
    expect(label.textContent).toContain("Accetto le Condizioni d’uso e l’Informativa sulla privacy");
    expect(privacy.previousSibling?.textContent).toBe(" e l’");
  });

  it("puts the links where the language's template does (fr: articles in the template)", () => {
    render(
      <UiKitProvider labels={{ legal: { accept: "J’accepte les {terms} et la {privacy}", titles: { terms: "Conditions" } } }}>
        <LegalAcceptCheckbox checked={false} onCheckedChange={() => {}} />
      </UiKitProvider>,
    );
    const terms = screen.getByRole("link", { name: "Conditions" });
    expect(terms.closest("label")!.textContent).toContain(`J’accepte les Conditions et la ${L.titles.privacy}`);
  });
});
