import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useBodyScrollLock } from "../use-body-scroll-lock";

/**
 * 0.25 (found with keksdose's run-72 guard): `overflow` on <body> reaches the viewport
 * only while <html>'s own overflow is visible. An app that clips <html>
 * (`html, body { overflow-x: clip }`) kept a scrollable page behind every "locked"
 * dialog — so the lock takes <html> too then, and gives it back as it was.
 */
function Locker() {
  useBodyScrollLock(true);
  return null;
}

afterEach(() => {
  document.documentElement.style.overflowX = "";
  document.documentElement.style.overflowY = "";
});

describe("useBodyScrollLock and a clipped <html>", () => {
  it("leaves <html> alone while its overflow is visible", () => {
    const { unmount } = render(<Locker />);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("locks <html> too when the app clips it, and restores it on release", () => {
    document.documentElement.style.overflowX = "clip";
    const { unmount } = render(<Locker />);
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflowX).toBe("hidden");
    expect(document.documentElement.style.overflowY).toBe("hidden");
    unmount();
    expect(document.documentElement.style.overflowX).toBe("clip");
    expect(document.documentElement.style.overflowY).toBe("");
  });
});
