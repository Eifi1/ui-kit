/**
 * {@link LineItems} over react-hook-form's `useFieldArray`. `@eifi1/ui-kit/rhf`.
 *
 * ```tsx
 * <RhfLineItems
 *   name="components"
 *   newItem={() => ({ type: "net_rent", amount: null, validFrom: "" })}
 *   minItems={1}
 *   columns={[
 *     { key: "type", header: "Type", render: ({ name, label }) => (
 *       <RhfSelect name={`${name}.type`} options={TYPES} aria-label={label} />
 *     ) },
 *     { key: "amount", header: "Amount", width: "8rem", align: "end", render: ({ name, label }) => (
 *       <RhfMoneyField name={`${name}.amount`} ariaLabel={label} />
 *     ) },
 *   ]}
 *   totals={{ amount: formatMoney(total) }}
 * />
 * ```
 *
 * The rows are the array's `fields` (keyed by their `id`, as react-hook-form asks),
 * Add appends `newItem()`, remove is `remove(index)`, and an error on the array
 * itself — the `rules` here, or a resolver's `lines: "At least two lines"` — is the
 * list's `error`. Each cell's `render` gets `name`, the row's path
 * (`"components.2"`), to bind its field to.
 *
 * `summary`, `fieldLabels`, `narrowColumns`, `removePlacement` and `removeAlign` pass
 * through to {@link LineItems}. With
 * `fieldLabels="floating"` a cell's `fieldLabel` is the column's name; the bound
 * fields' own `label` is a `FormLabel` ABOVE the control, so for the floating
 * one render the kit field through `RhfField`:
 * `render={({ field, invalid }) => <Input label={fieldLabel} aria-label={label} {...field} invalid={invalid} />}`.
 */
import type { ReactNode } from "react";
import {
  useFieldArray,
  useFormState,
  type FieldArray,
  type FieldArrayPath,
  type FieldArrayWithId,
  type FieldValues,
  type UseFieldArrayProps,
} from "react-hook-form";
import {
  LineItems,
  type LineItemCellContext,
  type LineItemsColumn,
  type LineItemsProps,
} from "../components/line-items";

/** A cell's context, with the row's path in the form. */
export interface RhfLineItemCellContext<TItem, TArrayName extends string>
  extends LineItemCellContext<TItem> {
  /** The row's path: `${name}.${index}` — bind the cell's field to
   *  `` `${name}.amount` ``. */
  name: `${TArrayName}.${number}`;
}

export interface RhfLineItemsColumn<TItem, TArrayName extends string>
  extends Omit<LineItemsColumn<TItem>, "render"> {
  render: (ctx: RhfLineItemCellContext<TItem, TArrayName>) => ReactNode;
}

export interface RhfLineItemsProps<
  TFieldValues extends FieldValues = FieldValues,
  TArrayName extends FieldArrayPath<TFieldValues> = FieldArrayPath<TFieldValues>,
  TTransformed = TFieldValues,
> extends Omit<
    LineItemsProps<FieldArrayWithId<TFieldValues, TArrayName, "id">>,
    "items" | "columns" | "onAdd" | "onRemove" | "getKey"
  > {
  name: TArrayName;
  /** `form.control`. Optional under `<Form {...form}>`. */
  control?: UseFieldArrayProps<TFieldValues, TArrayName, "id", TTransformed>["control"];
  /** `useFieldArray`'s `rules` (`minLength`, `validate` …); its message is the list's
   *  error. */
  rules?: UseFieldArrayProps<TFieldValues, TArrayName, "id", TTransformed>["rules"];
  columns: readonly RhfLineItemsColumn<FieldArrayWithId<TFieldValues, TArrayName, "id">, TArrayName>[];
  /** A new row's values. Omitted: no add button. */
  newItem?: () => FieldArray<TFieldValues, TArrayName>;
  /** `false`: no remove buttons. Default `true`. */
  removable?: boolean;
}

/** The message of an error at `path` in react-hook-form's errors tree: the array's
 *  own (`root`, from `rules`) or one a resolver put on the array. */
function arrayError(errors: unknown, path: string): string | undefined {
  let node: unknown = errors;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  if (node === null || typeof node !== "object") return undefined;
  const { root, message } = node as { root?: { message?: unknown }; message?: unknown };
  const text = root?.message ?? message;
  return typeof text === "string" && text !== "" ? text : undefined;
}

/** {@link LineItems} bound to a field array. See the module note. */
export function RhfLineItems<
  TFieldValues extends FieldValues = FieldValues,
  TArrayName extends FieldArrayPath<TFieldValues> = FieldArrayPath<TFieldValues>,
  TTransformed = TFieldValues,
>({
  name,
  control,
  rules,
  columns,
  newItem,
  removable = true,
  error,
  ...rest
}: RhfLineItemsProps<TFieldValues, TArrayName, TTransformed>) {
  const { fields, append, remove } = useFieldArray<TFieldValues, TArrayName, "id", TTransformed>({
    control,
    name,
    rules,
  });
  const { errors } = useFormState({ control, name: name as never });
  const bound: LineItemsColumn<FieldArrayWithId<TFieldValues, TArrayName, "id">>[] = columns.map(
    ({ render, ...column }) => ({
      ...column,
      render: (ctx) => render({ ...ctx, name: `${name}.${ctx.index}` as `${TArrayName}.${number}` }),
    }),
  );
  return (
    <LineItems
      {...rest}
      items={fields}
      columns={bound}
      getKey={(field) => field.id}
      onAdd={newItem ? () => append(newItem()) : undefined}
      onRemove={removable ? (index) => remove(index) : undefined}
      error={error ?? arrayError(errors, name)}
    />
  );
}
