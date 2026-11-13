import { describe, expect, it } from "vitest";

import { DEFAULT_LEGAL_LABELS } from "../../components/legal";
import { uiKitLabelsDeCh } from "../../i18n/locales/de-CH";
import { accountStorageEntries } from "../storage-entries";

/**
 * What `@eifi1/ui-kit/accounts` keeps in the browser, as the app's privacy page and its own
 * list of keys read it (docs/auth-harmonization.md §12.9: "the client lists them for the
 * privacy page"). Kurvenschmiede's privacy page went two days without a line for two keys
 * nobody had listed (its third plan's F102): an entry here is the line, worded once.
 */
describe("accountStorageEntries", () => {
  it("names the session's key with the app's prefix in front, verbatim", () => {
    expect(accountStorageEntries("staunlabor.")).toEqual([{ key: "staunlabor.session", entry: "session" }]);
    expect(accountStorageEntries("kurvenschmiede-").map((e) => e.key)).toEqual(["kurvenschmiede-session"]);
  });

  it("points every key at a standard entry the kit words in its catalogues", () => {
    const english = DEFAULT_LEGAL_LABELS.sections.privacy.browser.standardEntries!;
    const swiss = uiKitLabelsDeCh().legal.sections.privacy.browser.standardEntries!;
    for (const { entry } of accountStorageEntries("app.")) {
      expect(english[entry]).toEqual(expect.any(String));
      expect(swiss[entry]).toEqual(expect.any(String));
    }
  });

  it("answers the same keys on every call, so an app's list can be built from it at module scope", () => {
    expect(accountStorageEntries("app.")).toEqual(accountStorageEntries("app."));
  });
});
