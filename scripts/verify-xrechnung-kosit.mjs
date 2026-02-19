#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const vectorsPositiveDir = path.join(root, 'tests', 'xrechnung', 'vectors', 'positive');
const vectorsNegativeDir = path.join(root, 'tests', 'xrechnung', 'vectors', 'negative');
const testsuiteSamplesDir = path.join(root, 'tests', 'xrechnung', 'kosit-testsuite-samples');

const generatedRoot = path.join(root, '.tmp', 'xrechnung-kosit-fixtures');
const positiveOutDir = path.join(generatedRoot, 'positive');
const negativeOutDir = path.join(generatedRoot, 'negative');
const artifactsDir = path.join(root, '.tmp', 'artifacts', 'xrechnung-vectors');

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, { stdio: 'inherit', ...options });
}

function runCapture(cmd, args, options = {}) {
  try {
    const stdout = execFileSync(cmd, args, {
      encoding: 'utf-8',
      stdio: 'pipe',
      ...options,
    });
    return { ok: true, status: 0, stdout, stderr: '' };
  } catch (error) {
    return {
      ok: false,
      status: error?.status ?? 1,
      stdout: String(error?.stdout || ''),
      stderr: String(error?.stderr || ''),
    };
  }
}

function collectFiles(baseDir, suffix) {
  if (!existsSync(baseDir)) return [];
  const out = [];
  const stack = [baseDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.name.toLowerCase().endsWith(suffix)) out.push(fullPath);
    }
  }
  return out.sort();
}

function assertContains(content, needles, label) {
  const missing = needles.filter((n) => !content.includes(n));
  if (missing.length > 0) {
    throw new Error(`${label}: missing required XML nodes: ${missing.join(', ')}`);
  }
}

function semanticAssertsForPositiveXml(xmlFiles) {
  for (const xmlFile of xmlFiles) {
    const xml = readFileSync(xmlFile, 'utf-8');
    const isUbl = xmlFile.endsWith('_ubl.xml');
    const label = path.basename(xmlFile);

    if (isUbl) {
      assertContains(
        xml,
        [
          '<cbc:UBLVersionID>2.1</cbc:UBLVersionID>',
          '<cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>',
          '<cbc:ProfileID>',
          '<cbc:BuyerReference>',
          '<cbc:EndpointID schemeID=',
          '<cbc:PaymentMeansCode>',
          '<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>',
          '<cac:TaxTotal>',
          '<cac:LegalMonetaryTotal>',
          '<cac:InvoiceLine>',
        ],
        label
      );
    } else {
      assertContains(
        xml,
        [
          '<ram:GuidelineSpecifiedDocumentContextParameter>',
          '<ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>',
          '<ram:BuyerReference>',
          '<ram:URIID schemeID=',
          '<ram:SpecifiedTradeSettlementPaymentMeans>',
          '<ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>',
          '<ram:ApplicableHeaderTradeSettlement>',
          '<ram:SpecifiedTradeSettlementHeaderMonetarySummation>',
          '<ram:IncludedSupplyChainTradeLineItem>',
        ],
        label
      );
    }
  }
}

async function bundleGeneratorRuntime() {
  rmSync(generatedRoot, { recursive: true, force: true });
  mkdirSync(generatedRoot, { recursive: true });
  writeFileSync(
    path.join(generatedRoot, 'package.json'),
    JSON.stringify({ type: 'commonjs' }, null, 2),
    'utf-8'
  );

  const generatorPath = path.join(generatedRoot, '_gen.cjs');
  const generatorScript = `
const { generateXRechnungXml } = require('./xrechnung.cjs');
const fs = require('node:fs');
const path = require('node:path');

const inputDir = process.argv[2];
const outDir = process.argv[3];

if (!inputDir || !outDir) {
  throw new Error('Usage: node _gen.cjs <input-json-dir> <output-xml-dir>');
}

fs.mkdirSync(outDir, { recursive: true });
const files = fs
  .readdirSync(inputDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

for (const file of files) {
  const fullPath = path.join(inputDir, file);
  const payload = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  if (!payload.id || !payload.invoice) {
    throw new Error('Invalid vector file: ' + fullPath);
  }

  for (const syntax of ['ubl', 'cii']) {
    const xml = generateXRechnungXml(payload.invoice, syntax);
    fs.writeFileSync(path.join(outDir, payload.id + '_' + syntax + '.xml'), xml, 'utf-8');
  }
}
`;
  writeFileSync(generatorPath, generatorScript, 'utf-8');

  await esbuild.build({
    entryPoints: [path.join(root, 'src/lib/fin-core/xrechnung.ts')],
    outfile: path.join(generatedRoot, 'xrechnung.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: ['node22'],
    sourcemap: false,
    logLevel: 'silent',
  });

  return generatorPath;
}

function validateNegativeXmlFiles(xmlFiles) {
  let failures = 0;

  for (const xmlFile of xmlFiles) {
    const result = runCapture('node', ['scripts/kosit-validate.mjs', xmlFile], { cwd: root });
    if (result.ok) {
      failures += 1;
      console.error(`\n[NEG-FAIL] Expected validation failure but passed: ${xmlFile}`);
      continue;
    }

    console.log(`[NEG-PASS] ${xmlFile}`);
  }

  if (failures > 0) {
    throw new Error(`Negative vector validation failed for ${failures}/${xmlFiles.length} file(s).`);
  }
}

run('node', ['scripts/kosit-setup.mjs']);

if (!existsSync(vectorsPositiveDir) || !existsSync(vectorsNegativeDir)) {
  throw new Error('Vector directories missing under tests/xrechnung/vectors.');
}

const positiveVectors = collectFiles(vectorsPositiveDir, '.json');
const negativeVectors = collectFiles(vectorsNegativeDir, '.json');
if (positiveVectors.length < 5) {
  throw new Error(`Expected >=5 positive vectors. Found ${positiveVectors.length}.`);
}
if (negativeVectors.length < 3) {
  throw new Error(`Expected >=3 negative vectors. Found ${negativeVectors.length}.`);
}

const generatorPath = await bundleGeneratorRuntime();

run('node', [generatorPath, vectorsPositiveDir, positiveOutDir]);
run('node', [generatorPath, vectorsNegativeDir, negativeOutDir]);

const positiveXmlFiles = collectFiles(positiveOutDir, '.xml');
const negativeXmlFiles = collectFiles(negativeOutDir, '.xml');

if (positiveXmlFiles.length !== positiveVectors.length * 2) {
  throw new Error(
    `Expected ${positiveVectors.length * 2} positive XML files, got ${positiveXmlFiles.length}.`
  );
}
if (negativeXmlFiles.length !== negativeVectors.length * 2) {
  throw new Error(
    `Expected ${negativeVectors.length * 2} negative XML files, got ${negativeXmlFiles.length}.`
  );
}

semanticAssertsForPositiveXml(positiveXmlFiles);
console.log(`Semantic asserts passed for ${positiveXmlFiles.length} positive XML files.`);

rmSync(artifactsDir, { recursive: true, force: true });
mkdirSync(artifactsDir, { recursive: true });
for (const xmlFile of [...positiveXmlFiles, ...negativeXmlFiles]) {
  const target = path.join(artifactsDir, path.basename(xmlFile));
  writeFileSync(target, readFileSync(xmlFile));
}

console.log(`Validating positive vectors with KoSIT: ${positiveXmlFiles.length} XML files`);
run('node', ['scripts/kosit-validate.mjs', positiveOutDir]);

console.log(`Validating negative vectors with KoSIT (must fail): ${negativeXmlFiles.length} XML files`);
validateNegativeXmlFiles(negativeXmlFiles);

const sampleFiles = collectFiles(testsuiteSamplesDir, '.xml');
if (sampleFiles.length >= 5) {
  console.log(
    `Validating acceptance reference samples (EN16931 compatibility mode): ${sampleFiles.length} XML files`
  );
  run('node', ['scripts/kosit-validate.mjs', testsuiteSamplesDir], {
    env: { ...process.env, KOSIT_REQUIRE_XRECHNUNG: '0' },
  });
} else {
  console.log(
    `Skipping acceptance reference samples (found ${sampleFiles.length}, require >=5).`
  );
}

console.log('KoSIT conformance verification: PASS');
