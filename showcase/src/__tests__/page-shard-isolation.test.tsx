import { render } from "@testing-library/react";
import { PAGES } from "../routes";
import { checkPage } from "./page-shard";
import { MOUNT_TIMEOUT_MS, useShowcaseEnvironment } from "./showcase-harness";

/**
 * The shard-4 flake, made deterministic (round 0.46 A1): a page left mounted because the
 * `afterEach` that unmounts it was skipped (an earlier hook timed out under load) must not
 * reach the next page's check — "#every-fill-and-its-foreground is on /links but not
 * indexed". The leftover here is /colour-roles' own heading, as the flake showed it.
 */
const LINKS = PAGES.find((page) => page.slug === "links")!;

useShowcaseEnvironment({ pages: [LINKS.slug] });

describe("the per-page check (page-shard.tsx)", () => {
  it(
    "checks its page alone, whatever an earlier test left mounted, and leaves nothing behind",
    async () => {
      // What a skipped cleanup leaves: the previous page, still in document.body.
      render(
        <main>
          <h3 id="every-fill-and-its-foreground">Every fill and its foreground</h3>
        </main>,
      );
      await checkPage(LINKS.slug, LINKS.title);
      expect(document.querySelectorAll("main")).toHaveLength(0);
      expect(document.getElementById("every-fill-and-its-foreground")).toBeNull();
    },
    MOUNT_TIMEOUT_MS,
  );
});
