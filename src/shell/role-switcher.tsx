import { FlaskConical } from "lucide-react";
import { OptionSwitcherMenu } from "./option-switcher-menu";
import { DEFAULT_TOP_BAR_LABELS, useKitLabels } from "../i18n/kit-labels";

export interface RoleSwitcherProps<R extends string> {
  roles: readonly R[];
  value: R;
  onChange: (role: R) => void;
  /** Default: `topBar.switchRole` from the {@link UiKitProvider}, else English. */
  ariaLabel?: string;
  heading?: string;
  /** The trigger's tooltip. Default: `topBar.role(value)`. */
  title?: string;
}

/**
 * A reusable user-role switcher (feedback #337): a thin wrapper over
 * {@link OptionSwitcherMenu} with the standard flask icon, so an app drops it in
 * the top bar with just the role list + current value + a handler. Typically
 * dev-only / UI-only, but the app decides where and whether to render it.
 *
 * The flask wears `--warning` rather than a fixed `amber-500`: it is a caution
 * marker — the app is not showing you your own role — and the token carries that
 * amber across both themes instead of pinning one hue onto every palette.
 */
export function RoleSwitcher<R extends string>({
  roles,
  value,
  onChange,
  ariaLabel,
  heading,
  title,
}: RoleSwitcherProps<R>) {
  const labels = useKitLabels("topBar", DEFAULT_TOP_BAR_LABELS, { switchRole: ariaLabel });
  return (
    <OptionSwitcherMenu<R>
      ariaLabel={labels.switchRole}
      title={title ?? labels.role(value)}
      heading={heading}
      icon={<FlaskConical className="size-5 text-[var(--warning)]" />}
      options={roles.map((r) => ({ value: r, label: r }))}
      value={value}
      onSelect={onChange}
    />
  );
}
