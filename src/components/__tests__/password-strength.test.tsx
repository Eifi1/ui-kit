import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PasswordStrengthMeter, passwordByteLength, passwordRules, scorePassword } from "../password-strength";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("scorePassword", () => {
  it("is 0 for empty and anything under the minimum, however varied", () => {
    expect(scorePassword("")).toBe(0);
    expect(scorePassword("aB3$xyz")).toBe(0);
    expect(scorePassword("aB3$xyzw", { minLength: 10 })).toBe(0);
  });

  it("climbs with length, and variety adds one", () => {
    expect(scorePassword("abcdefgh")).toBe(1);
    expect(scorePassword("abcdefghijkl")).toBe(2);
    expect(scorePassword("abcdefghijklmnop")).toBe(3);
    expect(scorePassword("abcdefghijklmnoP1")).toBe(4);
    expect(scorePassword("abcdefgH1")).toBe(2);
  });

  it("caps a long run of too few distinct characters at weak", () => {
    expect(scorePassword("aaaaaaaaaaaaaaaaaaaa")).toBe(1);
    expect(scorePassword("ab1ab1ab1ab1ab1ab1ab1")).toBe(1);
  });

  it("counts characters, not UTF-16 units", () => {
    expect(passwordRules("😀😀😀😀😀😀😀")[0].met).toBe(false);
    expect(passwordByteLength("ü")).toBe(2);
  });

  it("reports which rules are met, and only length as required", () => {
    const rules = passwordRules("Ünïcode1");
    expect(rules.map((r) => [r.id, r.met, r.required])).toEqual([
      ["length", true, true],
      ["case", true, false],
      ["digit", true, false],
      ["symbol", false, false],
    ]);
  });
});

describe("PasswordStrengthMeter", () => {
  it("shows nothing visible for an empty value, but keeps its live region", () => {
    const { container } = render(<PasswordStrengthMeter value="" />);
    expect(container.querySelector("ul")).toBeNull();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("writes the level out, not only the colour", () => {
    render(<PasswordStrengthMeter value="abcdefghijkl" />);
    expect(screen.getByText("Fair")).toBeInTheDocument();
  });

  it("lists the requirements with their state for a screen reader", () => {
    render(<PasswordStrengthMeter value="abcdefgh" />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Met: ✓ At least 8 characters");
    expect(items[1]).toHaveTextContent("Not met: ○ Upper and lower case (optional)");
  });

  it("can hide the checklist", () => {
    render(<PasswordStrengthMeter value="abcdefgh" showRequirements={false} />);
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("warns past maxBytes", () => {
    render(<PasswordStrengthMeter value={"ü".repeat(40)} maxBytes={72} />);
    expect(screen.getByText(/At most 72 characters/)).toBeInTheDocument();
  });

  it("uses an injected scorer", () => {
    render(<PasswordStrengthMeter value="x" score={() => 4} />);
    expect(screen.getByText("Strong")).toBeInTheDocument();
  });

  it("announces a change of level, politely, and not on mount", async () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<PasswordStrengthMeter value="abcdefgh" />);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      const region = screen.getByRole("status");
      expect(region).toHaveAttribute("aria-live", "polite");
      expect(region).toHaveTextContent("");
      rerender(<PasswordStrengthMeter value="abcdefghijkl" />);
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(region).toHaveTextContent("Password strength: Fair");
    } finally {
      vi.useRealTimers();
    }
  });

  it("takes its strings from the provider, and the prop over the provider", () => {
    render(
      <UiKitProvider labels={{ passwordStrength: { weak: "Schwach", ruleLength: (n) => `Mindestens ${n} Zeichen` } }}>
        <PasswordStrengthMeter value="abcdefghij" minLength={10} labels={{ ruleDigit: "Eine Ziffer" }} />
      </UiKitProvider>,
    );
    expect(screen.getByText("Schwach")).toBeInTheDocument();
    expect(screen.getByText(/Mindestens 10 Zeichen/)).toBeInTheDocument();
    expect(screen.getByText(/Eine Ziffer/)).toBeInTheDocument();
  });
});
