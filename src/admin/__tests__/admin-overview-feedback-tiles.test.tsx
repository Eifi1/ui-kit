import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { DEFAULT_ADMIN_AREA_LABELS } from "../admin-area-labels";
import { AdminOverview, type AdminAttention, type AdminExtraTile } from "../admin-overview";

/** 0.46 (Kurvenschmiede 1): server-kit's two feedback counts have the kit's words. */

const ATTENTION: AdminAttention = {
  feedback_waiting: 2,
  deletion_requests: null,
  invitations_pending: null,
  users_total: null,
  users_new_7d: null,
  extra: { awaiting_verdict: 3, released_for_work: 4, beds: 1 },
};

const tile = (key: string) => document.querySelector(`[data-attention="${key}"]`) as HTMLElement;

describe("AdminOverview — the feedback tiles' default words", () => {
  it("awaiting_verdict and released_for_work need no label; the app's own tile still does", () => {
    render(
      <AdminOverview
        attention={ATTENTION}
        extraTiles={[
          { key: "released_for_work", count: ATTENTION.extra.released_for_work, href: "/feedback" },
          { key: "awaiting_verdict", count: ATTENTION.extra.awaiting_verdict, href: "/feedback" },
          { key: "beds", label: "Beds", count: 1 },
        ]}
      />,
    );
    const t = DEFAULT_ADMIN_AREA_LABELS.tiles;
    expect(tile("awaiting_verdict")).toHaveTextContent("Awaiting a verdict");
    expect(tile("awaiting_verdict")).toHaveTextContent(t.awaitingVerdictHint);
    expect(tile("released_for_work")).toHaveTextContent("Released for work");
    expect(tile("released_for_work")).toHaveTextContent(t.releasedForWorkHint);
    expect(screen.getByText("Beds")).toBeInTheDocument();
  });

  it("an app's label and description still win", () => {
    render(
      <AdminOverview
        attention={ATTENTION}
        extraTiles={[{ key: "awaiting_verdict", label: "Zu bestätigen", description: "Eigen", count: 3 }]}
      />,
    );
    expect(tile("awaiting_verdict")).toHaveTextContent("Zu bestätigen");
    expect(tile("awaiting_verdict")).toHaveTextContent("Eigen");
    expect(tile("awaiting_verdict")).not.toHaveTextContent("Awaiting a verdict");
  });

  it("an app that names the tile gets no kit hint under it (keksdose S5); one that leaves the label out keeps its own line", () => {
    render(
      <AdminOverview
        attention={ATTENTION}
        extraTiles={[
          { key: "awaiting_verdict", label: "Zu bestätigen", count: 3 },
          { key: "released_for_work", description: "The feedback loop's queue", count: 4 },
        ]}
      />,
    );
    const t = DEFAULT_ADMIN_AREA_LABELS.tiles;
    expect(tile("awaiting_verdict")).toHaveTextContent("Zu bestätigen");
    expect(tile("awaiting_verdict")).not.toHaveTextContent(t.awaitingVerdictHint);
    expect(tile("released_for_work")).toHaveTextContent(t.releasedForWork);
    expect(tile("released_for_work")).toHaveTextContent("The feedback loop's queue");
    expect(tile("released_for_work")).not.toHaveTextContent(t.releasedForWorkHint);
  });

  it("a tile of the app's own needs its label (types)", () => {
    // @ts-expect-error — only the kit's feedback keys may leave the label out.
    const own: AdminExtraTile = { key: "beds", count: 1 };
    expect(own.key).toBe("beds");
  });

  it.each([
    UI_KIT_LABELS_DE_CH,
    UI_KIT_LABELS_ES,
    UI_KIT_LABELS_FR,
    UI_KIT_LABELS_HU,
    UI_KIT_LABELS_IT,
    UI_KIT_LABELS_ZH,
  ])("every language has its own words (%#)", (catalogue) => {
    render(
      <UiKitProvider labels={catalogue}>
        <AdminOverview
          attention={ATTENTION}
          extraTiles={[
            { key: "awaiting_verdict", count: 3 },
            { key: "released_for_work", count: 4 },
          ]}
        />
      </UiKitProvider>,
    );
    const t = catalogue.adminArea.tiles;
    for (const [key, label, hint] of [
      ["awaiting_verdict", t.awaitingVerdict, t.awaitingVerdictHint],
      ["released_for_work", t.releasedForWork, t.releasedForWorkHint],
    ] as const) {
      expect(tile(key)).toHaveTextContent(label);
      expect(tile(key)).toHaveTextContent(hint);
      expect(label).not.toBe(
        (DEFAULT_ADMIN_AREA_LABELS.tiles as unknown as Record<string, string>)[
          key === "awaiting_verdict" ? "awaitingVerdict" : "releasedForWork"
        ],
      );
      expect(label + hint).not.toContain("ß");
    }
  });
});
