import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatComposer } from "../feedback-thread";

/**
 * keksdose (0.22): its assistant launcher is a small floating panel. `size="sm"` keeps
 * the Send button small and the send hint out of view — but still the box's description.
 */
describe("ChatComposer size", () => {
  it("sm: the hint is hidden from view and describes the box", () => {
    render(<ChatComposer onSend={() => {}} sendOn="enter" size="sm" />);
    const hint = screen.getByText("Enter to send, Shift + Enter for a new line");
    expect(hint).toHaveClass("sr-only");
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Enter to send, Shift + Enter for a new line");
  });

  it("md (default): the hint shows and the box carries no description from it", () => {
    render(<ChatComposer onSend={() => {}} sendOn="enter" />);
    expect(screen.getByText("Enter to send, Shift + Enter for a new line")).not.toHaveClass("sr-only");
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-describedby");
  });

  it("sm: the Send button is the small one", () => {
    const { rerender } = render(<ChatComposer onSend={() => {}} />);
    const md = screen.getByRole("button", { name: /Send/ }).className;
    rerender(<ChatComposer onSend={() => {}} size="sm" />);
    expect(screen.getByRole("button", { name: /Send/ }).className).not.toBe(md);
  });
});
