import { FlaskConical } from "lucide-react";
import { OptionSwitcherMenu } from "./option-switcher-menu";

export interface RoleSwitcherProps<R extends string> {
  roles: readonly R[];
  value: R;
  onChange: (role: R) => void;
  ariaLabel?: string;
  heading?: string;
  title?: string;
}

/**
 * A reusable user-role switcher (feedback #337): a thin wrapper over
 * {@link OptionSwitcherMenu} with the standard flask icon, so an app drops it in
 * the top bar with just the role list + current value + a handler. Typically
 * dev-only / UI-only, but the app decides where and whether to render it.
 */
export function RoleSwitcher<R extends string>({
  roles,
  value,
  onChange,
  ariaLabel = "Switch role",
  heading,
  title,
}: RoleSwitcherProps<R>) {
  return (
    <OptionSwitcherMenu<R>
      ariaLabel={ariaLabel}
      title={title ?? `Role: ${value}`}
      heading={heading}
      icon={<FlaskConical className="size-5 text-amber-500" />}
      options={roles.map((r) => ({ value: r, label: r }))}
      value={value}
      onSelect={onChange}
    />
  );
}
