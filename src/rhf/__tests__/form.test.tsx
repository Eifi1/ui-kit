import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type UseFormReturn } from "react-hook-form";
import { vi } from "vitest";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "../form";
import { Input } from "../../components/ui";
import { NumberField } from "../../components/number-field";
import { DatePicker } from "../../components/date-picker";

/**
 * Every case runs a real `useForm`: the adapter is four contexts and a `cloneElement`,
 * and what could be wrong with it is the wiring to react-hook-form's state — which a
 * mocked form would assert against itself.
 */
interface Values {
  name: string;
  amount: number | null;
  due: string;
}

const DEFAULTS: Values = { name: "", amount: null, due: "" };

function Harness({
  children,
  onSubmit = () => {},
}: {
  children: (form: UseFormReturn<Values>) => React.ReactNode;
  onSubmit?: (values: Values) => void;
}) {
  const form = useForm<Values>({ defaultValues: DEFAULTS });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {children(form)}
        <button type="submit">Save</button>
      </form>
    </Form>
  );
}

/** The name field most forms start with, required, with an optional description. */
function NameField({
  form,
  description,
  describedBy,
}: {
  form: UseFormReturn<Values>;
  description?: string;
  describedBy?: string;
}) {
  return (
    <FormField
      control={form.control}
      name="name"
      rules={{ required: "Name is required" }}
      render={({ field, fieldState }) => (
        <FormItem>
          <FormLabel required>Name</FormLabel>
          <FormControl>
            <Input {...field} invalid={fieldState.invalid} aria-describedby={describedBy} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

describe("FormLabel + FormControl", () => {
  it("names the control through htmlFor, with the asterisk kept out of the name", () => {
    render(<Harness>{(form) => <NameField form={form} />}</Harness>);
    const input = screen.getByRole("textbox", { name: "Name" });
    const label = screen.getByText("Name").closest("label")!;
    expect(label).toHaveAttribute("for", input.id);
    expect(label).toHaveTextContent("Name*");
  });

  it("points at nothing while there is nothing to point at", () => {
    // shadcn's control always carried a description id, rendered or not — a reference
    // to a node that does not exist.
    render(<Harness>{(form) => <NameField form={form} />}</Harness>);
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });
});

describe("an invalid field", () => {
  it("shows the form's message, describes the control with it and marks it invalid", async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit}>{(form) => <NameField form={form} />}</Harness>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription("Name is required");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Name").closest("label")).toHaveAttribute("data-error", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("lets go of the message once the value is fixed", async () => {
    render(<Harness>{(form) => <NameField form={form} />}</Harness>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const input = screen.getByRole("textbox", { name: "Name" });
    await screen.findByText("Name is required");

    await userEvent.type(input, "Ada");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByText("Name is required")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("keeps the control's own description first and the item's after it", async () => {
    render(
      <Harness>
        {(form) => (
          <>
            <p id="own">Shown on the invoice</p>
            <NameField form={form} description="As on the passport" describedBy="own" />
          </>
        )}
      </Harness>,
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAccessibleDescription("Shown on the invoice As on the passport");

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Name is required");
    expect(input).toHaveAccessibleDescription(
      "Shown on the invoice As on the passport Name is required",
    );
  });

  it("renders no message, and points at none, for an error without words", async () => {
    render(
      <Harness>
        {(form) => (
          <FormField
            control={form.control}
            name="name"
            rules={{ required: true }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </Harness>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const input = screen.getByRole("textbox", { name: "Name" });
    await vi.waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"));
    expect(input).not.toHaveAttribute("aria-describedby");
  });
});

describe("FormMessage without an error", () => {
  it("renders its children, and the control is described by them", () => {
    render(
      <Harness>
        {(form) => (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage>Checked against the register</FormMessage>
              </FormItem>
            )}
          />
        )}
      </Harness>,
    );
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveAccessibleDescription(
      "Checked against the register",
    );
  });
});

describe("the kit's own fields in the control slot", () => {
  it("NumberField is named, described and painted from the slot", async () => {
    render(
      <Harness>
        {(form) => (
          <FormField
            control={form.control}
            name="amount"
            rules={{ required: "Enter an amount" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <NumberField value={field.value} onCommit={field.onChange} nullable locale="en-GB" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </Harness>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Enter an amount");
    const input = screen.getByRole("textbox", { name: "Amount" });
    expect(input).toHaveAccessibleDescription("Enter an amount");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("DatePicker's trigger takes the label and the message", async () => {
    render(
      <Harness>
        {(form) => (
          <FormField
            control={form.control}
            name="due"
            rules={{ required: "Pick a due date" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} locale="en-GB" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </Harness>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Pick a due date");
    const trigger = screen.getByRole("combobox");
    expect(trigger).toHaveAccessibleName(/^Due\b/);
    expect(trigger).toHaveAccessibleDescription("Pick a due date");
    expect(trigger).toHaveAttribute("aria-invalid", "true");
  });
});

describe("useFormField", () => {
  function Probe() {
    const { name, formItemId, invalid } = useFormField();
    return <output>{`${name} ${formItemId ? "has-id" : "no-id"} ${invalid}`}</output>;
  }

  it("answers the field's name, ids and state inside an item", () => {
    render(
      <Harness>
        {(form) => (
          <FormField
            control={form.control}
            name="name"
            render={() => (
              <FormItem>
                <Probe />
              </FormItem>
            )}
          />
        )}
      </Harness>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("name has-id false");
  });

  it("refuses to answer outside a FormField, instead of minting ids that label nothing", () => {
    // React reports a render error on the console before rethrowing it; the throw is
    // the assertion, the log is noise.
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Harness>{() => <Probe />}</Harness>)).toThrow(/inside <FormField>/);
    log.mockRestore();
  });
});
