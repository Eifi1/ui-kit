import { describe, expect, it } from "vitest";

import { DEFAULT_UI_KIT_LABELS } from "../../i18n/defaults";
import { UI_KIT_LABELS_DE_CH } from "../../i18n/locales/de-CH";
import { uiKitLabelsEn } from "../../i18n/locales/en";
import { UI_KIT_LABELS_ES } from "../../i18n/locales/es";
import { UI_KIT_LABELS_FR } from "../../i18n/locales/fr";
import { UI_KIT_LABELS_HU } from "../../i18n/locales/hu";
import { UI_KIT_LABELS_IT } from "../../i18n/locales/it";
import { UI_KIT_LABELS_ZH } from "../../i18n/locales/zh";
import { ACCOUNT_TEAM_ERROR_CODES } from "../account-teams-api";

/** The `accountTeams` namespace (0.64): a team's refusals in the kit's seven languages. */
const CATALOGUES = {
  en: uiKitLabelsEn(),
  "de-CH": UI_KIT_LABELS_DE_CH,
  es: UI_KIT_LABELS_ES,
  fr: UI_KIT_LABELS_FR,
  hu: UI_KIT_LABELS_HU,
  it: UI_KIT_LABELS_IT,
  zh: UI_KIT_LABELS_ZH,
};

describe.each(Object.entries(CATALOGUES))("accountTeams in %s", (_code, labels) => {
  it("words every coded refusal of a team, and nothing else", () => {
    expect(Object.keys(labels.accountTeams.codes).sort()).toEqual([...ACCOUNT_TEAM_ERROR_CODES].sort());
  });

  it("says the name or the address the refusal carries", () => {
    const { codes } = labels.accountTeams;
    expect(codes.team_name_taken("Rig crew")).toContain("Rig crew");
    expect(codes.team_changed("Rig crew")).toContain("Rig crew");
    expect(codes.manager_kept_by_admin("cy@example.com")).toContain("cy@example.com");
  });

  it("counts what goes with a team, the singular apart", () => {
    const { countMembers, countInvitations } = labels.accountTeams;
    expect(countMembers(1)).toMatch(/1/);
    expect(countMembers(3)).toMatch(/3/);
    expect(countInvitations(2)).toMatch(/2/);
  });
});

describe("accountTeams in English", () => {
  it("is the defaults' words, the counts formatted by the factory", () => {
    expect(DEFAULT_UI_KIT_LABELS.accountTeams.countMembers(12345)).toBe("12345 members");
    expect(uiKitLabelsEn().accountTeams.countMembers(12345)).toBe("12,345 members");
    expect(uiKitLabelsEn().accountTeams.title).toBe(DEFAULT_UI_KIT_LABELS.accountTeams.title);
  });
});
