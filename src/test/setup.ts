import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// React Testing Library does not unmount between tests on its own when `globals`
// is on and the auto-cleanup hook is not installed. Several suites here assert on
// teardown behaviour (the scroll lock, the overlay history stack), so a tree left
// mounted from the previous test would be indistinguishable from the bug.
afterEach(() => {
  cleanup();
});
