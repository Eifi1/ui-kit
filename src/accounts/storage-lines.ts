import { useLegalLabels } from "../components/legal";
import { accountStorageEntries } from "./storage-entries";

/** One key the accounts client keeps, with its privacy line in the page's language. */
export interface AccountStorageLine {
  /** The key as the browser holds it (`<prefix>session`). */
  key: string;
  /** Its sentence for `<LegalKitSection section="browser" entries>`, from the kit's legal
   *  labels; the English when the app's own legal tree leaves it out. */
  line: string;
}

/**
 * {@link accountStorageEntries} with each key's sentence already looked up (0.64, Staunlabor):
 * the privacy page lists what the accounts client keeps without reaching into
 * `useLegalLabels().sections.privacy.browser.standardEntries` itself:
 *
 * ```tsx
 * const lines = useAccountStorageLines("staunlabor.").map(({ line }) => line);
 * <LegalKitSection section="browser" entries={[...appLines, ...new Set(lines)]} />
 * ```
 *
 * Pass the same `prefix` as `createAccountsClient`'s `storagePrefix`.
 */
export function useAccountStorageLines(
  prefix: string,
  options: { pageMode?: "per-sign-in" | "per-page" } = {},
): readonly AccountStorageLine[] {
  const standard = useLegalLabels().sections.privacy.browser.standardEntries;
  return accountStorageEntries(prefix, options).map(({ key, entry }) => ({ key, line: standard?.[entry] ?? "" }));
}
