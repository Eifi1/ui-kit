import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MiniCalendar } from "../mini-calendar";
import { DatePicker } from "../date-picker";
import { upperFirst } from "../../lib/text-case";

/**
 * A month caption upper-cases its FIRST letter, the one way (refactor audit 2026-10-30,
 * DUP-11). MiniCalendar's caption was the `toLocaleDateString` text under CSS
 * `capitalize`, which upper-cases every word: Spanish read "Septiembre De 2026" and
 * Hungarian "2026. Szeptember", while the same DatePicker with `monthJump` read
 * "Septiembre de 2026" and "2026. szeptember". The kit ships es and hu (KS ships both).
 * jsdom draws no CSS, so the test reads the text and the class.
 */
describe("month captions", () => {
  it("MiniCalendar's caption: the first letter only, in the text, with no `capitalize`", () => {
    const { unmount } = render(
      <MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale="es" onSelect={() => {}} />,
    );
    const es = screen.getByText("Septiembre de 2026");
    expect(es).not.toHaveClass("capitalize");
    unmount();

    render(<MiniCalendar mode="single" from="2026-09-14" to="2026-09-14" locale="hu" onSelect={() => {}} />);
    const hu = screen.getByText("2026. szeptember");
    expect(hu).not.toHaveClass("capitalize");
  });

  it("names the grid by that caption, as the month jump's caption does", () => {
    render(<DatePicker aria-label="Fecha" value="2026-09-14" onChange={() => {}} locale="es" monthJump />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("grid", { name: "Septiembre de 2026" })).toBeInTheDocument();
  });

  it("upperFirst: the first letter, in the locale's case mapping", () => {
    expect(upperFirst("septiembre de 2026", "es")).toBe("Septiembre de 2026");
    expect(upperFirst("2026. szeptember", "hu")).toBe("2026. szeptember");
    expect(upperFirst("ilk", "tr")).toBe("İlk");
    expect(upperFirst("", "en")).toBe("");
  });
});
