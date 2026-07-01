import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class lists with Tailwind conflict resolution (later wins). */
export const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs));
