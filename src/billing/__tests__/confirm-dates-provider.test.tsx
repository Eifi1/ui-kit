import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { UiKitProvider, type KitDateFormatter } from "../../i18n/kit-labels";
import { CancelSubscriptionConfirm } from "../cancel-subscription";
import { PlanSwitchConfirm } from "../plan-switch";
import type { PlanSwitchPreview } from "../billing-overview";

/**
 * The confirms' days follow the provider (0.52, refactor audit 2026-10-30, DUP-2): its
 * `formatDate` — the app's date preference — asked for the day in a sentence, else the
 * kit's medium date in the provider's locale AND `timeZone`. They went straight to
 * `formatDate`, so keksdose's preference and any app's `timeZone` never reached them.
 */

const PREVIEW: PlanSwitchPreview = {
  currency: "CHF",
  now_minor: 1250,
  next_minor: 9900,
  // 03:00 UTC on the 9th: still the 8th in New York.
  next_billed_at: "2026-11-09T03:00:00Z",
  plan: "business",
  interval: "year",
  over_limit: [],
  limits: {},
  usage: {},
};

function Confirms() {
  return (
    <>
      <CancelSubscriptionConfirm open periodEnd="2026-11-09T03:00:00Z" onConfirm={() => {}} onClose={() => {}} />
      <PlanSwitchConfirm
        open
        from={{ plan: "pro", interval: "month" }}
        to={{ plan: "business", interval: "year" }}
        preview={PREVIEW}
        onConfirm={() => {}}
        onClose={() => {}}
      />
    </>
  );
}

describe("the billing confirms' dates", () => {
  it("are the provider's formatDate, asked for a day without a weekday", () => {
    const formatDate = vi.fn<KitDateFormatter>((iso) => `«${iso}»`);
    render(
      <UiKitProvider locale="en-GB" formatDate={formatDate}>
        <Confirms />
      </UiKitProvider>,
    );
    expect(
      screen.getByText("Your subscription ends on «2026-11-09». Until then everything works as before."),
    ).toBeInTheDocument();
    expect(screen.getByText("Next charge on «2026-11-09»")).toBeInTheDocument();
    expect(formatDate).toHaveBeenCalledWith("2026-11-09", {
      unit: "day",
      source: "dateMark",
      locale: "en-GB",
      weekday: false,
    });
  });

  it("are the kit's medium date in the provider's timeZone without one", () => {
    render(
      <UiKitProvider locale="en-GB" timeZone="America/New_York">
        <Confirms />
      </UiKitProvider>,
    );
    expect(
      screen.getByText("Your subscription ends on 8 Nov 2026. Until then everything works as before."),
    ).toBeInTheDocument();
    expect(screen.getByText("Next charge on 8 Nov 2026")).toBeInTheDocument();
  });
});
