import { describe, expect, it } from "vitest";

import { documentNavigation } from "../../lib/document-navigation";
import { stubDocumentNavigation } from "../navigation";

describe("stubDocumentNavigation (0.64, Kurvenschmiede)", () => {
  it("records the kit's full-document navigations instead of making them, and undoes itself", () => {
    const before = { replace: documentNavigation.replace, reload: documentNavigation.reload };
    const navigation = stubDocumentNavigation();
    documentNavigation.replace("/login?next=%2Fsettings");
    documentNavigation.reload();
    expect(navigation.calls).toEqual([{ kind: "replace", href: "/login?next=%2Fsettings" }, { kind: "reload" }]);
    navigation.restore();
    expect(documentNavigation.replace).toBe(before.replace);
    expect(documentNavigation.reload).toBe(before.reload);
  });
});
