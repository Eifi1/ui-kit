// `@eifi1/ui-kit/testing` — helpers an app runs from its OWN test suite (0.33).
//
// Not part of the main barrel: nothing here renders, and an app's production bundle has
// no business carrying it. Browser-safe like the rest of the kit (no `node:fs`): each
// helper takes texts, so an app collects them with `import.meta.glob` or `node:fs`, as
// its setup allows. The first content is the guard against undeclared CSS custom
// properties (docs/colour-roles-harmonization.md §8).
export {
  KIT_CSS_VARIABLES,
  declaredCustomProperties,
  undeclaredCssVariables,
  type UndeclaredCssVariablesOptions,
} from "./css-variables";
// 0.34 (refactor audit 2026-10, TST-10): the environment jsdom lacks — a `matchMedia`
// that answers from a viewport width (right at every text size) and a `ResizeObserver`
// the test drives. Framework-free: each returns its own undo. 0.35: `setViewportWidth`,
// a live resize of the stub in force — its lists flip and fire `change` (keksdose).
export {
  setViewportWidth,
  stubResizeObserver,
  stubViewportWidth,
  viewportMatchMedia,
  type ResizeObserverStub,
  type StubbedBoxSize,
  type ViewportOptions,
} from "./viewport";
// 0.50.1 (keksdose N4): a valid `TourStepContext` for a test that calls a step's
// `beforeStep` or `when` itself — `beforeStep!(tourStepContext())`.
export {
  tourStepContext,
  type TestTourStepContext,
  type TourStepContextOptions,
  type TourStepVia,
} from "./tour";
