import { createContext } from "react";
import type { ConfirmFn } from "./confirm-dialog";

/** The nearest `ConfirmProvider`'s `confirm`, or `null`. Internal: its own module so a
 *  part that may sit outside a provider (`RowActions`, 0.49 KIT-12) can ask without
 *  `useConfirm()`'s throw, and without adding a name to the barrel. */
export const ConfirmContext = createContext<ConfirmFn | null>(null);
