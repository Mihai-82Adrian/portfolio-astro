#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const temporary = path.join(ROOT, '.tmp', `pap-generation-${process.pid}`);
mkdirSync(temporary, { recursive: true });
const output = path.join(temporary, 'bmf-engine-2026.generated.ts');
try {
  execFileSync('node', [
    'scripts/parse-bmf-pap.ts',
    '--input', 'docs/Lohnsteuer2026.xml',
    '--output', path.relative(ROOT, output),
  ], { cwd: ROOT, stdio: 'inherit' });
  const tracked = await import(pathToFileURL(path.join(ROOT, 'src/lib/fin-core/bmf-engine-2026.generated.ts')));
  const generated = await import(pathToFileURL(output));
  let comparisons = 0;
  for (const STKL of [1, 2, 3, 4, 5, 6]) {
    for (const RE4 of [0, 100_000, 300_000, 600_000, 1_000_000]) {
      for (const ZKF of [0, 1, 2]) {
        const input = { STKL, RE4, LZZ: 2, ZKF };
        const expected = tracked.calculateLohnsteuerPAP(input);
        const actual = generated.calculateLohnsteuerPAP(input);
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
          throw new Error(`Generated PAP engine differs for STKL=${STKL}, RE4=${RE4}, ZKF=${ZKF}.`);
        }
        comparisons += 1;
      }
    }
  }
  console.log(`PAP generation comparison: PASS (${comparisons} reference cases)`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
