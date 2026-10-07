import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiKitProvider } from "../../i18n/kit-labels";
import { AccountStateChip, ACCOUNT_STATE_TONES } from "../account-chips";

/**
 * 0.30.0 (docs/user-admin-harmonization.md §3.2, §6.4): `deletion` — the day it is erased
 * in `after_days` mode, "requested" in kastlan's `operator` mode.
 */

describe("AccountStateChip deletion", () => {
  it("says the day, in the reader's locale, or that it was requested", () => {
    const { rerender } = render(
      <AccountStateChip state="deletion" date="2026-10-31T00:00:00Z" locale="en-GB" data-testid="chip" />,
    );
    const chip = screen.getByTestId("chip");
    expect(chip).toHaveTextContent("Deletion on 31 Oct 2026");
    expect(chip).toHaveAttribute("data-state", "deletion");
    expect(chip).toHaveAttribute("data-date", "2026-10-31");
    rerender(<AccountStateChip state="deletion" date={null} data-testid="chip" />);
    expect(chip).toHaveTextContent("Deletion requested");
    expect(chip).not.toHaveAttribute("data-date");
    expect(ACCOUNT_STATE_TONES.deletion).toBe("danger");
  });

  it("takes the provider's date format and words, and ignores a date on another state", () => {
    render(
      <UiKitProvider
        formatDate={(iso) => `[${iso}]`}
        labels={{ accountState: { deletionOn: (date: string) => `Löschung am ${date}` } }}
      >
        <AccountStateChip state="deletion" date="2026-11-06T12:00:00Z" data-testid="a" />
        <AccountStateChip state="inactive" date="2026-11-06T12:00:00Z" data-testid="b" />
      </UiKitProvider>,
    );
    expect(screen.getByTestId("a")).toHaveTextContent("Löschung am [2026-11-06]");
    expect(screen.getByTestId("b")).toHaveTextContent("Inactive");
  });
});
