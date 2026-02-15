
import { test } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const AUDIT_SCRIPT = '.agent/skills/content-architect/scripts/audit-content.mjs';
const EXPORT_SCRIPT = '.agent/skills/content-architect/scripts/export-corpus.mjs';

test('Audit Script - JSON Output', (t) => {
    try {
        const output = execSync(`node ${AUDIT_SCRIPT} --format=json`, { encoding: 'utf-8' });
        const results = JSON.parse(output);
        assert(Array.isArray(results), 'Output should be an array');
        assert(results.length > 0, 'Should have results');
        assert(results[0].file, 'Result should have file path');
        assert(Array.isArray(results[0].messages), 'Result should have messages array');
    } catch (e) {
        assert.fail(`JSON output test failed: ${e.message}`);
    }
});

test('Export Corpus - Determinism', (t) => {
    try {
        // Run export twice
        execSync(`node ${EXPORT_SCRIPT}`);
        const corpus1 = fs.readFileSync('dist/corpus.jsonl', 'utf-8');

        execSync(`node ${EXPORT_SCRIPT}`);
        const corpus2 = fs.readFileSync('dist/corpus.jsonl', 'utf-8');

        assert.strictEqual(corpus1, corpus2, 'Corpus generation must be deterministic');

        // Validate JSONL format
        const lines = corpus1.trim().split('\n');
        assert(lines.length > 0, 'Corpus should not be empty');

        const firstDoc = JSON.parse(lines[0]);
        assert(firstDoc.id, 'Document must have ID');
        assert(firstDoc.url, 'Document must have URL');
        assert(firstDoc.text, 'Document must have text');
        assert(firstDoc.metadata, 'Document must have metadata');

        // Check ID format
        assert.match(firstDoc.id, /^[a-z]+:[a-z]+:[a-z0-9-]+(:[a-z0-9-]+)?$/, 'ID should match expected format (type:lang:slug[:section])');

    } catch (e) {
        assert.fail(`Export test failed: ${e.message}`);
    }
});
