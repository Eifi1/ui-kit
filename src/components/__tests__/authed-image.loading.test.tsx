import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthedImage } from "../authed-image";

/** keksdose P8: render nothing on failure, and keep a click off a clickable row. */
describe("AuthedImage 0.16", () => {
  it("errorFallback={null} renders nothing where the image failed", () => {
    const { container } = render(<AuthedImage src="/x.png" alt="Receipt" errorFallback={null} />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector('[data-image-state="error"]')).toBeEmptyDOMElement();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("errorFallback left out still draws the default tile", () => {
    const { container } = render(<AuthedImage src="/x.png" alt="Receipt" />);
    fireEvent.error(container.querySelector("img")!);
    expect(screen.getByRole("img", { name: /Receipt/ })).toBeInTheDocument();
  });

  it("stopPropagation keeps the click from the ancestor's handler", () => {
    const onRow = vi.fn();
    const { container, rerender } = render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a stand-in row
      <div onClick={onRow}>
        <AuthedImage src="/x.png" alt="Receipt" />
      </div>,
    );
    fireEvent.click(container.querySelector("img")!);
    expect(onRow).toHaveBeenCalledTimes(1);
    rerender(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- a stand-in row
      <div onClick={onRow}>
        <AuthedImage src="/x.png" alt="Receipt" stopPropagation />
      </div>,
    );
    fireEvent.click(container.querySelector("img")!);
    expect(onRow).toHaveBeenCalledTimes(1);
  });
});
