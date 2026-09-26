import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DescriptionItem, DescriptionList } from "../description-list";
import { UiKitProvider } from "../../i18n/kit-labels";

/** `placeholder`: what an item with no value shows — kastlan's DetailField put its
 *  EMPTY_VALUE into every value by hand (detail-field.tsx:38). */
describe("DescriptionItem placeholder", () => {
  it("shows an em dash, muted, for a missing value — and a 0 as itself", () => {
    render(
      <DescriptionList>
        <DescriptionItem term="IBAN">{null}</DescriptionItem>
        <DescriptionItem term="Notes">{""}</DescriptionItem>
        <DescriptionItem term="Units">{0}</DescriptionItem>
        <DescriptionItem term="Owner">Ada</DescriptionItem>
      </DescriptionList>,
    );
    const [iban, notes, units, owner] = screen.getAllByRole("definition");
    expect(iban).toHaveTextContent("—");
    expect(iban.querySelector("[data-slot=description-empty]")).toHaveClass("text-[var(--text-muted)]");
    expect(notes).toHaveTextContent("—");
    expect(units).toHaveTextContent("0");
    expect(owner).toHaveTextContent("Ada");
  });

  it("takes the word from the provider, the list, or the item — nearest wins", () => {
    render(
      <UiKitProvider labels={{ descriptionList: { empty: "n/a" } }}>
        <DescriptionList>
          <DescriptionItem term="A" />
        </DescriptionList>
        <DescriptionList placeholder="none">
          <DescriptionItem term="B" />
          <DescriptionItem term="C" placeholder="not set" />
        </DescriptionList>
      </UiKitProvider>,
    );
    const [a, b, c] = screen.getAllByRole("definition");
    expect(a).toHaveTextContent("n/a");
    expect(b).toHaveTextContent("none");
    expect(c).toHaveTextContent("not set");
  });

  it("`null` shows nothing, as an empty detail did before", () => {
    render(
      <DescriptionList>
        <DescriptionItem term="IBAN" placeholder={null} />
      </DescriptionList>,
    );
    expect(screen.getByRole("definition")).toBeEmptyDOMElement();
  });
});
