#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const targetArg = process.argv[2];
if (!targetArg) {
  console.error('Usage: node scripts/kosit-validate.mjs <xml-file-or-folder>');
  process.exit(2);
}

const metadataPath = path.join(root, 'tools', 'kosit', 'runtime', 'metadata.json');
if (!existsSync(metadataPath)) {
  console.error('KoSIT runtime metadata missing. Run: npm run kosit:setup');
  process.exit(2);
}

const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
const jarPath = path.join(root, metadata.validator.jarPath);
const scenariosPath = path.join(root, metadata.xrechnungConfig.scenariosPath);
const configDir = path.dirname(scenariosPath);
if (!existsSync(jarPath) || !existsSync(scenariosPath)) {
  console.error('KoSIT runtime incomplete. Re-run: npm run kosit:setup');
  process.exit(2);
}

const targetPath = path.resolve(root, targetArg);
if (!existsSync(targetPath)) {
  console.error(`Target not found: ${targetPath}`);
  process.exit(2);
}

function collectXmlFiles(inputPath) {
  const st = statSync(inputPath);
  if (st.isFile()) {
    return [inputPath];
  }
  const out = [];
  const stack = [inputPath];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.name.toLowerCase().endsWith('.xml')) {
        out.push(fullPath);
      }
    }
  }
  return out.sort();
}

function readLogTail(logText, maxLines = 20) {
  return logText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-maxLines);
}

function hasRejectSignals(output) {
  const lowered = output.toLowerCase();
  if (lowered.includes('validation failed')) {
    return true;
  }

  const rejectedMatch = output.match(/Rejected:\s*(\d+)/i);
  if (rejectedMatch && Number.parseInt(rejectedMatch[1], 10) > 0) {
    return true;
  }

  return false;
}

function readMatchedScenarioName(reportDir) {
  const reportFile = readdirSync(reportDir)
    .filter((name) => name.endsWith('-report.xml'))
    .sort()[0];

  if (!reportFile) {
    return '';
  }

  const xml = readFileSync(path.join(reportDir, reportFile), 'utf-8');
  const match = xml.match(/<rep:scenarioMatched>[\s\S]*?<s:name>([^<]+)<\/s:name>/);
  return match?.[1]?.trim() || '';
}

const xmlFiles = collectXmlFiles(targetPath);
if (xmlFiles.length === 0) {
  console.error(`No XML files found in: ${targetPath}`);
  process.exit(2);
}

const reportRoot = path.join(root, '.tmp', 'kosit-report');
rmSync(reportRoot, { recursive: true, force: true });
mkdirSync(reportRoot, { recursive: true });

let failures = 0;
const requireXRechnung = process.env.KOSIT_REQUIRE_XRECHNUNG !== '0';

for (const file of xmlFiles) {
  const reportDir = path.join(
    reportRoot,
    path.basename(file).replaceAll(/[^a-zA-Z0-9-_]/g, '_')
  );
  mkdirSync(reportDir, { recursive: true });

  let output = '';
  let success = false;

  const classpath = `${jarPath}:${path.join(path.dirname(jarPath), 'libs', '*')}`;
  const commandVariants = [
    [
      '-cp',
      classpath,
      'de.kosit.validationtool.cmd.CommandLineApplication',
      '-s',
      scenariosPath,
      '-r',
      configDir,
      '-o',
      reportDir,
      file,
    ],
    [
      '-cp',
      classpath,
      'de.kosit.validationtool.cmd.CommandLineApplication',
      '-s',
      scenariosPath,
      '-r',
      configDir,
      '--output-directory',
      reportDir,
      file,
    ],
  ];

  for (const args of commandVariants) {
    try {
      output = execFileSync('java', args, {
        encoding: 'utf-8',
      });
      success = true;
      break;
    } catch (error) {
      output = `${error.stdout || ''}\n${error.stderr || ''}`;
      if (error?.status === 0) {
        success = true;
        break;
      }
    }
  }

  const failedByOutput = hasRejectSignals(output);
  const scenarioName = readMatchedScenarioName(reportDir);
  const failedByScenario = requireXRechnung && !scenarioName.includes('XRechnung');

  if (!success || failedByOutput || failedByScenario) {
    failures += 1;
    console.error(`\n[FAIL] ${file}`);
    if (failedByScenario) {
      console.error(
        `Scenario mismatch: expected XRechnung scenario, got "${scenarioName || 'unknown'}".`
      );
      console.error('Hint: set CustomizationID/Profile to XRechnung CIUS values.');
    }
    for (const line of readLogTail(output, 20)) {
      console.error(line);
    }
    continue;
  }

  console.log(`[PASS] ${file}${scenarioName ? ` (scenario: ${scenarioName})` : ''}`);
}

if (failures > 0) {
  console.error(`\nKoSIT validation failed for ${failures}/${xmlFiles.length} file(s).`);
  console.error(`Report directory: ${reportRoot}`);
  process.exit(1);
}

console.log(`\nKoSIT validation passed for ${xmlFiles.length} file(s).`);
