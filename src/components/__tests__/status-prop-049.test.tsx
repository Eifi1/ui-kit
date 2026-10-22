import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Chip } from "../chip";
import { StatusDot } from "../status-dot";

// 0.49 KIT-8: `status="good"` etc. on Chip and StatusDot, as an alternative to `tone`.
describe("Chip and StatusDot status", () => {
  it("Chip draws a status kind in its tone", () => {
    const { container } = render(
      <>
        <Chip status="good">Paid</Chip>
        <Chip status="attention">Unpaid</Chip>
        <Chip status="problem">Overdue</Chip>
        <Chip status="active">Sent</Chip>
        <Chip status="inactive">Draft</Chip>
      </>,
    );
    const tones = Array.from(container.querySelectorAll("[data-tone]")).map((c) => c.getAttribute("data-tone"));
    expect(tones).toEqual(["success", "warning", "danger", "info", "neutral"]);
    expect(screen.getByText("Overdue").closest("[data-tone]")!.className).toBe(
      render(<Chip tone="danger">Overdue</Chip>).container.querySelector("[data-tone]")!.className,
    );
  });

  it("an explicit tone wins over status", () => {
    const { container } = render(<Chip status="good" tone="info">Sent</Chip>);
    expect(container.querySelector("[data-tone]")).toHaveAttribute("data-tone", "info");
  });

  it("StatusDot takes a status kind", () => {
    const { container } = render(
      <>
        <StatusDot status="good" label="Online" />
        <StatusDot status="inactive" aria-label="Paused" />
        <StatusDot status="active" tone="danger" aria-label="Both" />
      </>,
    );
    const tones = Array.from(container.querySelectorAll("[data-tone]")).map((d) => d.getAttribute("data-tone"));
    expect(tones).toEqual(["success", "neutral", "danger"]);
  });
});
