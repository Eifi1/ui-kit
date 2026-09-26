import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KeyRound } from "lucide-react";
import { ActionCard } from "../choice-card";

describe("ActionCard (keksdose CustodyOption)", () => {
  it("is a button named by the title and described by body and meta", () => {
    render(
      <ActionCard
        icon={KeyRound}
        title="Keep the key yourself"
        description="Only you can read your data."
        meta="Lose the key and the data is gone."
        metaTone="warning"
        onClick={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Keep the key yourself" });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAccessibleDescription("Only you can read your data. Lose the key and the data is gone.");
    expect(screen.getByText("Lose the key and the data is gone.").className).toContain("text-[var(--warning)]");
    expect(button.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("runs its action on click, and not when disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<ActionCard title="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<ActionCard title="Go" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("with only a title it has no description", () => {
    render(<ActionCard title="Go" />);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
  });
});
