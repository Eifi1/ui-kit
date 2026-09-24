// `@eifi1/ui-kit/table-text` — the lexer for a table pasted out of a spreadsheet or read
// from a CSV, and the three named rules for the comma. See the note at the top of
// lib/table-text.ts.
//
// Pure functions over strings: no React, no DOM, nothing to install. It is its own
// entry so an app that imports a CSV on a server, in a worker or in a script can take
// it without reaching through a barrel of components.
export * from "./lib/table-text";
