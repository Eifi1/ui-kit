import { useState } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, IconButton, Input } from "../../../src/components/ui";
import { Field } from "../../../src/components/field";
import { Switch } from "../../../src/components/switch";
import { FormActions } from "../../../src/components/form-actions";
import { WriteLockProvider, useWriteLock } from "../../../src/components/write-lock";
import { Example, Note } from "../lib/section";

/**
 * WriteLockProvider (0.18): keksdose's read-only demo budget and Kurvenschmiede's
 * shared-to-view curve — everything renders, only the commit is locked.
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

/** A control that IS its own commit reads the lock itself. */
function AutoSaveSwitch() {
  const lock = useWriteLock();
  const [on, setOn] = useState(true);
  return (
    <Switch
      checked={on}
      onCheckedChange={setOn}
      disabled={lock.locked}
      label="Email me the weekly summary"
    />
  );
}

function AccountForm() {
  const [name, setName] = useState("Household");
  return (
    <Card padding="md" density="compact">
      <CardHeader>
        <CardTitle as="h3">Account</CardTitle>
        <CardDescription>Shown on every booking in this budget.</CardDescription>
      </CardHeader>
      <CardContent className="mt-3 flex flex-col gap-3">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <AutoSaveSwitch />
        <FormActions
          commit
          onSubmit={() => {}}
          onCancel={() => setName("Household")}
          destructive={{ label: "Delete", onClick: () => {} }}
        />
      </CardContent>
    </Card>
  );
}

export function WriteLock018Demo() {
  const [locked, setLocked] = useState(true);
  return (
    <Example
      label="WriteLockProvider — commit"
      hint="one provider per page; each Save, Delete or FormActions opts in with commit"
    >
      <div className="flex flex-col gap-4">
        <Switch checked={locked} onCheckedChange={setLocked} label="Viewing a budget shared to read" />
        <WriteLockProvider locked={locked} reason="Shared with you to read — saving is off.">
          <div className="grid gap-4 md:grid-cols-2">
            <AccountForm />
            <Card padding="md" density="compact">
              <CardHeader>
                <CardTitle as="h3">Curve</CardTitle>
                <CardDescription>Export is a read and stays live.</CardDescription>
              </CardHeader>
              <CardContent className="mt-3 flex flex-wrap items-center gap-2">
                <Button commit>
                  <Save aria-hidden className="size-4" />
                  Save as project
                </Button>
                <Button variant="secondary">
                  <Download aria-hidden className="size-4" />
                  Export
                </Button>
                <IconButton commit label="Delete curve" tone="danger">
                  <Trash2 />
                </IconButton>
                {/* An inner provider wins: a viewer's own notes stay writable. */}
                <WriteLockProvider locked={false}>
                  <Button commit variant="secondary">
                    Save my note
                  </Button>
                </WriteLockProvider>
              </CardContent>
            </Card>
          </div>
        </WriteLockProvider>
        <Note>
          The fields stay editable — nothing in them reaches the server until the commit — and a locked commit is{" "}
          {code("aria-disabled")}, still focusable, with the reason in its tooltip and description (the{" "}
          {code("disabledReason")} path). The lock&apos;s reason wins over a control&apos;s own. A control that saves on
          change (the switch) reads {code("useWriteLock()")} and disables itself. Nested providers: the nearest wins.
        </Note>
      </div>
    </Example>
  );
}
