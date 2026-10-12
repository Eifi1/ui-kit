import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Pagination } from "../data-table-pagination";

/**
 * 0.25 (found while building the translation review's groups): a page size that is not
 * one of the select's steps (a `defaultPageSize` of 5) had no option, so the select
 * showed its first one — "10" — while the table paged by 5.
 */
describe("Pagination: the page-size select", () => {
  it("offers an off-step page size, in order, and shows it", () => {
    render(<Pagination page={0} totalPages={4} pageSize={5} total={20} onPage={() => {}} onPageSize={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Rows per page" }) as HTMLSelectElement;
    expect(select.value).toBe("5");
    const options = within(select)
      .getAllByRole("option")
      .map((o) => (o as HTMLOptionElement).value);
    expect(options).toEqual(["5", "10", "25", "50", "100", "200", "all"]);
  });

  it("keeps the plain steps for a size that is one of them", () => {
    render(<Pagination page={0} totalPages={3} pageSize={25} total={60} onPage={() => {}} onPageSize={() => {}} />);
    const select = screen.getByRole("combobox", { name: "Rows per page" }) as HTMLSelectElement;
    expect(within(select).getAllByRole("option")).toHaveLength(6);
    expect(select.value).toBe("25");
  });
});
