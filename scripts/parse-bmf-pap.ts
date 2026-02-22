#!/usr/bin/env npx tsx
/**
 * BMF PAP Transpiler — converts Lohnsteuer<YYYY>.xml to TypeScript engine.
 *
 * Usage:
 *   npx tsx scripts/parse-bmf-pap.ts
 *   npx tsx scripts/parse-bmf-pap.ts --input docs/Lohnsteuer2027.xml --output src/lib/fin-core/bmf-engine-2027.generated.ts
 *
 * The BMF (Bundesministerium der Finanzen) publishes the Programmablaufplan (PAP)
 * each year as an XML file. This script transpiles the Java-BigDecimal expression
 * language embedded in the XML to a pure TypeScript module with integer-safe arithmetic.
 */

import fs from 'node:fs';
import path from 'node:path';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const inputArg  = args[args.indexOf('--input')  + 1] ?? 'docs/Lohnsteuer2026.xml';
const outputArg = args[args.indexOf('--output') + 1] ?? 'src/lib/fin-core/bmf-engine-2026.generated.ts';

const root    = path.resolve(process.cwd());
const xmlPath = path.join(root, inputArg);
const outPath = path.join(root, outputArg);

// ── ZAHL constants inline map ─────────────────────────────────────────────────
const ZAHLEN: Record<string, string> = {
  ZAHL1: '1', ZAHL2: '2', ZAHL5: '5', ZAHL7: '7', ZAHL12: '12',
  ZAHL100: '100', ZAHL360: '360', ZAHL500: '500', ZAHL700: '700',
  ZAHL1000: '1000', ZAHL10000: '10000',
};

// ── Expression transformer ────────────────────────────────────────────────────

/** Find the index of the last `.method(` at parenthesis depth 0. */
function lastMethodDot(expr: string): number {
  let depth = 0;
  let lastDot = -1;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === '.' && depth === 0) {
      // Verify it's a method call (letter + eventual '(')
      const rest = expr.slice(i + 1);
      if (/^[a-zA-Z]\w*\s*\(/.test(rest)) lastDot = i;
    }
  }
  return lastDot;
}

/** Split comma-delimited args respecting nested parens. */
function splitArgs(raw: string): string[] {
  const result: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i <= raw.length; i++) {
    if (i === raw.length || (raw[i] === ',' && depth === 0)) {
      const a = raw.slice(start, i).trim();
      if (a) result.push(a);
      start = i + 1;
    } else if ('(['.includes(raw[i])) depth++;
    else if ('])'.includes(raw[i])) depth--;
  }
  return result;
}

/** Find balanced closing paren for opener at position `open`. */
function findClose(expr: string, open: number): number {
  let depth = 0;
  for (let i = open; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') { depth--; if (depth === 0) return i; }
  }
  return expr.length - 1;
}

/** Prefix a bare uppercase identifier (variable) with `s.` */
function prefixVar(name: string): string {
  // Skip: numeric literals, known JS globals, TABn (already expanded)
  if (/^\d/.test(name)) return name;
  if (['Math', 'true', 'false'].includes(name)) return name;
  if (/^TAB\d+$/.test(name)) return name;
  // Lowercase single-letter variables used in PAP: f, af
  return `s.${name}`;
}

/** Main expression transformer: Java BigDecimal → TypeScript number arithmetic */
function tx(raw: string): string {
  let e = raw.trim();

  // 1. BigDecimal rounding mode strings
  e = e.replace(/BigDecimal\.ROUND_DOWN/g, "'DOWN'")
       .replace(/BigDecimal\.ROUND_UP/g, "'UP'");

  // 2. BigDecimal literal constants
  e = e.replace(/BigDecimal\.ZERO/g, '0')
       .replace(/BigDecimal\.ONE/g, '1');

  // 3. BigDecimal.valueOf(x) — recurse on the inner value
  e = e.replace(/BigDecimal\.valueOf\(([^)]+)\)/g, (_m, inner) => `(${tx(inner.trim())})`);

  // 4. Inline ZAHL constants
  for (const [k, v] of Object.entries(ZAHLEN)) {
    e = e.replace(new RegExp(`\\b${k}\\b`, 'g'), v);
  }

  // 5. Array access: TABn[VAR] → TABn[s.VAR]
  e = e.replace(/\b(TAB\d)\[([A-Z][A-Z0-9]*)\]/g, (_m, tbl, idx) => `${tbl}[s.${idx}]`);

  // 6. Remove redundant outer parens enclosing the full expression
  while (e.startsWith('(')) {
    const close = findClose(e, 0);
    if (close === e.length - 1) { e = e.slice(1, -1).trim(); } else break;
  }

  // 7. Find last method call at depth 0
  const dot = lastMethodDot(e);
  if (dot === -1) {
    // Leaf — prefix uppercase variable names
    return e.replace(/\b([A-Za-z][A-Z0-9_a-z]*)\b/g, (m) => {
      if (/^\d/.test(m) || ['Math','true','false','null','undefined'].includes(m)) return m;
      if (/^TAB\d$/.test(m)) return m;
      if (/^[A-Z_][A-Z0-9_]*$/.test(m) || m === 'f' || m === 'af') return prefixVar(m);
      if (/^-?\d+(\.\d+)?$/.test(m)) return m;
      return m;
    });
  }

  const base = e.slice(0, dot);
  const rest = e.slice(dot + 1);
  const parenIdx = rest.indexOf('(');
  const method = rest.slice(0, parenIdx).trim();
  const closeIdx = findClose(rest, parenIdx);
  const argsRaw = rest.slice(parenIdx + 1, closeIdx);

  const tBase = tx(base);
  const tArgs = splitArgs(argsRaw).map(a => tx(a));

  switch (method) {
    case 'add':       return `(${tBase} + ${tArgs[0]})`;
    case 'subtract':  return `(${tBase} - ${tArgs[0]})`;
    case 'multiply':  return `(${tBase} * ${tArgs[0]})`;
    case 'divide':
      if (tArgs.length === 1) return `(${tBase} / ${tArgs[0]})`;
      return `_div(${tBase}, ${tArgs[0]}, ${tArgs[1]}, ${tArgs[2]})`;
    case 'setScale':
      return `_scale(${tBase}, ${tArgs[0]}, ${tArgs[1] ?? "'DOWN'"})`;
    case 'compareTo': return `_cmp(${tBase}, ${tArgs[0]})`;
    case 'intValue':
    case 'longValue': return `Math.trunc(${tBase})`;
    default:          return `/* UNKNOWN:${method} */(${tBase})`;
  }
}

/** Transform a Java boolean condition (IF expr) to TypeScript */
function txCond(cond: string): string {
  // Split on && / || at depth 0
  const tokens: Array<{ expr: string; op?: string }> = [];
  let depth = 0, start = 0;
  for (let i = 0; i < cond.length; i++) {
    if ('(['.includes(cond[i])) depth++;
    else if ('])'.includes(cond[i])) depth--;
    else if (depth === 0) {
      const two = cond.slice(i, i + 2);
      if (two === '&&' || two === '||') {
        tokens.push({ expr: cond.slice(start, i).trim(), op: two });
        start = i + 2;
      }
    }
  }
  tokens.push({ expr: cond.slice(start).trim() });

  const parts = tokens.map(({ expr, op }) => {
    const s = txSingleCond(expr);
    return op ? `${s} ${op} ` : s;
  });
  return parts.join('');
}

/** Transform a single (non-compound) condition */
function txSingleCond(cond: string): string {
  cond = cond.trim();

  // Find .compareTo( at depth 0
  let depth = 0;
  let ctStart = -1;
  for (let i = 0; i < cond.length; i++) {
    if ('(['.includes(cond[i])) depth++;
    else if ('])'.includes(cond[i])) depth--;
    else if (depth === 0 && cond.slice(i).startsWith('.compareTo(')) {
      ctStart = i;
      break;
    }
  }

  if (ctStart !== -1) {
    const lhsRaw = cond.slice(0, ctStart);
    const afterCT = cond.slice(ctStart + '.compareTo('.length);
    const closeIdx = findClose(afterCT, -1 /* start before idx */ + 0);
    // Find the matching ) for compareTo(
    let d = 1, ci = -1;
    for (let i = 0; i < afterCT.length; i++) {
      if (afterCT[i] === '(') d++;
      else if (afterCT[i] === ')') { d--; if (d === 0) { ci = i; break; } }
    }
    const rhsRaw = afterCT.slice(0, ci);
    const opStr = afterCT.slice(ci + 1).trim();

    const lhs = tx(lhsRaw);
    const rhs = tx(rhsRaw);

    const m = opStr.match(/^(==|!=|>=|<=|>|<)\s*(-?\d+)/);
    if (m) {
      const [, op, lit] = m;
      if (op === '==' && lit === '1')  return `${lhs} > ${rhs}`;
      if (op === '==' && lit === '-1') return `${lhs} < ${rhs}`;
      if (op === '==' && lit === '0')  return `${lhs} === ${rhs}`;
      if (op === '!=' && lit === '0')  return `${lhs} !== ${rhs}`;
      if (op === '>=' && lit === '0')  return `${lhs} >= ${rhs}`;
      if (op === '<=' && lit === '0')  return `${lhs} <= ${rhs}`;
      if (op === '>'  && lit === '0')  return `${lhs} > ${rhs}`;
      if (op === '<'  && lit === '0')  return `${lhs} < ${rhs}`;
    }
    return `_cmp(${lhs}, ${rhs}) /* ${opStr} */`;
  }

  // Plain int comparison e.g. "LZZ == 2"
  const intCmp = cond.match(/^([A-Za-z][A-Za-z0-9_]*)\s*(==|!=|>=|<=|>|<)\s*(-?\d+)$/);
  if (intCmp) {
    const [, varName, op, lit] = intCmp;
    const jsOp = op === '==' ? '===' : op === '!=' ? '!==' : op;
    return `s.${varName} ${jsOp} ${lit}`;
  }

  // Fallback: full expression transform
  return tx(cond);
}

// ── XML node types ─────────────────────────────────────────────────────────────
type Node =
  | { kind: 'eval';    exec: string }
  | { kind: 'execute'; method: string }
  | { kind: 'if';      expr: string; then: Node[]; else_: Node[] }
  | { kind: 'nop' };

// ── Minimal XML parser for PAP structure ──────────────────────────────────────
function parseXml(xml: string): { methods: Map<string, Node[]>; mainFlow: Node[] } {
  // Strip comments
  xml = xml.replace(/<!--[\s\S]*?-->/g, '');

  const methods = new Map<string, Node[]>();
  let mainFlow: Node[] = [];

  // Extract <MAIN>...</MAIN>
  const mainMatch = xml.match(/<MAIN>([\s\S]*?)<\/MAIN>/);
  if (mainMatch) mainFlow = parseNodes(mainMatch[1]);

  // Extract all <METHOD name="...">...</METHOD>
  const methodRe = /<METHOD\s+name="([^"]+)">([\s\S]*?)<\/METHOD>/g;
  let m: RegExpExecArray | null;
  while ((m = methodRe.exec(xml)) !== null) {
    methods.set(m[1], parseNodes(m[2]));
  }

  return { methods, mainFlow };
}

function parseNodes(xml: string): Node[] {
  const nodes: Node[] = [];
  let i = 0;

  function skipWs() { while (i < xml.length && /\s/.test(xml[i])) i++; }

  function readTag(): Node | null {
    skipWs();
    if (i >= xml.length) return null;
    if (!xml.startsWith('<', i)) return null;

    // EVAL
    const evalM = xml.slice(i).match(/^<EVAL\s+exec="([^"]+)"\s*\/>/);
    if (evalM) { i += evalM[0].length; return { kind: 'eval', exec: evalM[1] }; }

    // EXECUTE
    const execM = xml.slice(i).match(/^<EXECUTE\s+method="([^"]+)"\s*\/>/);
    if (execM) { i += execM[0].length; return { kind: 'execute', method: execM[1] }; }

    // IF
    const ifM = xml.slice(i).match(/^<IF\s+expr="([^"]+)">/);
    if (ifM) {
      i += ifM[0].length;
      const thenNodes: Node[] = [];
      const elseNodes: Node[] = [];

      // <THEN>
      skipWs();
      if (xml.slice(i).startsWith('<THEN>')) {
        i += '<THEN>'.length;
        while (i < xml.length && !xml.slice(i).trimStart().startsWith('</THEN>')) {
          skipWs();
          const n = readTag();
          if (n) thenNodes.push(n);
          else break;
        }
        skipWs();
        if (xml.slice(i).trimStart().startsWith('</THEN>')) {
          i = xml.indexOf('</THEN>', i) + '</THEN>'.length;
        }
      }
      // Optional <ELSE>
      skipWs();
      if (xml.slice(i).trimStart().startsWith('<ELSE>')) {
        i = xml.indexOf('<ELSE>', i) + '<ELSE>'.length;
        while (i < xml.length && !xml.slice(i).trimStart().startsWith('</ELSE>')) {
          skipWs();
          const n = readTag();
          if (n) elseNodes.push(n);
          else break;
        }
        skipWs();
        if (xml.slice(i).trimStart().startsWith('</ELSE>')) {
          i = xml.indexOf('</ELSE>', i) + '</ELSE>'.length;
        }
      }
      // </IF>
      skipWs();
      if (xml.slice(i).trimStart().startsWith('</IF>')) {
        i = xml.indexOf('</IF>', i) + '</IF>'.length;
      }
      return { kind: 'if', expr: ifM[1], then: thenNodes, else_: elseNodes };
    }

    // Skip unrecognised / closing tags
    const closeM = xml.slice(i).match(/^<\/?\w[^>]*>/);
    if (closeM) { i += closeM[0].length; return null; }

    i++; return null;
  }

  while (i < xml.length) {
    skipWs();
    if (i >= xml.length) break;
    if (!xml.slice(i).trimStart().startsWith('<')) { i++; continue; }
    // Position at <
    const lt = xml.indexOf('<', i);
    if (lt === -1) break;
    i = lt;
    const node = readTag();
    if (node) nodes.push(node);
  }
  return nodes;
}

// ── Code generator ────────────────────────────────────────────────────────────
function emitNodes(nodes: Node[], indent = 2): string {
  const pad = ' '.repeat(indent);
  return nodes.map(node => {
    switch (node.kind) {
      case 'eval': {
        const eq = node.exec.indexOf('=');
        const lhs = node.exec.slice(0, eq).trim();
        const rhs = node.exec.slice(eq + 1).trim();
        return `${pad}s.${lhs} = ${tx(rhs)};`;
      }
      case 'execute':
        return `${pad}${node.method}(s);`;
      case 'if': {
        const cond = txCond(node.expr);
        let out = `${pad}if (${cond}) {\n`;
        out += emitNodes(node.then, indent + 2);
        if (node.else_.length > 0) {
          out += `\n${pad}} else {\n`;
          out += emitNodes(node.else_, indent + 2);
        }
        out += `\n${pad}}`;
        return out;
      }
      case 'nop':
        return `${pad}/* NOP */`;
    }
  }).join('\n');
}

function emitMethod(name: string, nodes: Node[]): string {
  return `function ${name}(s: S): void {\n${emitNodes(nodes, 2)}\n}\n`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const xml = fs.readFileSync(xmlPath, 'utf-8');
const { methods, mainFlow } = parseXml(xml);

// Extract constant tables from XML
function extractTable(xml: string, name: string): string {
  const re = new RegExp(`<CONSTANT name="${name}"[^>]+value="\\{([^}]+)\\}"`);
  const m = xml.match(re);
  if (!m) return '[]';
  const vals = m[1]
    .split(',')
    .map(v => v.trim().replace(/BigDecimal\.valueOf\(\s*([\d.]+)\s*\)/g, '$1').replace(/BigDecimal\.ZERO/g, '0'))
    .join(', ');
  return `[${vals}]`;
}

const TAB1 = extractTable(xml, 'TAB1');
const TAB2 = extractTable(xml, 'TAB2');
const TAB3 = extractTable(xml, 'TAB3');
const TAB4 = extractTable(xml, 'TAB4');
const TAB5 = extractTable(xml, 'TAB5');

// Extract PAP name/version for banner
const papName = (xml.match(/PAP name="([^"]+)"/) ?? [])[1] ?? 'Unknown';
const papVer  = (xml.match(/versionNummer="([^"]+)"/) ?? [])[1] ?? '?';

const output = `// ============================================================
// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Source : ${path.basename(xmlPath)}  (PAP: ${papName} v${papVer})
// Generator: scripts/parse-bmf-pap.ts
// Regenerate: npx tsx scripts/parse-bmf-pap.ts
// ============================================================
// Implements the BMF Programmablaufplan (PAP) for German wage tax (Lohnsteuer).
// All monetary inputs/outputs are in EUROCENTS (integer).
// Arithmetic uses truncation-toward-zero (ROUND_DOWN) and away-from-zero (ROUND_UP)
// to match Java BigDecimal semantics exactly.

// ── Arithmetic helpers ──────────────────────────────────────────────────────

/** Divide a/b, round to the given number of decimal places using BigDecimal.ROUND_DOWN
 *  (truncation toward zero) or ROUND_UP (away from zero). */
function _div(a: number, b: number, scale: number, mode: 'DOWN' | 'UP' = 'DOWN'): number {
  const raw = a / b;
  const factor = 10 ** scale;
  if (mode === 'DOWN') return Math.trunc(raw * factor) / factor;
  const t = raw * factor;
  return (t >= 0 ? Math.ceil(t) : Math.floor(t)) / factor;
}

/** setScale shorthand: _scale(x, n) = _div(x, 1, n) */
function _scale(a: number, scale: number, mode: 'DOWN' | 'UP' = 'DOWN'): number {
  return _div(a, 1, scale, mode);
}

/** compareTo: returns -1 / 0 / 1 (unused at runtime, kept for type-checking) */
function _cmp(a: number, b: number): number { return a < b ? -1 : a > b ? 1 : 0; }

// ── Constant lookup tables (§ 19 Abs. 2 EStG — Versorgungsfreibetrag / §24a) ─
const TAB1: number[] = ${TAB1};
const TAB2: number[] = ${TAB2};
const TAB3: number[] = ${TAB3};
const TAB4: number[] = ${TAB4};
const TAB5: number[] = ${TAB5};

// ── State type ──────────────────────────────────────────────────────────────
export interface PAP2026Inputs {
  af: number; AJAHR: number; ALTER1: number; ALV: number; f: number;
  JFREIB: number; JHINZU: number; JRE4: number; JRE4ENT: number; JVBEZ: number;
  KRV: number; KVZ: number; LZZ: number; LZZFREIB: number; LZZHINZU: number;
  MBV: number; PKPV: number; PKPVAGZ: number; PKV: number; PVA: number;
  PVS: number; PVZ: number; R: number; RE4: number; SONSTB: number;
  SONSTENT: number; STERBE: number; STKL: number; VBEZ: number; VBEZM: number;
  VBEZS: number; VBS: number; VJAHR: number; ZKF: number; ZMVB: number;
}
export interface PAP2026Outputs {
  BK: number; BKS: number; LSTLZZ: number; SOLZLZZ: number; STS: number; SOLZS: number;
  VFRB: number; VFRBS1: number; VFRBS2: number; WVFRB: number; WVFRBO: number; WVFRBM: number;
}
interface S extends PAP2026Inputs, PAP2026Outputs {
  ALTE: number; ANP: number; ANTEIL1: number; AVSATZAN: number; BBGKVPV: number;
  BBGRVALV: number; BMG: number; DIFF: number; EFA: number; FVB: number;
  FVBSO: number; FVBZ: number; FVBZSO: number; GFB: number; HBALTE: number;
  HFVB: number; HFVBZ: number; HFVBZSO: number; HOCH: number; J: number;
  JBMG: number; JLFREIB: number; JLHINZU: number; JW: number; K: number;
  KFB: number; KVSATZAN: number; KZTAB: number; LSTJAHR: number; LSTOSO: number;
  LSTSO: number; MIST: number; PKPVAGZJ: number; PVSATZAN: number;
  RVSATZAN: number; RW: number; SAP: number; SOLZFREI: number; SOLZJ: number;
  SOLZMIN: number; SOLZSBMG: number; SOLZSZVE: number; ST: number; ST1: number;
  ST2: number; VBEZB: number; VBEZBSO: number; VERGL: number; VSPALV: number;
  VSPKVPV: number; VSPHB: number; VSPR: number; VSP: number; VSPN: number;
  W1STKL5: number; W2STKL5: number; W3STKL5: number; X: number; Y: number;
  ZRE4: number; ZRE4J: number; ZRE4VP: number; ZRE4VPR: number; ZTABFB: number;
  ZVBEZ: number; ZVBEZJ: number; ZVE: number; ZX: number; ZZX: number;
}

// ── PAP methods (auto-generated) ────────────────────────────────────────────
${Array.from(methods.entries()).map(([name, nodes]) => emitMethod(name, nodes)).join('\n')}

// ── Public API ──────────────────────────────────────────────────────────────
export function calculateLohnsteuerPAP(inputs: Partial<PAP2026Inputs>): PAP2026Outputs {
  const s: S = {
    af: 1, AJAHR: 0, ALTER1: 0, ALV: 0, f: 1.0,
    JFREIB: 0, JHINZU: 0, JRE4: 0, JRE4ENT: 0, JVBEZ: 0,
    KRV: 0, KVZ: 0, LZZ: 1, LZZFREIB: 0, LZZHINZU: 0,
    MBV: 0, PKPV: 0, PKPVAGZ: 0, PKV: 0, PVA: 0,
    PVS: 0, PVZ: 0, R: 0, RE4: 0, SONSTB: 0,
    SONSTENT: 0, STERBE: 0, STKL: 1, VBEZ: 0, VBEZM: 0,
    VBEZS: 0, VBS: 0, VJAHR: 0, ZKF: 0, ZMVB: 0,
    ...inputs,
    // Outputs (reset)
    BK: 0, BKS: 0, LSTLZZ: 0, SOLZLZZ: 0, STS: 0, SOLZS: 0,
    VFRB: 0, VFRBS1: 0, VFRBS2: 0, WVFRB: 0, WVFRBO: 0, WVFRBM: 0,
    // Internals (reset)
    ALTE: 0, ANP: 0, ANTEIL1: 0, AVSATZAN: 0, BBGKVPV: 0,
    BBGRVALV: 0, BMG: 0, DIFF: 0, EFA: 0, FVB: 0,
    FVBSO: 0, FVBZ: 0, FVBZSO: 0, GFB: 0, HBALTE: 0,
    HFVB: 0, HFVBZ: 0, HFVBZSO: 0, HOCH: 0, J: 0,
    JBMG: 0, JLFREIB: 0, JLHINZU: 0, JW: 0, K: 0,
    KFB: 0, KVSATZAN: 0, KZTAB: 0, LSTJAHR: 0, LSTOSO: 0,
    LSTSO: 0, MIST: 0, PKPVAGZJ: 0, PVSATZAN: 0,
    RVSATZAN: 0, RW: 0, SAP: 0, SOLZFREI: 0, SOLZJ: 0,
    SOLZMIN: 0, SOLZSBMG: 0, SOLZSZVE: 0, ST: 0, ST1: 0,
    ST2: 0, VBEZB: 0, VBEZBSO: 0, VERGL: 0, VSPALV: 0,
    VSPKVPV: 0, VSPHB: 0, VSPR: 0, VSP: 0, VSPN: 0,
    W1STKL5: 0, W2STKL5: 0, W3STKL5: 0, X: 0, Y: 0,
    ZRE4: 0, ZRE4J: 0, ZRE4VP: 0, ZRE4VPR: 0, ZTABFB: 0,
    ZVBEZ: 0, ZVBEZJ: 0, ZVE: 0, ZX: 0, ZZX: 0,
  };

  // Main flow: ${mainFlow.map(n => n.kind === 'execute' ? (n as any).method : n.kind).join(' → ')}
  MPARA(s);
  MRE4JL(s);
  s.VBEZBSO = 0;
  MRE4(s);
  MRE4ABZ(s);
  MBERECH(s);
  MSONST(s);

  return {
    LSTLZZ: s.LSTLZZ, SOLZLZZ: s.SOLZLZZ,
    BK: s.BK, BKS: s.BKS, STS: s.STS, SOLZS: s.SOLZS,
    VFRB: s.VFRB, VFRBS1: s.VFRBS1, VFRBS2: s.VFRBS2,
    WVFRB: s.WVFRB, WVFRBO: s.WVFRBO, WVFRBM: s.WVFRBM,
  };
}
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`✅  Generated: ${path.relative(root, outPath)}`);
console.log(`    Methods: ${methods.size} | Main flow nodes: ${mainFlow.length}`);
