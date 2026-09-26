import { useState } from "react";
import { Cloud, HardDrive, KeyRound, ShieldCheck, Smartphone } from "lucide-react";
import { ActionCard } from "@eifi1/ui-kit";
import type { ActionCardMetaTone } from "@eifi1/ui-kit";
import { Example, Note, OutTable } from "../lib/section";

/**
 * ActionCard (0.11): a ChoiceCard that ACTS — a button with an icon, a title, a
 * description and a `meta` line, that runs `onClick` the moment it is pressed.
 */

const TONES: { tone: ActionCardMetaTone; title: string; description: string; meta: string; icon: typeof Cloud }[] = [
  {
    tone: "warning",
    title: "Keep the key yourself",
    description: "Only you can read your data. We cannot recover it for you.",
    meta: "Lose the recovery code and the data is gone for good.",
    icon: KeyRound,
  },
  {
    tone: "info",
    title: "Let us hold a copy of the key",
    description: "We can restore your access if you lose every device.",
    meta: "Our support staff could, in principle, be compelled to use it.",
    icon: Cloud,
  },
  {
    tone: "success",
    title: "Use this phone's secure element",
    description: "The key never leaves the device.",
    meta: "Supported on this device.",
    icon: Smartphone,
  },
  {
    tone: "danger",
    title: "Export the key to a file",
    description: "A plain file you store where you like.",
    meta: "Anyone who finds the file can read everything.",
    icon: HardDrive,
  },
  {
    tone: "muted",
    title: "Decide later",
    description: "Your data stays on this device until you choose.",
    meta: "You will be asked again in 7 days.",
    icon: ShieldCheck,
  },
];

export function ActionCardDemo() {
  const [picked, setPicked] = useState("—");
  return (
    <Example
      label="ActionCard — icon, description, meta and every metaTone"
      hint="picking one IS the next step: no checked state, no Continue"
    >
      <div className="grid gap-3 md:grid-cols-2">
        {TONES.map((c) => (
          <ActionCard
            key={c.tone}
            icon={c.icon}
            title={c.title}
            description={c.description}
            meta={c.meta}
            metaTone={c.tone}
            onClick={() => setPicked(`${c.title} (metaTone="${c.tone}")`)}
          />
        ))}
        <ActionCard
          icon={Smartphone}
          title="Use a hardware key"
          description="Plug in a security key to hold the secret."
          meta="No security key was found."
          metaTone="danger"
          disabled
        />
        <ActionCard title="Title only" onClick={() => setPicked("Title only")} />
      </div>
      <OutTable rows={[["onClick", picked]]} />
      <div className="mt-3">
        <Note>
          A <code className="font-mono">&lt;button&gt;</code>, named by its <code className="font-mono">title</code>{" "}
          alone and described by the <code className="font-mono">description</code> and then the{" "}
          <code className="font-mono">meta</code> line — so a reader hears &ldquo;Keep the key yourself, button&rdquo;
          and then the explanation, not one long name. <code className="font-mono">meta</code> is what it costs, said
          as prose; <code className="font-mono">metaTone</code> colours it —{" "}
          <code className="font-mono">muted</code> (default), <code className="font-mono">warning</code>,{" "}
          <code className="font-mono">danger</code>, <code className="font-mono">info</code>,{" "}
          <code className="font-mono">success</code>. The seventh card is <code className="font-mono">disabled</code>;
          the last has no icon, description or meta.
        </Note>
      </div>
    </Example>
  );
}
