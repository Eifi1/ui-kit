/**
 * A tiny, dependency-free arithmetic evaluator for the numeric input fields.
 * It lets users type a calculation (e.g. "12.50+3.20" or "100/3") straight into
 * an amount field, or build one in the calculator popover, and have it resolve
 * to a number. Deliberately NOT backed by `eval`/`Function` — it's a hand-rolled
 * tokenizer + recursive-descent parser over a closed grammar (digits, decimals,
 * `+ - * /`, unary minus, parentheses), so no arbitrary code can run.
 */

type Token =
  | { kind: "num"; value: number }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "lparen" }
  | { kind: "rparen" };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ kind: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i;
      let dotSeen = false;
      while (j < input.length && ((input[j] >= "0" && input[j] <= "9") || input[j] === ".")) {
        if (input[j] === ".") {
          if (dotSeen) return null; // two dots in one number → invalid
          dotSeen = true;
        }
        j++;
      }
      const num = Number(input.slice(i, j));
      if (!Number.isFinite(num)) return null;
      tokens.push({ kind: "num", value: num });
      i = j;
      continue;
    }
    return null; // unknown character
  }
  return tokens;
}

/**
 * Recursive-descent parse honouring `* /` over `+ -` and left-associativity.
 * Returns `null` for any malformed input (the `null` sentinel is safe because a
 * valid result of 0 is distinct from it). Division by zero is treated as invalid.
 *
 *   expr   := term (('+' | '-') term)*
 *   term   := factor (('*' | '/') factor)*
 *   factor := ('+' | '-') factor | number | '(' expr ')'
 */
function parse(tokens: Token[]): number | null {
  let pos = 0;

  function parseExpr(): number | null {
    let value = parseTerm();
    if (value === null) return null;
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.kind === "op" && (tok.value === "+" || tok.value === "-")) {
        pos++;
        const rhs = parseTerm();
        if (rhs === null) return null;
        value = tok.value === "+" ? value + rhs : value - rhs;
      } else break;
    }
    return value;
  }

  function parseTerm(): number | null {
    let value = parseFactor();
    if (value === null) return null;
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok.kind === "op" && (tok.value === "*" || tok.value === "/")) {
        pos++;
        const rhs = parseFactor();
        if (rhs === null) return null;
        if (tok.value === "/") {
          if (rhs === 0) return null;
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      } else break;
    }
    return value;
  }

  function parseFactor(): number | null {
    const tok = tokens[pos];
    if (!tok) return null;
    if (tok.kind === "op" && (tok.value === "+" || tok.value === "-")) {
      pos++;
      const operand = parseFactor();
      if (operand === null) return null;
      return tok.value === "-" ? -operand : operand;
    }
    if (tok.kind === "lparen") {
      pos++;
      const inner = parseExpr();
      if (inner === null) return null;
      if (tokens[pos]?.kind !== "rparen") return null;
      pos++;
      return inner;
    }
    if (tok.kind === "num") {
      pos++;
      return tok.value;
    }
    return null;
  }

  const result = parseExpr();
  if (result === null) return null;
  if (pos !== tokens.length) return null; // leftover tokens → invalid
  return result;
}

/** Evaluate an arithmetic string, returning `null` if it isn't a valid sum.
 * Accepts the on-screen operator glyphs (`× ÷ −`) and comma decimals too. */
export function evaluateExpression(expr: string): number | null {
  const normalized = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-") // unicode minus / en / em dash → ascii
    .replace(/,/g, ".")
    .trim();
  if (normalized === "") return null;
  const tokens = tokenize(normalized);
  if (tokens === null || tokens.length === 0) return null;
  const result = parse(tokens);
  if (result === null || !Number.isFinite(result)) return null;
  return result;
}

/** True when `s` carries arithmetic beyond a single leading minus — i.e. a plain
 * number (or a lone negative like "-5") is NOT an expression, but "12+5" is.
 * Used to decide whether a field's text should be evaluated on commit.
 *
 * The operator set is the one {@link evaluateExpression} accepts, on-screen glyphs
 * included: the calculator keypad inserts `× ÷ −`, and a `−` that this said was not
 * arithmetic went on to be read as a plain number — where the digits-only fallback
 * in {@link commitExpression} silently ate it, turning "-42−−50" (= 8) into a bare
 * 8 with no record that a sum had happened at all. */
export function looksLikeExpression(s: string): boolean {
  const t = s.trim();
  if (t === "") return false;
  if (/^-?\d*[.,]?\d*$/.test(t)) return false; // plain (optionally negative) decimal
  return /[+\-*/×÷−–—()]/.test(t.replace(/^-/, ""));
}

/** Render an evaluated number back to a field-friendly string, trimming binary
 * float noise (so 0.1 + 0.2 reads "0.3", not "0.30000000000000004").
 *
 * FIXED notation, always, and that is the whole point of the function rather than a
 * detail of it. This used to end in `parseFloat(n.toFixed(10)).toString()`, and
 * `Number.prototype.toString` switches to EXPONENT notation below 1e-6 and at or
 * above 1e21 — an alphabet containing `e`, `+` and `-`. Neither function that reads a
 * field's text back accepts it: {@link tokenize} rejects `e` as an unknown character
 * and {@link sanitizeLive} deletes it. So {@link commitExpression} fell through to
 * its digits-only cleanup, which stripped the `e` and CONCATENATED the mantissa to
 * the exponent. A field committed its own output as a different number:
 *
 *     "1/10000000"                -> "1e-7"               -> "17"   (AmountInput: "6")
 *     "999999999999*999999999999" -> "9.99999999998e+23"  -> "9.9999999999823"
 *
 * Both controls commit on blur AND on Enter, so Enter-then-click-away was enough on
 * its own, it was silent, and it was in a money field.
 *
 * The invariant, which the test asserts directly rather than by example:
 * **`commitExpression(formatResult(n))` equals `formatResult(n)` for every finite
 * `n`.** Anything rendered here has to survive being read back. */
export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return "";
  // At or above 1e21 `toFixed` gives up and hands back `toString`'s exponent form —
  // but every double that large is an integer, so BigInt renders it exactly.
  if (Math.abs(n) >= 1e21) return BigInt(n).toString();
  return trimTrailingZeros(n.toFixed(10));
}

/** "15.7000000000" -> "15.7", "0.0000000000" -> "0". The ten decimals are where the
 *  binary float noise gets rounded off; this is only about not showing the padding. */
function trimTrailingZeros(fixed: string): string {
  if (!fixed.includes(".")) return fixed;
  const trimmed = fixed.replace(/0+$/, "").replace(/\.$/, "");
  // `toFixed` keeps the sign on a magnitude that rounded away to nothing
  // ("-0.0000000000"); `toString` did not, and "-0" in an amount field is noise.
  return trimmed === "-0" || trimmed === "" ? "0" : trimmed;
}

/** The single "on blur / Enter" transform a numeric field applies: evaluate the
 * text if it's an expression, otherwise normalise it to a bare number string
 * (comma → dot, dropping stray characters, non-leading minuses and anything after
 * a second decimal point).
 *
 * The last clause is the backstop for Keksdose live #201. A field the user typed in
 * cannot reach here malformed any more — {@link sanitizeLive} runs on every change,
 * including a paste — but a value handed in from elsewhere (a recurring rule, an
 * import, a test) still can, and "1.2.3" is not an expression (no operator), so it
 * used to fall straight through unchanged and be read as NaN. Here the text is CUT
 * at the second dot ("1.2") rather than joined ("1.23"): with no keystroke to
 * ignore there is nothing to say which reading was meant, and the shorter one
 * cannot silently invent a bigger number. */
export function commitExpression(raw: string): string {
  const s = raw.trim();
  if (looksLikeExpression(s)) {
    const n = evaluateExpression(s);
    if (n !== null) return formatResult(n);
    // Unparseable (e.g. a half-typed "12+"): fall through to a digits-only clean.
  }
  // Global, like sanitizeLive's: these two are the two halves of one rule and must
  // not appear to state it differently. (The `[^0-9.-]` strip on the same line
  // already ate whatever commas a non-global replace missed, so this changes no
  // behaviour — it removes the need for the next reader to run it to find that out.)
  const cleaned = s.replace(/,/g, ".").replace(/[^0-9.-]/g, "").replace(/(?!^)-/g, "");
  return cleaned.replace(/^(-?\d*\.?\d*).*$/, "$1");
}

/** The live, per-keystroke transform a numeric field applies: comma → dot and
 * drop anything that isn't a digit, decimal point, arithmetic operator (incl.
 * the on-screen `× ÷` glyphs) or paren — so a typed calculation survives
 * keystroke-by-keystroke but stray characters can't be entered. A lone leading
 * `-` is kept — in a plain field it is simply a negative amount; in a field whose
 * caller owns the sign it is read off again by {@link splitLeadingSign}. The text
 * is resolved to a plain number on blur/Enter via {@link commitExpression}. */
export function sanitizeLive(raw: string): string {
  return dropExtraDots(raw.replace(/,/g, ".").replace(/[^0-9.+\-*/×÷()]/g, ""));
}

/**
 * At most ONE decimal point per number (Keksdose live #201).
 *
 * Per NUMBER, not per string: "1.5+2.5" is a legitimate calculation with two dots
 * in two operands, so the counter resets at every operator and parenthesis.
 *
 * A second dot inside one operand is a **no-op keystroke** — the digits after it
 * keep landing, so "1.2" + "." + "3" is "1.23". That is what every calculator does
 * with a repeated decimal point, and it is the only option that does not make the
 * field feel broken ("my 3 disappeared"). This runs on paste as well as on typing,
 * so the malformed value never reaches the rest of the app: everything downstream
 * reads the field with `Number()`, NaN became a silent 0, and on the create form
 * that 0 was painted with the income green — a figure that was not a number at all
 * asserting money was coming in.
 */
function dropExtraDots(s: string): string {
  let out = "";
  let dotInNumber = false;
  for (const ch of s) {
    if (ch === ".") {
      if (dotInNumber) continue;
      dotInNumber = true;
    } else if (ch < "0" || ch > "9") {
      // An operator or a paren ends the current operand.
      dotInNumber = false;
    }
    out += ch;
  }
  return out;
}

/** A bare, unsigned amount: digits with at most one decimal separator and nothing
 *  else — "42", "42.", ".5", "0,5". NOT "" (an empty field has no figure to put a
 *  sign in front of), not "-42", not "12+5". It is the only shape a DISPLAYED sign
 *  prefix makes sense in front of; an expression carries its own arithmetic and has
 *  to survive keystroke-for-keystroke. */
export function isBareAmount(s: string): boolean {
  const t = s.trim();
  return t !== "" && /^\d*[.,]?\d*$/.test(t);
}

/**
 * Split a LEADING sign off a plain signed number (Keksdose live #201 rework):
 * `"-42"` → `{ sign: "-", rest: "42" }`, everything else → `{ sign: "", rest: text }`.
 *
 * Only in front of a bare amount, because a minus with arithmetic after it IS
 * arithmetic: "12-30" is a subtraction, and "-12+5" is -7, not -(12+5). Those come
 * back untouched and are resolved by {@link commitExpression} on blur — at which
 * point the RESULT is a plain signed number and this function does get to speak.
 *
 * A lone "-" splits (rest ""): the sign is a statement about the direction the
 * moment it is typed, before any digit exists.
 */
export function splitLeadingSign(text: string): { sign: "" | "-" | "+"; rest: string } {
  const trimmed = text.trimStart();
  const sign = trimmed.charAt(0);
  if (sign !== "-" && sign !== "+") return { sign: "", rest: text };
  const rest = trimmed.slice(1);
  if (rest !== "" && !isBareAmount(rest)) return { sign: "", rest: text };
  return { sign, rest };
}
