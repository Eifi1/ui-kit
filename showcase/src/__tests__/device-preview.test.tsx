import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DevicePreview } from "../lib/device-preview";

/** One device at a time, with a switcher and a way back (the showcase preview, 2026-09-28). */
describe("DevicePreview", () => {
  it("shows one device, switches, shows all three, and exits", () => {
    const onExit = vi.fn();
    render(
      <MemoryRouter initialEntries={["/buttons"]}>
        <DevicePreview onExit={onExit} />
      </MemoryRouter>,
    );
    expect(screen.getAllByTitle(/× /)).toHaveLength(1);
    fireEvent.click(screen.getByRole("radio", { name: "Tablet" }));
    expect(screen.getByTitle(/768 × 1024/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "All three" }));
    expect(screen.getAllByTitle(/× /)).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Back to the page" }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});
