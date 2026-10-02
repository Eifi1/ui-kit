import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Select } from "../ui";
import { Checkbox } from "../checkbox";
import { Switch } from "../switch";
import { List, ListItem } from "../list";
import { WriteLockProvider } from "../write-lock";

/**
 * keksdose K3 (this agent's part): `commit` and `disabledReason` on the controls that
 * ARE their own commit — Switch, Checkbox, Select, and a ListItem whose click writes.
 * Button's pattern: under a lock the control is `aria-disabled` but focusable, the
 * reason is in the kit Tooltip and on `aria-describedby`, and no change is fired.
 */

const REASON = "Read-only demo.";

const descriptions = (el: Element) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? `#${id} MISSING`);

function ControlledSwitch(props: { onSave: (on: boolean) => void; commit?: boolean; disabledReason?: string }) {
  const [on, setOn] = useState(false);
  return (
    <Switch
      label="Email me"
      checked={on}
      commit={props.commit}
      disabledReason={props.disabledReason}
      onCheckedChange={(next) => {
        setOn(next);
        props.onSave(next);
      }}
    />
  );
}

describe("Switch commit / disabledReason", () => {
  it("under a lock: focusable, described, the click and the label click change nothing", () => {
    const onSave = vi.fn();
    render(
      <WriteLockProvider locked reason={REASON}>
        <ControlledSwitch commit onSave={onSave} />
      </WriteLockProvider>,
    );
    const sw = screen.getByRole("switch", { name: "Email me" });
    expect(sw).not.toBeDisabled();
    expect(sw).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(sw)).toEqual([REASON]);
    sw.focus();
    expect(sw).toHaveFocus();
    fireEvent.click(sw);
    fireEvent.click(screen.getByText("Email me"));
    expect(onSave).not.toHaveBeenCalled();
    expect(sw).not.toBeChecked();
    // The reason is in the kit Tooltip around the track.
    fireEvent.mouseEnter(sw.closest("span.relative")!.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent(REASON);
  });

  it("is untouched without commit, or with no lock", () => {
    const onSave = vi.fn();
    render(
      <>
        <WriteLockProvider locked reason={REASON}>
          <Switch label="Not a commit" onCheckedChange={onSave} />
        </WriteLockProvider>
        <ControlledSwitch commit onSave={onSave} />
      </>,
    );
    const free = screen.getByRole("switch", { name: "Not a commit" });
    expect(free).not.toHaveAttribute("aria-disabled");
    fireEvent.click(screen.getByRole("switch", { name: "Email me" }));
    expect(onSave).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("disabledReason alone does the same, and wins over disabled", () => {
    const onSave = vi.fn();
    render(<Switch label="Sync" disabled disabledReason="Connect a bank first." onCheckedChange={onSave} />);
    const sw = screen.getByRole("switch", { name: "Sync" });
    expect(sw).toBeEnabled();
    expect(sw).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(sw)).toEqual(["Connect a bank first."]);
    fireEvent.click(sw);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("Checkbox commit / disabledReason", () => {
  it("under a lock a controlled box keeps its state and fires nothing", () => {
    const onChange = vi.fn();
    const onCheckedChange = vi.fn();
    render(
      <WriteLockProvider locked reason={REASON}>
        <Checkbox label="Reviewer" description="May approve" checked onChange={onChange} onCheckedChange={onCheckedChange} commit />
      </WriteLockProvider>,
    );
    const box = screen.getByRole("checkbox", { name: "Reviewer" });
    expect(box).toHaveAttribute("aria-disabled", "true");
    expect(box).toBeEnabled();
    // Its own description stays first; the reason follows it.
    expect(descriptions(box)).toEqual(["May approve", REASON]);
    fireEvent.click(box);
    fireEvent.click(screen.getByText("Reviewer"));
    expect(box).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("an uncontrolled box is put back too, and a bare box keeps its className on the outer element", () => {
    const { container } = render(
      <Checkbox aria-label="Select row" className="self-end" disabledReason="Locked by the import." />,
    );
    const box = screen.getByRole("checkbox", { name: "Select row" });
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    expect(container.firstElementChild).toHaveClass("self-end");
  });

  it("an uncontrolled box reports its first real change once unlocked", () => {
    const onCheckedChange = vi.fn();
    const { rerender } = render(
      <Checkbox label="Reviewer" disabledReason="Locked." onCheckedChange={onCheckedChange} />,
    );
    const box = screen.getByRole("checkbox", { name: "Reviewer" });
    fireEvent.click(box);
    expect(box).not.toBeChecked();
    // Leaving the lock leaves its Tooltip, which mounts the box anew (as a Button's
    // does); a box that STAYS mounted must also report its next change.
    rerender(<Checkbox label="Reviewer" onCheckedChange={onCheckedChange} />);
    const free = screen.getByRole("checkbox", { name: "Reviewer" });
    fireEvent.click(free);
    expect(free).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("a box locked by a reason that stays locked keeps React's record in step", () => {
    // Two locked clicks in a row on the same mounted box: each is undone, so the box
    // never drifts from what it shows.
    render(<Checkbox label="Reviewer" disabledReason="Locked." defaultChecked />);
    const box = screen.getByRole("checkbox", { name: "Reviewer" });
    fireEvent.click(box);
    fireEvent.click(box);
    expect(box).toBeChecked();
  });

  it("keeps an indeterminate dash through a locked click", () => {
    render(<Checkbox aria-label="All rows" indeterminate disabledReason="Locked." />);
    const box = screen.getByRole("checkbox", { name: "All rows" }) as HTMLInputElement;
    fireEvent.click(box);
    expect(box.indeterminate).toBe(true);
    expect(box).not.toBeChecked();
  });

  it("the row reads as disabled while locked", () => {
    const { container } = render(<Checkbox label="Reviewer" disabledReason="No." />);
    expect(container.firstElementChild).toHaveClass("opacity-60");
    expect(screen.getByText("Reviewer")).toHaveClass("cursor-not-allowed");
  });
});

describe("Select commit / disabledReason", () => {
  function RoleSelect({ onSave }: { onSave: (v: string) => void }) {
    const [role, setRole] = useState("member");
    return (
      <Select
        label="Role"
        className="w-48"
        commit
        value={role}
        onChange={(e) => {
          setRole(e.target.value);
          onSave(e.target.value);
        }}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
      </Select>
    );
  }

  it("under a lock: focusable, described, settled, and a change is neither kept nor reported", () => {
    const onSave = vi.fn();
    render(
      <WriteLockProvider locked reason={REASON}>
        <RoleSelect onSave={onSave} />
      </WriteLockProvider>,
    );
    const select = screen.getByRole("combobox", { name: "Role" });
    expect(select).toBeEnabled();
    expect(select).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(select)).toEqual([REASON]);
    expect(select.className).toContain("cursor-not-allowed");
    // No chevron: nothing to drop.
    expect(select.parentElement?.querySelector("svg")).toBeNull();
    // The pointer and the keys that would open it or step it are swallowed…
    expect(fireEvent.mouseDown(select)).toBe(false);
    expect(fireEvent.keyDown(select, { key: "ArrowDown" })).toBe(false);
    expect(fireEvent.keyDown(select, { key: "Tab" })).toBe(true);
    // …and a change that gets through anyway (a phone's own picker) is not kept.
    fireEvent.change(select, { target: { value: "admin" } });
    expect(onSave).not.toHaveBeenCalled();
    expect(select).toHaveValue("member");
  });

  it("moves its className onto the Tooltip wrapper while locked, so the layout holds", () => {
    const { container } = render(
      <WriteLockProvider locked reason={REASON}>
        <RoleSelect onSave={() => {}} />
      </WriteLockProvider>,
    );
    const outer = container.firstElementChild as HTMLElement;
    expect(outer).toHaveClass("w-48", "block");
    fireEvent.mouseEnter(outer);
    expect(screen.getByRole("tooltip")).toHaveTextContent(REASON);
  });

  it("is untouched with no lock", () => {
    const onSave = vi.fn();
    const { container } = render(<RoleSelect onSave={onSave} />);
    const select = screen.getByRole("combobox", { name: "Role" });
    expect(select).not.toHaveAttribute("aria-disabled");
    expect(container.firstElementChild).toHaveClass("w-48");
    fireEvent.change(select, { target: { value: "admin" } });
    expect(onSave).toHaveBeenCalledWith("admin");
  });

  it("disabledReason with a caption: hint, then reason, then error", () => {
    render(
      <Select aria-label="Status" hint="Saved on change" error="Pick one" disabledReason="Archived.">
        <option value="">—</option>
      </Select>,
    );
    expect(descriptions(screen.getByRole("combobox", { name: "Status" }))).toEqual([
      "Saved on change",
      "Archived.",
      "Pick one",
    ]);
  });
});

describe("ListItem commit / disabledReason", () => {
  it("under a lock the row's button is focusable, described, and its click does nothing", () => {
    const onClick = vi.fn();
    render(
      <WriteLockProvider locked reason={REASON}>
        <List>
          <ListItem title="Mark all read" onClick={onClick} commit />
        </List>
      </WriteLockProvider>,
    );
    const row = screen.getByRole("button", { name: "Mark all read" });
    expect(row).toBeEnabled();
    expect(row).toHaveAttribute("aria-disabled", "true");
    expect(descriptions(row)).toEqual([REASON]);
    fireEvent.click(row);
    expect(onClick).not.toHaveBeenCalled();
    fireEvent.mouseEnter(row.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent(REASON);
    // Still one list item; the Tooltip sits inside the row's box.
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("keeps the caller's own description first", () => {
    render(
      <List>
        <ListItem title="Assign" onClick={() => {}} disabledReason="Already assigned." aria-describedby="help" />
      </List>,
    );
    const row = screen.getByRole("button", { name: "Assign" });
    expect(row.getAttribute("aria-describedby")?.split(" ")[0]).toBe("help");
  });

  it("is untouched without a lock", () => {
    const onClick = vi.fn();
    render(
      <List>
        <ListItem title="Open" onClick={onClick} commit />
      </List>,
    );
    const row = screen.getByRole("button", { name: "Open" });
    expect(row).not.toHaveAttribute("aria-disabled");
    fireEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
