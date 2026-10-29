import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { BarChart3 } from "lucide-react";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { UiKitProvider } from "../../i18n/kit-labels";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { visibleSettingsGroups } from "../../settings/settings-catalogue";
import { adminSectionOrder, adminSections } from "../admin-sections";
import type { AdminSharedSection } from "../admin-area-labels";
import { DEFAULT_ADMIN_AREA_LABELS } from "../admin-area-labels";
import { AdminOverview, type AdminAttention } from "../admin-overview";

/** 0.43: the fixes from the 0.42 adoptions (keksdose 3, 4, 6; kastlan 1; Kurvenschmiede). */

const ATTENTION: AdminAttention = {
  feedback_waiting: 2,
  deletion_requests: null,
  invitations_pending: 1,
  users_total: 9,
  users_new_7d: 0,
  extra: { beds: 12 },
};

const OTHERS = [
  UI_KIT_LABELS_DE_CH,
  UI_KIT_LABELS_ES,
  UI_KIT_LABELS_FR,
  UI_KIT_LABELS_HU,
  UI_KIT_LABELS_IT,
  UI_KIT_LABELS_ZH,
];

describe("adminSections and adminSectionOrder (keksdose 3)", () => {
  it("narrows the result's ids by leaveOut", () => {
    const groups = adminSections(undefined, [], { leaveOut: ["billing"] });
    expectTypeOf(groups[0].id).toEqualTypeOf<Exclude<AdminSharedSection, "billing">>();
    const all = adminSections(undefined);
    expectTypeOf(all[0].id).toEqualTypeOf<AdminSharedSection>();
    // A leaveOut typed as the whole union narrows nothing.
    const some: AdminSharedSection[] = ["billing"];
    expectTypeOf(adminSections(undefined, [], { leaveOut: some })[0].id).toEqualTypeOf<AdminSharedSection>();
    expect(groups.map((g) => g.id)).toEqual(["overview", "users", "invitations", "activity"]);
    // Written-out type arguments keep compiling as in 0.42, and narrow when told.
    const beds = [{ id: "beds" as const, icon: null, title: "Beds", help: "" }];
    expectTypeOf(adminSections<"beds">(undefined, beds, { leaveOut: ["billing"] })[0].id).toEqualTypeOf<
      AdminSharedSection | "beds"
    >();
    expectTypeOf(adminSections<"beds", "billing">(undefined, beds, { leaveOut: ["billing"] })[0].id).toEqualTypeOf<
      Exclude<AdminSharedSection, "billing"> | "beds"
    >();
  });

  it("gives the order as ids, with no labels, the same as the groups'", () => {
    const own = [
      { id: "metrics" as const, after: "overview" as const },
      { id: "messaging" as const },
      { id: "health" as const, after: "billing" as const },
    ];
    const ids = adminSectionOrder(own, { leaveOut: ["billing"] });
    expectTypeOf(ids).toEqualTypeOf<(Exclude<AdminSharedSection, "billing"> | "metrics" | "messaging" | "health")[]>();
    expect(ids).toEqual(["overview", "metrics", "users", "invitations", "messaging", "health", "activity"]);
    const groups = adminSections(
      undefined,
      own.map((s) => ({ ...s, icon: <BarChart3 />, title: s.id, help: "" })),
      { leaveOut: ["billing"] },
    );
    expect(groups.map((g) => g.id)).toEqual(ids);
    expect(adminSectionOrder()).toEqual(["overview", "users", "invitations", "billing", "activity"]);
  });

  it("throws as adminSections does", () => {
    expect(() => adminSectionOrder([{ id: "users" as never }])).toThrow(/shared section/);
    expect(() => adminSectionOrder([{ id: "a", after: "b" }])).toThrow(/no section/);
  });
});

describe("the Overview needs no entry (kastlan 1)", () => {
  it("stays visible with entries that name only other sections", () => {
    const groups = adminSections(undefined);
    expect(groups[0]).toMatchObject({ id: "overview", standalone: true });
    expect(groups.filter((g) => g.id !== "overview").every((g) => g.standalone === undefined)).toBe(true);
    const shown = visibleSettingsGroups(groups, [{ id: "u", group: "users", anchor: "users-card", title: "Users" }]);
    expect(shown.map((g) => g.id)).toEqual(["overview", "users"]);
    // visible: false still hides it.
    const hidden = adminSections(undefined, [], { visible: { overview: false } });
    expect(visibleSettingsGroups(hidden, []).map((g) => g.id)).toEqual([]);
  });
});

describe("AdminOverview: the error state (keksdose 4) and quiet tiles (Kurvenschmiede)", () => {
  it("shows the error with Try again alongside the last good tiles: a failed poll keeps them (keksdose N7)", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(<AdminOverview attention={ATTENTION} error={new Error("500")} onRetry={retry} />);
    const box = document.querySelector('[data-slot="admin-overview"]') as HTMLElement;
    expect(box).toHaveAttribute("data-state", "error");
    expect(box).toHaveTextContent(DEFAULT_ADMIN_AREA_LABELS.overviewError);
    expect(box.querySelector("[data-attention]")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("has no button without onRetry, and speaks the provider's language", () => {
    render(
      <UiKitProvider labels={UI_KIT_LABELS_DE_CH}>
        <AdminOverview attention={undefined} error />
      </UiKitProvider>,
    );
    expect(screen.getByText("Die Übersicht konnte nicht geladen werden.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("draws an extra tile without href as a quiet count, no link", () => {
    render(
      <MemoryRouter>
        <AdminOverview
          attention={ATTENTION}
          extraTiles={[
            { key: "beds", label: "Beds", count: 12 },
            { key: "seeds", label: "Seeds", count: 3, href: "/admin/seeds" },
          ]}
        />
      </MemoryRouter>,
    );
    const quiet = document.querySelector('[data-attention="beds"]') as HTMLElement;
    expect(quiet).toHaveTextContent("12");
    expect(quiet.querySelector("a, button")).toBeNull();
    expect(screen.getByRole("link", { name: /Seeds/ })).toHaveAttribute("href", "/admin/seeds");
  });
});

describe("the words (keksdose 6)", () => {
  it("says what invitations are for, in every language", () => {
    expect(DEFAULT_ADMIN_AREA_LABELS.sections.invitations.help).toBe(
      "Invite people by e-mail in their language; resend or revoke what’s still open.",
    );
    for (const c of OTHERS) {
      expect(c.adminArea.sections.invitations.help).not.toBe(DEFAULT_ADMIN_AREA_LABELS.sections.invitations.help);
      expect(c.adminArea.overviewError).not.toBe(DEFAULT_ADMIN_AREA_LABELS.overviewError);
      expect(c.adminArea.retry).not.toBe(DEFAULT_ADMIN_AREA_LABELS.retry);
    }
    expect(UI_KIT_LABELS_DE_CH.adminArea.sections.invitations.help).toMatch(/Sie/);
  });
});
