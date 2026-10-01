import { Trash2 } from "lucide-react";
import { Button, Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle, IconButton } from "@eifi1/ui-kit";
import { Example, Note } from "../lib/section";

/**
 * The 0.17 Card props from keksdose's Q3: `density="compact"` (the small settings
 * card's title / description / header-gap classes, set once on the Card) and
 * `toneFill` (the tone's wash, opt-in, on top of either frame strength).
 */

const code = (s: string) => <code className="font-mono">{s}</code>;

export function Surfaces017Demo() {
  return (
    <Example
      label="Card density, toneFill"
      hint='density="compact": text-sm title, text-xs description, gap-0.5; toneFill: the tone wash over the surface'
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <CardHeader>
            <CardTitle as="h3">Notifications (comfortable)</CardTitle>
            <CardDescription>Email when a booking changes.</CardDescription>
          </CardHeader>
        </Card>
        <Card padding="md" density="compact">
          <CardHeader stackAction>
            <CardTitle as="h3">Notifications (compact)</CardTitle>
            <CardDescription>Email when a booking changes.</CardDescription>
            <CardAction>
              <Button size="sm" variant="secondary">
                Edit
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
        <Card tone="danger" toneStrength="strong" padding="md" density="compact">
          <CardHeader>
            <CardTitle as="h3">Delete account (strong, no fill)</CardTitle>
            <CardDescription>Removes every booking. This cannot be undone.</CardDescription>
          </CardHeader>
        </Card>
        <Card tone="danger" toneStrength="strong" toneFill padding="md" density="compact">
          <CardHeader>
            <CardTitle as="h3">Delete account (strong + toneFill)</CardTitle>
            <CardDescription>Removes every booking. This cannot be undone.</CardDescription>
            <CardAction>
              <IconButton label="Delete account" tone="danger" quiet={false}>
                <Trash2 />
              </IconButton>
            </CardAction>
          </CardHeader>
          <CardContent className="pt-3 text-sm text-[var(--text-secondary)]">
            Your password was changed 3 months ago.
          </CardContent>
        </Card>
      </div>
      <div className="mt-3">
        <Note>
          {code('density="compact"')} replaces {code('CardTitle className="text-sm font-medium"')},{" "}
          {code('CardDescription className="text-xs"')} and {code("CardHeader gap-0.5")}; a class on a
          part still wins. A toned card is a frame and a title colour; {code("toneFill")} adds the
          tone's {code("-bg")} wash, layered over the card surface so the dark theme stays opaque.
        </Note>
      </div>
    </Example>
  );
}
