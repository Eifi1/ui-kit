import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Delta, SignedAmount, Tone, toneTextClass } from "../signed-amount";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("SignedAmount", () => {
  it("shows the sign, tones by sign and speaks the direction as words", () => {
    const { container } = render(
      <>
        <SignedAmount value={50} currency="USD" locale="en-US" data-testid="up" />
        <SignedAmount value={-50} currency="USD" locale="en-US" data-testid="down" />
        <SignedAmount value={0} currency="USD" locale="en-US" data-testid="zero" />
      </>,
    );
    const up = screen.getByTestId("up");
    expect(up.querySelector("[aria-hidden]")).toHaveTextContent("+$50.00");
    expect(up).toHaveClass("text-[var(--money-income)]");
    expect(screen.getByText("plus $50.00")).toHaveClass("sr-only");

    const down = screen.getByTestId("down");
    expect(down.querySelector("[aria-hidden]")).toHaveTextContent("−$50.00");
    expect(down).toHaveClass("text-[var(--money-expense)]");
    expect(screen.getByText("minus $50.00")).toBeInTheDocument();

    expect(screen.getByTestId("zero")).toHaveClass("text-[var(--text-muted)]");
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });

  it("judges by goodDirection: a rent rise is bad news", () => {
    render(<SignedAmount value={120} goodDirection="down" arrow locale="en-US" data-testid="rise" />);
    const el = screen.getByTestId("rise");
    expect(el).toHaveClass("text-[var(--danger)]");
    expect(el.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("formats a percent as a ratio, drops the plus on request, and takes provider labels", () => {
    render(
      <UiKitProvider labels={{ signedAmount: { positive: (a) => `mehr ${a}` } }}>
        <SignedAmount value={0.125} unit="percent" locale="en-US" showPlus={false} tone="neutral" data-testid="p" />
      </UiKitProvider>,
    );
    const el = screen.getByTestId("p");
    expect(el.querySelector("[aria-hidden]")).toHaveTextContent(/^12\.5%$/);
    expect(screen.getByText("mehr 12.5%")).toBeInTheDocument();
  });
});

describe("Delta", () => {
  it("is StatTile's delta: arrow, unsigned amount, a sentence with a verdict", () => {
    render(<Delta value={-0.05} unit="percent" goodDirection="down" label="vs last month" locale="en-US" />);
    expect(screen.getByText("Down 5% (better)")).toHaveClass("sr-only");
    expect(screen.getByText("vs last month")).toBeInTheDocument();
    const figure = screen.getByText("Down 5% (better)").parentElement!;
    expect(figure).toHaveClass("text-[var(--success)]");
    expect(figure.querySelector("svg")).not.toBeNull();
  });

  it("is muted and unjudged without goodDirection, and says 'No change' at zero", () => {
    render(
      <>
        <Delta value={3} locale="en-US" />
        <Delta value={0} locale="en-US" />
      </>,
    );
    expect(screen.getByText("Up 3").parentElement).toHaveClass("text-[var(--text-muted)]");
    expect(screen.getByText("No change")).toBeInTheDocument();
  });

  it("renders nothing for a non-finite value", () => {
    const { container } = render(<Delta value={Number.NaN} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("Tone / toneTextClass", () => {
  it("colours text from the kit's tokens", () => {
    expect(toneTextClass("danger")).toBe("text-[var(--danger)]");
    render(<Tone tone="success">12</Tone>);
    expect(screen.getByText("12")).toHaveClass("text-[var(--success)]");
  });
});
