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
 * Used to decide whether a field's text should be evaluated on commit. */
export function looksLikeExpression(s: string): boolean {
  const t = s.trim();
  if (t === "") return false;
  if (/^-?\d*[.,]?\d*$/.test(t)) return false; // plain (optionally negative) decimal
  return /[+\-*/×÷()]/.test(t.replace(/^-/, ""));
}

/** Render an evaluated number back to a field-friendly string, trimming binary
 * float noise (so 0.1 + 0.2 reads "0.3", not "0.30000000000000004"). */
export function formatResult(n: number): string {
  if (!Number.isFinite(n)) return "";
  return parseFloat(n.toFixed(10)).toString();
}

/** The single "on blur / Enter" transform a numeric field applies: evaluate the
 * text if it's an expression, otherwise normalise it to a bare number string
 * (comma → dot, dropping stray characters and non-leading minuses). */
export function commitExpression(raw: string): string {
  const s = raw.trim();
  if (looksLikeExpression(s)) {
    const n = evaluateExpression(s);
    if (n !== null) return formatResult(n);
    // Unparseable (e.g. a half-typed "12+"): fall through to a digits-only clean.
  }
  return s.replace(",", ".").replace(/[^0-9.-]/g, "").replace(/(?!^)-/g, "");
}

/** The live, per-keystroke transform a numeric field applies: comma → dot and
 * drop anything that isn't a digit, decimal point, arithmetic operator (incl.
 * the on-screen `× ÷` glyphs) or paren — so a typed calculation survives
 * keystroke-by-keystroke but stray characters can't be entered. A lone leading
 * `-` is kept (a negative amount, feedback #214); the text is resolved to a
 * plain number on blur/Enter via {@link commitExpression}. */
export function sanitizeLive(raw: string): string {
  return raw.replace(/,/g, ".").replace(/[^0-9.+\-*/×÷()]/g, "");
}
