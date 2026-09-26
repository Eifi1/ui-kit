import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "../loading-state";
import { Skeleton } from "../skeleton";
import { UiKitProvider } from "../../i18n/kit-labels";

describe("LoadingState", () => {
  it("is one status region with visible words and a decorative spinner", () => {
    render(<LoadingState label="Loading invoices" />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading invoices");
    // The spinner is not a second live region.
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(status.querySelector(".animate-spin")).toHaveAttribute("aria-hidden", "true");
  });

  it("defaults to common.loading from the provider and takes sizes", () => {
    render(
      <UiKitProvider labels={{ common: { loading: "Wird geladen…" } }}>
        <LoadingState size="sm" inline />
      </UiKitProvider>,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Wird geladen…");
    expect(status).toHaveClass("py-4");
    expect(status).not.toHaveClass("flex-col");
  });
});

describe("Skeleton label", () => {
  it("wraps the placeholder in a status region with sr-only text", () => {
    const { container } = render(<Skeleton lines={3} label="Loading activity" />);
    const status = screen.getByRole("status");
    expect(screen.getByText("Loading activity")).toHaveClass("sr-only");
    expect(status.querySelector('[data-skeleton="lines"]')).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll('[data-skeleton="line"]')).toHaveLength(3);
  });

  it("without a label, is the bare hidden placeholder as before", () => {
    render(<Skeleton />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
