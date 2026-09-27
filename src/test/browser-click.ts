import { fireEvent } from "@testing-library/react";

/**
 * Clicks `el` and answers whether the component LEFT the click to the browser — i.e.
 * nothing along the way called `preventDefault()` — which is what a test of a
 * modified click (⌘/Ctrl-click to open a new tab) asserts.
 *
 * `fireEvent.click(...)`'s own return value says the same, but only after jsdom has
 * run the default action: a link then "navigates", jsdom cannot, and it prints
 * "Not implemented: navigation to another Document" into the test output. Here a
 * listener on `window` — the last stop of the bubble, after React's root listener —
 * reads the verdict and only then cancels the navigation.
 */
export function clickLeftToBrowser(el: Element, init?: MouseEventInit): boolean {
  let leftToBrowser = false;
  const settle = (event: Event) => {
    leftToBrowser = !event.defaultPrevented;
    event.preventDefault();
  };
  window.addEventListener("click", settle);
  try {
    fireEvent.click(el, init);
  } finally {
    window.removeEventListener("click", settle);
  }
  return leftToBrowser;
}
