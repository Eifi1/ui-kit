import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchField } from "../search-field";

/**
 * The page-level filter box, which Keksdose had four of.
 *
 * Two were character-identical twenty-line copies; the third was the same idea
 * missing the clear button and `type="search"`; the fourth was a bare `<Input
 * placeholder="Search">` with no icon, no clear and no accessible name. What these
 * cases pin is precisely the set of things the degraded copies had dropped — because
 * "they all look the same now" is not the claim, "the fourth screen got the button
 * the first one earned" is.
 */
function Harness({ clearLabel }: { clearLabel?: string }) {
  const [value, setValue] = useState("");
  return (
    <SearchField
      value={value}
      onChange={setValue}
      label="Find a setting"
      placeholder="Search settings"
      clearLabel={clearLabel}
    />
  );
}

describe("SearchField", () => {
  it("is a searchbox with a name that survives typing", () => {
    // `type="search"` is what gives it the role; the name is a real `aria-label`
    // rather than the placeholder, which disappears the moment someone types — i.e.
    // exactly when a screen-reader user is working in the field.
    render(<Harness />);
    const box = screen.getByRole("searchbox", { name: "Find a setting" });
    expect(box).toHaveAttribute("type", "search");
    fireEvent.change(box, { target: { value: "dark" } });
    expect(screen.getByRole("searchbox", { name: "Find a setting" })).toHaveValue("dark");
  });

  it("emits the string, not the event", () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} label="Find" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "x" } });
    expect(onChange).toHaveBeenCalledWith("x");
  });

  it("shows the clear button only once there is something to clear", () => {
    render(<Harness clearLabel="Clear search" />);
    expect(screen.queryByRole("button", { name: "Clear search" })).toBeNull();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dark" } });
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("empties the field and puts the caret back in it", () => {
    // Clearing is the start of the next query far more often than it is the end of
    // this one, so focus returns to the box rather than staying on a button that has
    // just removed itself from the page.
    render(<Harness clearLabel="Clear search" />);
    const box = screen.getByRole("searchbox");
    fireEvent.change(box, { target: { value: "dark" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("renders no clear button when the caller names none", () => {
    // Omitting `clearLabel` is a decision, not a default — an unnamed icon button is
    // worse than no button, so the way to get one is to name it.
    render(<Harness />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "dark" } });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("suppresses the browser's own clear cross", () => {
    // `type="search"` gives Chrome a NATIVE clear X, which painted an inch from ours
    // — two crosses, one of them nameless. Ours is the one that keeps an accessible
    // name and matches the app's other icon buttons.
    render(<Harness clearLabel="Clear search" />);
    expect(screen.getByRole("searchbox").className).toContain(
      "[&::-webkit-search-cancel-button]:appearance-none",
    );
  });

  it("falls back to the name when no placeholder is given", () => {
    // The bank picker had a placeholder and nothing else; a caller with only a label
    // should still get a box that says what it is before it is typed in.
    render(<SearchField value="" onChange={vi.fn()} label="Find a bank" />);
    expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Find a bank");
  });
});
