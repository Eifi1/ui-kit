// `@eifi1/ui-kit/rhf` — the react-hook-form adapter: Form, FormField, FormItem,
// FormLabel, FormControl, FormDescription, FormMessage and useFormField.
//
// The only entry point in the package that requires `react-hook-form`, and an optional
// peer for that reason: an app without a form library installs nothing for it. NOT
// re-exported from the main barrel, which would make the peer everyone's — the reason
// the barrel dropped its last react-hook-form import (see the wizard section of
// src/index.ts). The packaging contract test holds that line.
export * from "./rhf/form";
// The react-hook-form bridge to the wizard's Next gate (useWizard lives in /wizard).
export * from "./rhf/use-rhf-wizard-step";
