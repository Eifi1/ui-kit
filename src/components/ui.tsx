/**
 * The kit's core controls, each re-exported from its own module (0.34, MOD-2, refactor
 * audit 2026-10). This file held all ten — Button, IconButton, the field base, Input,
 * Select, Textarea, Card, Spinner, EmptyState and Tabs — in some 4,300 lines that the
 * round agents edited at once. Kit code imports the module it needs.
 *
 * It stays, as a shim with nothing of its own, for its importers: the barrel, whose
 * `export *` of components/ui keeps every public name where it was, and the tests (and,
 * until they are moved, the kit modules) that import `../ui` / `./ui`. (No quoted
 * specifier in this comment: scripts/fix-esm-extensions.mjs rewrites the .d.ts it lands
 * in, comments included.)
 * `button-look` and `field-base` also hold parts the controls share and the package does
 * not export, so those two are re-exported by name; the others are public whole.
 */
export * from "./button";
export {
  buttonClasses,
  TOUCH_TARGET_LARGE,
  type ButtonClassesOptions,
  type ButtonSize,
  type ButtonTone,
  type ButtonVariant,
} from "./button-look";
export * from "./icon-button";
export {
  FIELD_TOUCH_TEXT,
  FIELD_BASE,
  FIELD_WRITABLE_LOOK,
  FIELD_FLOATING_PAD,
  FIELD_INVALID,
  FLOATING_INPUT_CLASS,
  FIELD_DISPLAY,
  FIELD_TRIGGER,
  FieldChevron,
  FLOATING_LABEL_CLASS,
  FloatingField,
  Label,
  DEFAULT_PASSWORD_REVEAL_LABELS,
  resolvePasswordRevealLabels,
  DEFAULT_CHARACTER_COUNT_LABELS,
  type FieldChevronProps,
  type FloatingFieldProps,
  type LabelProps,
  type PasswordRevealLabels,
  type CharacterCountLabels,
} from "./field-base";
export * from "./input";
export * from "./select";
export * from "./textarea";
export * from "./card";
export * from "./spinner";
export * from "./empty-state";
export * from "./tabs";

// The static label lives in field-parts since 0.23 (it is what the field anatomy
// there draws, and field-parts must not import the controls); public from here as before.
export { FieldLabel, FLOATING_LABEL_STATIC, FieldHint } from "./field-parts";
export type { FieldLabelProps, FieldHintProps } from "./field-parts";

// The kit's focus frame (§5) lives in its own module so the parts the controls import
// (field-parts, the choice controls) can draw it too; public from here as before.
export { FOCUS_RING, FOCUS_RING_WIDTH } from "./focus-ring";

// No fact only in a tooltip (§4): the reason line and the compact region live in
// field-parts, where the self-saving controls (Switch, Checkbox) reach them too.
export {
  CompactControls,
  DisabledReasonLine,
  DISABLED_REASON_LINE_CLASS,
  useDisabledReasonLine,
} from "./field-parts";
export type { DisabledReasonDisplay } from "./field-parts";
