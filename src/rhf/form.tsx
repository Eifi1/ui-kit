/**
 * The react-hook-form adapter: the five parts every form is built from, and the hook
 * they share. `@eifi1/ui-kit/rhf`.
 *
 * ```tsx
 * <Form {...form}>
 *   <FormField control={form.control} name="amount" render={({ field }) => (
 *     <FormItem>
 *       <FormLabel required>Amount</FormLabel>
 *       <FormControl>
 *         <NumberField value={field.value} onCommit={field.onChange} />
 *       </FormControl>
 *       <FormMessage />
 *     </FormItem>
 *   )} />
 * </Form>
 * ```
 *
 * The shape is shadcn's `form.tsx`, on purpose: Kastlan builds every form from that
 * file, so moving onto this one is an import line rather than a rewrite. What differs
 * is what the shadcn file gets wrong:
 *
 *  - **`aria-describedby` names only what is on screen.** shadcn always points the
 *    control at a description id, rendered or not, and at the message id whenever the
 *    field has an error, whether a message was rendered for it or not. A reference to
 *    a node that does not exist describes the field as nothing. Here the description
 *    and the message say when they are mounted, and the control points at exactly
 *    those.
 *  - **Merged, never replaced.** A control that already carries its own
 *    `aria-describedby` keeps it, first — the same rule as the kit's `error` prop
 *    (see `useFieldError` in components/ui.tsx).
 *  - **No Radix.** `FormControl` is a one-child `cloneElement`, not `Slot`, and the
 *    label is the kit's own `Label` — the kit carries no Radix dependency and this
 *    entry is not the place to start.
 *
 * ## Why this is its own entry
 *
 * The main barrel once shipped a react-hook-form hook (`use-rhf-wizard-step`) and
 * removed it: it made react-hook-form an install every consumer's typecheck paid for,
 * for a hook nobody called (see the wizard section of src/index.ts). This is the
 * answer to that, not a reversal of it. Nothing outside `src/rhf*` imports
 * react-hook-form — `__tests__/packaging-contract.test.ts` holds that — and the peer is
 * optional, so an app that does not use it installs nothing and imports nothing.
 *
 * ## Painting the field
 *
 * `FormControl` sets `aria-invalid` on its child. `NumberField` and the pickers paint
 * from that attribute; `Input`, `Select` and `Textarea` paint only from their
 * `invalid` prop (see its note in components/ui.tsx: a bare attribute announces but
 * does not paint), so pass it from the render prop —
 * `<Input {...field} invalid={fieldState.invalid} />`. `FormControl` does not inject
 * `invalid` itself because its child may be a native element, which would print it
 * into the DOM as an unknown attribute.
 */
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
} from "react";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Label, type LabelProps } from "../components/ui";
import { cn } from "../lib/cn";

/** The form's `useForm()` return, spread in: `<Form {...form}>`. react-hook-form's own
 *  `FormProvider`, under the name the shadcn file gave it. */
export const Form = FormProvider;

// ── contexts ─────────────────────────────────────────────────────────────────

const FormFieldContext = createContext<{ name: string } | null>(null);

/** The two optional nodes a control can be described by. */
type Described = "description" | "message";

interface FormItemContextValue {
  id: string;
  mounted: Record<Described, boolean>;
  mark: (slot: Described, on: boolean) => void;
}

const FormItemContext = createContext<FormItemContextValue | null>(null);

// ── FormField ────────────────────────────────────────────────────────────────

/**
 * react-hook-form's `Controller`, with the field's name put in context for the parts
 * below it. Takes exactly `Controller`'s props.
 */
export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>(props: ControllerProps<TFieldValues, TName, TTransformedValues>) {
  const value = useMemo(() => ({ name: props.name as string }), [props.name]);
  return (
    <FormFieldContext.Provider value={value}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

// ── useFormField ─────────────────────────────────────────────────────────────

/**
 * The ids and the state of the field around the caller: for a part of your own that
 * sits beside the kit's (a character counter that belongs in `aria-describedby`, a
 * label with a different look).
 *
 * Throws outside a `FormField` + `FormItem` pair. shadcn's version answered there with
 * ids like `undefined-form-item`, which label nothing and fail nowhere.
 */
export function useFormField() {
  const field = useContext(FormFieldContext);
  const item = useContext(FormItemContext);
  if (!field) throw new Error("useFormField must be used inside <FormField>.");
  if (!item) throw new Error("useFormField must be used inside <FormItem>.");
  const { getFieldState } = useFormContext();
  // Subscribes this part to the field's state, so a label or message re-renders when
  // the field's error changes without the whole form doing so.
  const formState = useFormState({ name: field.name });
  const state = getFieldState(field.name, formState);
  const formDescriptionId = `${item.id}-description`;
  const formMessageId = `${item.id}-message`;
  const describedBy = [
    item.mounted.description && formDescriptionId,
    item.mounted.message && formMessageId,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    id: item.id,
    name: field.name,
    formItemId: `${item.id}-control`,
    formDescriptionId,
    formMessageId,
    /** The ids of the description and message that are actually rendered, or
     *  `undefined` when neither is. */
    describedBy: describedBy || undefined,
    ...state,
  };
}

// ── FormItem ─────────────────────────────────────────────────────────────────

export type FormItemProps = ComponentProps<"div">;

/** One field's box: mints the id its label, control, description and message share. */
export function FormItem({ className, ...rest }: FormItemProps) {
  const id = useId();
  const [mounted, setMounted] = useState<Record<Described, boolean>>({
    description: false,
    message: false,
  });
  const mark = useCallback(
    (slot: Described, on: boolean) =>
      setMounted((prev) => (prev[slot] === on ? prev : { ...prev, [slot]: on })),
    [],
  );
  const value = useMemo(() => ({ id, mounted, mark }), [id, mounted, mark]);
  return (
    <FormItemContext.Provider value={value}>
      <div data-slot="form-item" {...rest} className={cn("grid gap-1", className)} />
    </FormItemContext.Provider>
  );
}

/** Report a describing node's presence to the item, so the control points at it only
 *  while it is on screen. A layout effect, so the reference lands before paint. */
function useDescribes(slot: Described, on: boolean) {
  const item = useContext(FormItemContext);
  const mark = item?.mark;
  useLayoutEffect(() => {
    if (!on || !mark) return;
    mark(slot, true);
    return () => mark(slot, false);
  }, [slot, on, mark]);
}

// ── FormLabel ────────────────────────────────────────────────────────────────

export type FormLabelProps = LabelProps;

/**
 * The kit's {@link Label}, bound to the control by `htmlFor` and turned to the danger
 * colour while the field is invalid. `required` draws the kit's `aria-hidden` mark:
 * whether the field is required is the control's to announce.
 */
export function FormLabel({ className, ...rest }: FormLabelProps) {
  const { error, formItemId } = useFormField();
  return (
    <Label
      data-slot="form-label"
      data-error={error ? true : undefined}
      htmlFor={formItemId}
      {...rest}
      className={cn("data-[error=true]:text-[var(--danger)]", className)}
    />
  );
}

// ── FormControl ──────────────────────────────────────────────────────────────

export interface FormControlProps {
  /** Exactly one element: the kit field, or a native one. It receives `id`,
   *  `aria-describedby` and `aria-invalid`. */
  children: ReactElement;
}

type AriaProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: ComponentProps<"input">["aria-invalid"];
};

/**
 * Wires its one child to the item: the `id` the label points at, `aria-describedby`
 * naming the rendered description and message, and `aria-invalid` while the field has
 * an error.
 *
 * The child's own values win where it has them (an explicit `id`, a set
 * `aria-invalid`), as they did under Radix `Slot`; its own `aria-describedby` is
 * merged in front of the item's rather than replaced.
 */
export function FormControl({ children }: FormControlProps) {
  const { invalid, formItemId, describedBy } = useFormField();
  const child = Children.only(children);
  if (!isValidElement<AriaProps>(child)) return child;
  const own = child.props;
  const merged = [own["aria-describedby"], describedBy].filter(Boolean).join(" ");
  return cloneElement(child, {
    id: own.id ?? formItemId,
    "aria-describedby": merged || undefined,
    "aria-invalid": own["aria-invalid"] ?? (invalid || undefined),
  });
}

// ── FormDescription / FormMessage ────────────────────────────────────────────

export type FormDescriptionProps = ComponentProps<"p">;

/** Standing advice under the field ("at least twelve characters"). */
export function FormDescription({ className, ...rest }: FormDescriptionProps) {
  const { formDescriptionId } = useFormField();
  useDescribes("description", true);
  return (
    <p
      data-slot="form-description"
      {...rest}
      id={formDescriptionId}
      className={cn("text-[11px] leading-tight text-[var(--text-muted)]", className)}
    />
  );
}

export type FormMessageProps = ComponentProps<"p">;

/**
 * The field's error message, from the form — the kit renders no string of its own
 * here; the schema or the `rules` carry the words. Without an error it renders its
 * `children`, if any, and otherwise nothing.
 *
 * Deliberately NOT `role="alert"`, for the reason the kit's `error` prop gives: the
 * message is read when focus reaches the control, which is where a field's own error
 * is wanted, and an alert would interrupt on every keystroke of a form that
 * re-validates as you type.
 */
export function FormMessage({ className, children, ...rest }: FormMessageProps) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : children;
  const shown = body !== undefined && body !== null && body !== false && body !== "";
  useDescribes("message", shown);
  if (!shown) return null;
  return (
    <p
      data-slot="form-message"
      {...rest}
      id={formMessageId}
      className={cn("text-[11px] leading-tight text-[var(--danger)]", className)}
    >
      {body}
    </p>
  );
}
