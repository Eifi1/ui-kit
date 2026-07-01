import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { Search } from "lucide-react";
import { cn } from "../lib/cn";

/**
 * Open state + close-on-outside-click for the custom dropdowns (MultiSelect,
 * CurrencySelect, AmountInput's currency picker, Combobox). Attach `wrapperRef`
 * to the relatively-positioned container; the popover lives inside it so a click
 * anywhere else closes it.
 */
export function useDropdown<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<T>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return { open, setOpen, wrapperRef };
}

/**
 * {@link useDropdown} plus a search box: clears the query and focuses the search
 * input each time the panel opens, so typing filters immediately.
 */
export function useDropdownSearch<T extends HTMLElement = HTMLDivElement>() {
  const { open, setOpen, wrapperRef } = useDropdown<T>();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the query on open
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);
  return { open, setOpen, wrapperRef, query, setQuery, inputRef };
}

/** The search row (magnifier + text input) shared by the searchable dropdowns. */
export function DropdownSearchHeader({
  query,
  onQueryChange,
  inputRef,
  placeholder,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-2 py-1.5">
      <Search className="size-4 text-slate-400 dark:text-slate-500" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
    </div>
  );
}

/**
 * The floating popover surface for the searchable dropdowns: bordered/shadowed
 * panel, an optional `header` slot (search box, plus any actions), and a
 * scrollable `<ul>` of `children` with an "empty" row when nothing matches.
 * Pass width/position via `className` (e.g. `w-64`, `right-0 top-full`).
 */
export function DropdownPanel({
  header,
  empty,
  className,
  children,
}: {
  header?: ReactNode;
  empty?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute z-30 mt-1 rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900",
        className,
      )}
    >
      {header}
      <ul className="max-h-64 overflow-y-auto py-1">
        {children}
        {empty && <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">—</li>}
      </ul>
    </div>
  );
}
