import { fireEvent, render, screen } from "@testing-library/react";
import { LanguageMenu } from "../topbar-controls";

/** kastlan: a `heading` over the language list, as TopBarActionMenu and
 *  OptionSwitcherMenu already have (0.7.0). */
const OPTIONS = [
  { code: "en", label: "English", country: "gb" },
  { code: "de", label: "Deutsch", country: "de" },
];

describe("LanguageMenu", () => {
  it("renders a heading row above the options when given one", () => {
    render(<LanguageMenu options={OPTIONS} current="en" onChange={() => {}} heading="Language" />);
    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    const heading = screen.getByText("Language", { selector: "li" });
    expect(heading.className).toContain("uppercase");
    const english = screen.getByText("English").closest("button")!;
    expect(heading.compareDocumentPosition(english) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders none without it", () => {
    render(<LanguageMenu options={OPTIONS} current="en" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    expect(screen.getByText("Deutsch").closest("button")!).toBeInTheDocument();
    expect(screen.queryByText("Language", { selector: "li" })).toBeNull();
  });

  it("aligns its rows to the reading start", () => {
    render(<LanguageMenu options={OPTIONS} current="en" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Language" }));
    const row = screen.getByText("Deutsch").closest("button")!;
    expect(row.className).toContain("text-start");
    expect(row.className).not.toContain("text-left");
  });
});
