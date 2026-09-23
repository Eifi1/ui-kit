import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilterPopover } from "../data-table-filter-popover";
import type { DataTableColumn } from "../data-table";

/**
 * `autoFocus` was hard-coded on the text filter's input, with no way to opt out.
 *
 * Inside the popover it opens in, that is right: the control exists to be typed into,
 * and it is mounted by an explicit press on "Filter". Anywhere else it is focus theft
 * — the showcase embeds the same component in a page to document it, and the page
 * loaded 25,000px scrolled down, because the browser scrolls whatever grabs focus into
 * view. A prop with the popover's behaviour as its default keeps both callers honest.
 */
const noop = () => {};

const column: DataTableColumn<{ name: string }> = {
  key: "name",
  header: "Name",
  cell: (row) => row.name,
  filterBy: (row) => row.name,
};

const renderPopover = (props: { autoFocus?: boolean } = {}) =>
  render(
    <FilterPopover
      column={column}
      state={{ type: "text", q: "" }}
      onChange={noop}
      onClear={noop}
      selectOptions={[]}
      {...props}
    />,
  );

describe("FilterPopover's text input", () => {
  it("takes focus by default, which is what the popover needs", () => {
    renderPopover();
    expect(screen.getByRole("textbox")).toHaveFocus();
  });

  it("leaves focus alone when the embedder says so", () => {
    renderPopover({ autoFocus: false });
    expect(screen.getByRole("textbox")).not.toHaveFocus();
    expect(document.body).toHaveFocus();
  });
});
