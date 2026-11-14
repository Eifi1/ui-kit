import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEFAULT_LEGAL_LABELS } from "../../components/legal-labels";
import { useAccountStorageLines } from "../storage-lines";

describe("useAccountStorageLines (0.64, Staunlabor)", () => {
  it("answers each key the client keeps with its privacy line, in the page's language", () => {
    const { result } = renderHook(() => useAccountStorageLines("staunlabor."));
    const line = DEFAULT_LEGAL_LABELS.sections.privacy.browser.standardEntries?.session;
    expect(result.current).toEqual([
      { key: "staunlabor.session", line },
      { key: "staunlabor.shared-page", line },
      { key: "staunlabor.pending-session", line },
    ]);
  });
});
