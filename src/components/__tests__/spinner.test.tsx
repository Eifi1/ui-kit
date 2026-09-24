import { render, screen } from "@testing-library/react";
import { Spinner } from "../ui";

/**
 * The two ways 0.5.0's Spinner misfired in the consuming apps — both found by their own
 * accessibility tests, both about the words it adds.
 */
describe("Spinner", () => {
  it("standing alone, is a status that says it is loading", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("label={null} is decorative: no role, no words, hidden", () => {
    // lenkbank: `<Spinner /> Loading…` announced "Loading… Loading…".
    const { container } = render(
      <p>
        <Spinner label={null} /> Loading…
      </p>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    const ring = container.querySelector(".animate-spin")!;
    expect(ring).toHaveAttribute("aria-hidden", "true");
    expect(ring).toBeEmptyDOMElement();
  });

  it("inside a labelled button with label={null}, the name is the button's alone", () => {
    // keksdose: the name came out "Loadingconfirm".
    render(
      <button type="button">
        <Spinner label={null} />
        Confirm
      </button>,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });

  it("even without label={null}, its word no longer runs into the button's", () => {
    render(
      <button type="button">
        <Spinner />
        Confirm
      </button>,
    );
    expect(screen.getByRole("button").textContent).toBe("Loading… Confirm");
  });
});
