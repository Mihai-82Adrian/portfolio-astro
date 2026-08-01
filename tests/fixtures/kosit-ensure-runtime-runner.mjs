#!/usr/bin/env node
// Test fixture: runs ensureRuntime() once in its own process so the concurrency test
// can launch two real, independent processes racing for the same cache/version lock.
import { ensureRuntime, loadManifest } from '../../scripts/kosit-cache.mjs';

const [, , cacheRoot, kind] = process.argv;
const manifest = loadManifest();
const dir = ensureRuntime(cacheRoot, manifest, kind);
process.stdout.write(dir);
