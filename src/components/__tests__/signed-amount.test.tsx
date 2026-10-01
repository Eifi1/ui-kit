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

describe("palette='money' and flatWithin (keksdose dev#434 price changes)", () => {
  it("paints a verdict in the money pair: a price rise is an expense, a fall income", () => {
    render(
      <>
        <SignedAmount value={0.3} goodDirection="down" palette="money" locale="en-US" data-testid="rise" />
        <SignedAmount value={-0.3} goodDirection="down" palette="money" locale="en-US" data-testid="fall" />
        <SignedAmount value={0.3} goodDirection="down" locale="en-US" data-testid="status" />
      </>,
    );
    expect(screen.getByTestId("rise")).toHaveClass("text-[var(--money-expense)]");
    expect(screen.getByTestId("fall")).toHaveClass("text-[var(--money-income)]");
    // Unset, the verdict is still success / danger.
    expect(screen.getByTestId("status")).toHaveClass("text-[var(--danger)]");
  });

  it("Delta takes the same palette, sentence unchanged", () => {
    render(<Delta value={0.04} unit="percent" goodDirection="down" palette="money" locale="en-US" />);
    expect(screen.getByText("Up 4% (worse)").parentElement).toHaveClass("text-[var(--money-expense)]");
  });

  it("counts |value| <= flatWithin as no change: no sign, muted, no verdict", () => {
    render(
      <>
        <SignedAmount value={-0.004} digits={2} flatWithin={0.005} goodDirection="down" data-testid="tiny" locale="en-US" />
        <SignedAmount value={0.005} flatWithin={0.005} data-testid="edge" locale="en-US" />
        <SignedAmount value={0.006} flatWithin={0.005} digits={3} data-testid="past" locale="en-US" />
        <Delta value={0.004} digits={2} flatWithin={0.005} goodDirection="down" palette="money" locale="en-US" />
      </>,
    );
    const tiny = screen.getByTestId("tiny");
    expect(tiny).toHaveAttribute("data-direction", "flat");
    expect(tiny).toHaveClass("text-[var(--text-muted)]");
    // No "−0.00": the sign that flat-by-rounding used to keep.
    expect(tiny.querySelector("[aria-hidden]")).toHaveTextContent(/^0\.00$/);
    expect(screen.getByTestId("edge")).toHaveAttribute("data-direction", "flat");
    expect(screen.getByTestId("past")).toHaveAttribute("data-direction", "up");
    const delta = screen.getByText("No change").parentElement!;
    expect(delta).toHaveClass("text-[var(--text-muted)]");
    expect(delta.parentElement).toHaveAttribute("data-direction", "flat");
  });
});

describe("ratio={false}: percent POINTS (keksdose 0.17 Q4)", () => {
  it("reads value and flatWithin in points, with the ratio default unchanged", () => {
    render(
      <>
        <Delta value={12.5} unit="percent" ratio={false} goodDirection="down" locale="en-US" data-testid="pts" />
        <Delta value={0.4} unit="percent" ratio={false} flatWithin={0.5} goodDirection="down" locale="en-US" data-testid="flat" />
        <Delta value={0.125} unit="percent" locale="en-US" data-testid="default" />
        <SignedAmount value={-3} unit="percent" ratio={false} locale="en-US" data-testid="sa" />
      </>,
    );
    const pts = screen.getByTestId("pts");
    expect(pts).toHaveAttribute("data-direction", "up");
    expect(pts).toHaveTextContent("12.5%");
    expect(pts.querySelector(".text-\\[var\\(--danger\\)\\]")).not.toBeNull();
    // 0.4 points is inside the half-point band: no change, no verdict.
    expect(screen.getByTestId("flat")).toHaveAttribute("data-direction", "flat");
    expect(screen.getByTestId("default")).toHaveTextContent("12.5%");
    const sa = screen.getByTestId("sa");
    expect(sa.querySelector("[aria-hidden]")).toHaveTextContent("−3%");
    expect(screen.getByText("minus 3%")).toHaveClass("sr-only");
  });

  it("ignores ratio for a non-percent unit", () => {
    render(<SignedAmount value={12} ratio={false} locale="en-US" data-testid="n" />);
    expect(screen.getByTestId("n").querySelector("[aria-hidden]")).toHaveTextContent("+12");
  });
});
