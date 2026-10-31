import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountrySelect } from "../country-select";

/**
 * A country's ISO code answers a query only as the WHOLE code (0.52 code review,
 * country-select.tsx). 0.52 moved the search onto the kit's word match (DUP-4) with the
 * code as one more text to search in, so each word also matched any LETTER of the code:
 * "w" listed Aruba (AW), Curaçao (CW) and Samoa (WS), and "d" Germany (DE) — rows with
 * nothing of the query in their names. Until then the code matched only exactly, which
 * is what "ch" means Switzerland is about.
 */

function search(q: string) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: q } });
  return screen.queryAllByRole("option").map((o) => o.textContent ?? "");
}

describe("CountrySelect: the code matches whole", () => {
  it("a letter of a code finds no country whose name lacks it", () => {
    render(<CountrySelect label="Country" locale="en" value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Country/ }));
    const w = search("w");
    expect(w).not.toContain("Aruba");
    expect(w).not.toContain("Curaçao");
    expect(w).not.toContain("Samoa");
    expect(w).toContain("Rwanda");
    expect(search("d")).not.toContain("Germany");
  });

  it("the whole code still finds its country, first, and as one word among others", () => {
    render(<CountrySelect label="Country" locale="en" value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByRole("combobox", { name: /Country/ }));
    expect(search("de")[0]).toBe("Germany");
    expect(search("DE")[0]).toBe("Germany");
    // A code word and a name word: each matches its own way.
    expect(search("cd congo")).toEqual(["Congo - Kinshasa"]);
  });
});
