import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_LEGAL_LABELS } from "../../components/legal-labels";
import { useAccountStorageLines } from "../storage-lines";

describe("useAccountStorageLines (0.64, Staunlabor)", () => {
  it("answers each key the client keeps with its privacy line, in the page's language", () => {
    const line = DEFAULT_LEGAL_LABELS.sections.privacy.browser.standardEntries?.session;
    const { result } = renderHook(() => useAccountStorageLines("staunlabor."));
    expect(result.current).toEqual([{ key: "staunlabor.session", line }]);
    const perPage = renderHook(() => useAccountStorageLines("staunlabor.", { pageMode: "per-page" }));
    expect(perPage.result.current.map((entry) => entry.key)).toEqual([
      "staunlabor.session",
      "staunlabor.shared-page",
      "staunlabor.pending-session",
    ]);
  });
});
