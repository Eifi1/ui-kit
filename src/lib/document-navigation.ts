/**
 * The full-document navigations the kit makes, behind one object the tests can spy on.
 *
 * jsdom implements neither `location.reload` nor `location.replace`, and its
 * `window.location` is unforgeable: a test cannot stub it by redefining the property
 * once the suite runs each file in its own VM context (`pool: "vmThreads"`, which took
 * the suite from ~3 minutes to ~1). `vi.spyOn(documentNavigation, "reload")` works in
 * every pool. Internal, not part of the package's surface.
 */
export const documentNavigation = {
  reload(): void {
    window.location.reload();
  },
  replace(href: string): void {
    window.location.replace(href);
  },
};
