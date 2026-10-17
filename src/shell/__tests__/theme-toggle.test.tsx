import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../topbar-controls";

/** docs/top-bar-harmonization.md §6.4: the app's preference, written through onChange. */

describe("ThemeToggle", () => {
  it("asks for the opposite of the mode shown — from a system dark, light", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ThemeToggle mode="dark" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(onChange).toHaveBeenLastCalledWith("light");
    rerender(<ThemeToggle mode="light" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    expect(onChange).toHaveBeenLastCalledWith("dark");
  });

  it("keeps no storage of its own", () => {
    const set = vi.spyOn(Storage.prototype, "setItem");
    render(<ThemeToggle mode="light" onChange={() => {}} />);
    fireEvent.click(screen.getByRole("button"));
    expect(set).not.toHaveBeenCalled();
    set.mockRestore();
  });

  it("still calls 0.41's onToggle", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle mode="light" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
