import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Slider, fromLogPosition, toLogPosition } from "../slider";

/**
 * The slider Lenkbank's `docs/ui-kit-slider-proposal.md` asked for, and the four
 * decisions that proposal says belong in one place: the log scale with a zero stop,
 * `aria-valuetext`, the 24px target, and "the number is the truth".
 *
 * Two of those were shipped defects in Lenkbank's own copy — a log track announcing
 * its 0–1 position, a six-pixel pointer target — and a third was found writing this:
 * with a zero stop, one arrow key from "off" lands in the gap before `min`, rounds
 * back to zero, and a keyboard user can never turn the term on. Each has a test here.
 */

const noop = () => {};

describe("Slider — linear", () => {
  it("is a native range input that reports a NUMBER", () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Speed" value={30} min={0} max={120} step={5} onChange={onChange} />);
    const slider = screen.getByRole("slider", { name: "Speed" });
    expect(slider).toHaveAttribute("type", "range");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "120");
    expect(slider).toHaveAttribute("step", "5");
    expect(slider).toHaveValue("30");
    fireEvent.change(slider, { target: { value: "45" } });
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it("leaves aria-valuetext to the native value unless told otherwise", () => {
    const { rerender } = render(<Slider aria-label="Speed" value={30} min={0} max={120} onChange={noop} />);
    expect(screen.getByRole("slider")).not.toHaveAttribute("aria-valuetext");
    rerender(
      <Slider aria-label="Speed" value={30} min={0} max={120} onChange={noop} formatValue={(v) => `${v} km/h`} />,
    );
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "30 km/h");
  });

  it("keeps a value outside the track, pins the thumb, and announces the REAL value", () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Gain" value={500} min={0} max={200} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveValue("200");
    // A screen reader must not be told 200 about a field that holds 500.
    expect(slider).toHaveAttribute("aria-valuetext", "500");
    // And nothing was written back: displaying a value is not editing it.
    expect(onChange).not.toHaveBeenCalled();
  });

  it("sets the fill from the position", () => {
    render(<Slider aria-label="S" value={25} min={0} max={100} onChange={noop} style={{ color: "red" }} />);
    const slider = screen.getByRole("slider");
    expect(slider.style.getPropertyValue("--slider-fill")).toBe("25%");
    // The caller's own style survives the merge.
    expect(slider.style.color).toBe("red");
  });

  it("works as a controlled input", () => {
    function Controlled() {
      const [v, setV] = useState(10);
      return <Slider aria-label="S" value={v} min={0} max={100} onChange={setV} readout={v} />;
    }
    render(<Controlled />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "70" } });
    expect(screen.getByRole("slider")).toHaveValue("70");
    expect(screen.getByText("70")).toBeInTheDocument();
  });
});

describe("Slider — log scale", () => {
  it("maps value ↔ position both ways, with and without the zero stop", () => {
    for (const zeroStop of [true, false]) {
      for (const v of [0.5, 1, 12.5, 200]) {
        const back = fromLogPosition(toLogPosition(v, 0.5, 200, zeroStop), 0.5, 200, zeroStop);
        expect(back).toBeCloseTo(v, 9);
      }
    }
    expect(toLogPosition(0, 0.5, 200)).toBe(0);
    expect(fromLogPosition(0, 0.5, 200)).toBe(0);
    expect(toLogPosition(0.5, 0.5, 200)).toBeCloseTo(0.02);
    expect(toLogPosition(0.5, 0.5, 200, false)).toBe(0);
    expect(toLogPosition(1000, 0.5, 200)).toBe(1);
  });

  it("runs the native element over 0–1 and reports the VALUE", () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Kp" scale="log" value={10} min={1} max={100} zeroStop={false} onChange={onChange} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "1");
    expect(Number((slider as HTMLInputElement).value)).toBeCloseTo(0.5, 2);
    fireEvent.change(slider, { target: { value: "1" } });
    expect(onChange.mock.calls[0][0]).toBeCloseTo(100);
  });

  it("does not announce its 0–1 position as the value (Lenkbank's shipped defect)", () => {
    const { rerender } = render(<Slider aria-label="Kp" scale="log" value={12.5} min={0.5} max={200} onChange={noop} />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "12.5");
    rerender(
      <Slider aria-label="Kp" scale="log" value={12.5} min={0.5} max={200} onChange={noop} formatValue={(v) => `${v} Nm/rad`} />,
    );
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "12.5 Nm/rad");
  });

  it("does not read a log value out to sixteen digits when unformatted", () => {
    render(<Slider aria-label="Kp" scale="log" value={12.345678912} min={0.5} max={200} onChange={noop} />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuetext", "12.35");
  });

  it("treats the far-left stop as exactly zero", () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Ki" scale="log" value={5} min={0.5} max={200} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("lets a keyboard step OFF zero onto min, rather than rounding back to zero", () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Ki" scale="log" value={0} min={0.5} max={200} onChange={onChange} />);
    // One arrow key from "off": the native element moves by one position step.
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.001" } });
    expect(onChange).toHaveBeenLastCalledWith(0.5);
  });

  it("and one step down from min goes to zero", () => {
    const onChange = vi.fn();
    render(<Slider aria-label="Ki" scale="log" value={0.5} min={0.5} max={200} onChange={onChange} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0.019" } });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("falls back to linear when a logarithm has no answer", () => {
    render(<Slider aria-label="S" scale="log" value={5} min={0} max={10} onChange={noop} />);
    const slider = screen.getByRole("slider");
    expect(slider).toHaveAttribute("max", "10");
    expect(slider).toHaveValue("5");
  });
});

describe("Slider — label line and marks", () => {
  it("is named by its label alone, with the hint and readout beside it and outside it", () => {
    render(
      <Slider
        label="Proportional gain"
        hint={<button type="button" aria-label="What is this?">?</button>}
        readout="12.5"
        value={12.5}
        min={0}
        max={200}
        onChange={noop}
      />,
    );
    // Exactly the label: a hint INSIDE the <label> would leak its own name in.
    expect(screen.getByRole("slider", { name: "Proportional gain" })).toBeInTheDocument();
    expect(screen.getByText("12.5")).toHaveClass("select-none");
  });

  it("does not make an interactive readout unselectable", () => {
    render(
      <Slider aria-label="S" readout={<input aria-label="Typed" />} value={1} min={0} max={10} onChange={noop} />,
    );
    expect(screen.getByLabelText("Typed").parentElement).not.toHaveClass("select-none");
  });

  it("draws a tick per in-range mark, labelled where asked, hidden from assistive tech", () => {
    const { container } = render(
      <Slider
        aria-label="Speed"
        value={30}
        min={0}
        max={100}
        onChange={noop}
        marks={[0, { value: 50, label: "50 km/h" }, 100, 150]}
      />,
    );
    const row = container.querySelector("[aria-hidden=true]")!;
    const ticks = row.querySelectorAll(":scope > span");
    expect(ticks).toHaveLength(3); // 150 is past the end
    expect(row).toHaveTextContent("50 km/h");
    // Logical placement, so a right-to-left track and its ticks agree.
    expect((ticks[1] as HTMLElement).style.insetInlineStart).toBe("50%");
    expect((ticks[2] as HTMLElement).style.insetInlineStart).toBe("100%");
  });

  it("places marks on the log scale too", () => {
    const { container } = render(
      <Slider aria-label="Kp" scale="log" zeroStop={false} value={10} min={1} max={100} onChange={noop} marks={[10]} />,
    );
    const tick = container.querySelector<HTMLElement>("[aria-hidden=true] > span")!;
    expect(parseFloat(tick.style.insetInlineStart)).toBeCloseTo(50, 5);
  });
});

describe("Slider — the element", () => {
  it("has a 24px pointer target, whatever the drawn track is", () => {
    render(<Slider aria-label="S" value={1} min={0} max={10} onChange={noop} />);
    expect(screen.getByRole("slider")).toHaveClass("h-6");
  });

  it("rings the thumb for the keyboard in a token colour", () => {
    render(<Slider aria-label="S" value={1} min={0} max={10} onChange={noop} />);
    const cls = screen.getByRole("slider").className;
    expect(cls).toMatch(/focus-visible:\[&::-webkit-slider-thumb\]:ring-2/);
    expect(cls).toMatch(/focus-visible:\[&::-webkit-slider-thumb\]:ring-\[var\(--brand\)\]/);
    expect(cls).toMatch(/focus-visible:\[&::-moz-range-thumb\]:ring-2/);
  });

  it("forwards the ref and every attribute it does not own", () => {
    const ref = createRef<HTMLInputElement>();
    const onPointerUp = vi.fn();
    render(
      <Slider ref={ref} aria-label="S" data-tour="anchor" name="gain" value={1} min={0} max={10} onChange={noop} onPointerUp={onPointerUp} />,
    );
    const slider = screen.getByRole("slider");
    expect(ref.current).toBe(slider);
    expect(slider).toHaveAttribute("data-tour", "anchor");
    expect(slider).toHaveAttribute("name", "gain");
    fireEvent.pointerUp(slider);
    expect(onPointerUp).toHaveBeenCalled();
  });

  it("is disabled, and fades the label line with it", () => {
    const { container } = render(<Slider label="Gain" disabled value={1} min={0} max={10} onChange={noop} />);
    expect(screen.getByRole("slider", { name: "Gain" })).toBeDisabled();
    expect(container.firstElementChild).toHaveClass("opacity-60");
  });
});
