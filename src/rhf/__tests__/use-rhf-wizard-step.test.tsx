import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../form";
import { useRhfWizardStep, type RhfWizardStepOptions } from "../use-rhf-wizard-step";
import { Input } from "../../components/ui";
import { useWizard } from "../../wizard/use-wizard";
import { StepperNav } from "../../wizard/stepper-nav";
import type { WizardStepConfig } from "../../wizard/types";

/**
 * A real `useForm` under a real `useWizard` + `StepperNav`: what the bridge could get
 * wrong is the registration with the wizard and react-hook-form's validation and
 * focus, and a mock of either would assert against itself.
 */
interface Values {
  name: string;
  iban: string;
}

const STEPS: WizardStepConfig[] = [
  { id: "name", label: "Name" },
  { id: "bank", label: "Bank" },
  { id: "done", label: "Done" },
];

function TextField({ form, name, label }: { form: UseFormReturn<Values>; name: keyof Values; label: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      rules={{ required: `${label} is required` }}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...field} invalid={fieldState.invalid} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/** One form spanning the first two steps; the step renders its own fields. */
function StepForm({
  step,
  options,
}: {
  step: string;
  options: (step: string) => RhfWizardStepOptions<Values> | ((v: Values) => void) | undefined;
}) {
  const form = useForm<Values>({ defaultValues: { name: "", iban: "" } });
  useRhfWizardStep(form, options(step));
  return (
    <Form {...form}>
      {step === "name" && (
        <>
          <TextField form={form} name="name" label="Name" />
          {/* On the same form, but not this step's to validate. */}
          <TextField form={form} name="iban" label="IBAN" />
        </>
      )}
      {step === "bank" && <TextField form={form} name="iban" label="IBAN" />}
    </Form>
  );
}

function Harness({
  options,
  onValidationFailed = () => {},
}: {
  options: (step: string) => RhfWizardStepOptions<Values> | ((v: Values) => void) | undefined;
  onValidationFailed?: (message: string) => void;
}) {
  const wizard = useWizard({ steps: STEPS, urlSync: false, onValidationFailed });
  const step = wizard.currentStep.id;
  return (
    <StepperNav wizard={wizard}>
      <p data-testid="step">{step}</p>
      {step !== "done" && <StepForm key={step} step={step} options={options} />}
    </StepperNav>
  );
}

async function clickNext() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
  });
}

describe("useRhfWizardStep, whole form", () => {
  it("blocks Next, shows the form's messages and focuses the first field in error", async () => {
    const onValid = vi.fn();
    const onValidationFailed = vi.fn();
    render(<Harness options={() => ({ onValid })} onValidationFailed={onValidationFailed} />);
    await clickNext();
    expect(screen.getByTestId("step")).toHaveTextContent("name");
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("IBAN is required")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();
    expect(onValid).not.toHaveBeenCalled();
    // No per-field errors reach the wizard, so it says something itself.
    expect(onValidationFailed).toHaveBeenCalledTimes(1);
  });

  it("hands the values to onValid and advances once the form passes", async () => {
    const onValid = vi.fn();
    render(<Harness options={() => ({ onValid })} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("IBAN"), { target: { value: "DE00" } });
    await clickNext();
    expect(screen.getByTestId("step")).toHaveTextContent("bank");
    expect(onValid).toHaveBeenCalledWith({ name: "Ada", iban: "DE00" });
  });

  it("still takes kastlan's positional onValid", async () => {
    const onValid = vi.fn();
    render(<Harness options={() => onValid} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    fireEvent.change(screen.getByLabelText("IBAN"), { target: { value: "DE00" } });
    await clickNext();
    expect(onValid).toHaveBeenCalledWith({ name: "Ada", iban: "DE00" });
    expect(screen.getByTestId("step")).toHaveTextContent("bank");
  });
});

describe("useRhfWizardStep, with fields", () => {
  const byStep = (onValid: (v: Values) => void) => (step: string) =>
    ({ fields: step === "name" ? ["name"] : ["iban"], onValid }) as RhfWizardStepOptions<Values>;

  it("validates only the step's fields, and leaves the others' errors unraised", async () => {
    const onValid = vi.fn();
    render(<Harness options={byStep(onValid)} />);
    await clickNext();
    expect(screen.getByTestId("step")).toHaveTextContent("name");
    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(screen.queryByText("IBAN is required")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    await clickNext();
    // The IBAN is still empty; it is the next step's to check.
    expect(screen.getByTestId("step")).toHaveTextContent("bank");
    expect(onValid).toHaveBeenCalledWith({ name: "Ada", iban: "" });
  });

  it("unregisters with the step, so the next step runs only its own validator", async () => {
    render(<Harness options={byStep(() => {})} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
    await clickNext();
    await clickNext();
    expect(screen.getByTestId("step")).toHaveTextContent("bank");
    expect(screen.getByLabelText("IBAN")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("IBAN"), { target: { value: "DE00" } });
    await clickNext();
    expect(screen.getByTestId("step")).toHaveTextContent("done");
  });
});

describe("useRhfWizardStep, outside a StepperNav", () => {
  it("registers nothing and returns the validator", async () => {
    const { result } = renderHook(() => {
      const form = useForm<Values>({ defaultValues: { name: "", iban: "" } });
      form.register("name", { required: true });
      return { form, validate: useRhfWizardStep(form, { fields: ["name"] }) };
    });
    let ok = true;
    await act(async () => {
      ok = await result.current.validate();
    });
    expect(ok).toBe(false);
    act(() => result.current.form.setValue("name", "Ada"));
    await act(async () => {
      ok = await result.current.validate();
    });
    expect(ok).toBe(true);
  });
});
