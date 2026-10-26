import { DevMenu, type DevMenuProps } from "./dev-menu";

// 0.42's local-dev switchers (docs/top-bar-harmonization.md §2.7, §6.2, §6.3), since 0.51
// a `DevMenu` with no app sections (§2.7.1). The props are the same and so is every row,
// "Back to {role}" and its `sessionStorage` included — but it draws ONE flask where it
// drew two: the role and the plan are groups of one menu, as in DevMenu.

// Where it has always been imported from, until the wrapper goes in 0.52; the key and the
// "Back to" logic it serves are DevMenu's now.
export { DEV_ORIGINAL_ROLE_KEY } from "./dev-menu";

/** @deprecated 0.51 — use {@link DevMenuProps} (the same props); removed in 0.52. */
export type DevSwitchersProps<R extends string, P extends string> = Omit<DevMenuProps<R, P>, "sections" | "active">;

/** @deprecated 0.51 — use {@link DevMenu} (one flask; same props); removed in 0.52. */
export function DevSwitchers<R extends string, P extends string>(props: DevSwitchersProps<R, P>) {
  return <DevMenu {...props} />;
}
