import { documentNavigation } from "../lib/document-navigation";

/** One full-document navigation the kit asked for while stubbed. */
export interface DocumentNavigationCall {
  /** `replace`: a load of `href` in place of this page; `reload`: this page again. */
  kind: "replace" | "reload";
  /** The address a `replace` loads. */
  href?: string;
}

/** What {@link stubDocumentNavigation} answers: the calls so far, and the undo. */
export interface DocumentNavigationStub {
  readonly calls: readonly DocumentNavigationCall[];
  restore(): void;
}

/**
 * Record the kit's full-document navigations instead of making them (0.64, Kurvenschmiede):
 * the accounts client's sign-out and a session that ended load the sign-in page in full, so
 * nothing of the account stays in memory — and jsdom answers that with "Not implemented:
 * navigation". An app test that signs out stubs them for its run:
 *
 * ```ts
 * const navigation = stubDocumentNavigation();
 * await client.signOut();
 * expect(navigation.calls).toEqual([{ kind: "replace", href: "/login" }]);
 * navigation.restore();
 * ```
 *
 * Framework-free like the kit's other stubs: it answers its own undo.
 */
export function stubDocumentNavigation(): DocumentNavigationStub {
  const original = { replace: documentNavigation.replace, reload: documentNavigation.reload };
  const calls: DocumentNavigationCall[] = [];
  documentNavigation.replace = (href: string) => {
    calls.push({ kind: "replace", href });
  };
  documentNavigation.reload = () => {
    calls.push({ kind: "reload" });
  };
  return {
    calls,
    restore() {
      documentNavigation.replace = original.replace;
      documentNavigation.reload = original.reload;
    },
  };
}
