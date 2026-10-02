// Internal — not re-exported from the barrel. Shared by the pickers whose trigger is
// a `role="combobox"` button inside a wrapper: DatePicker, DateRangePicker, MonthPicker.

/**
 * The attributes that NAME or DESCRIBE a field, which belong on its trigger — the
 * element a `<label htmlFor>`, a form library's control slot or an error message has
 * to reach. They used to land on the wrapper `<div>` with the rest of the caller's
 * props, so an external label named nothing and a form library's `aria-describedby`
 * pointed a screen reader at an element with no role (kastlan, 0.5.0).
 */
export interface TriggerAria {
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
  /** 0.23.0: a form library's `required` (RhfMonthPicker) is announced on the trigger,
   *  not lost on the wrapper. */
  "aria-required"?: boolean | "true" | "false";
}

/** Split a field's props into what its trigger takes and what its wrapper takes. */
export function splitTriggerAria<T extends TriggerAria>(
  props: T,
): [TriggerAria, Omit<T, keyof TriggerAria>] {
  const {
    id,
    "aria-label": label,
    "aria-labelledby": labelledBy,
    "aria-describedby": describedBy,
    "aria-invalid": invalid,
    "aria-required": required,
    ...rest
  } = props;
  return [
    {
      id,
      "aria-label": label,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      "aria-invalid": invalid,
      "aria-required": required,
    },
    rest,
  ];
}

