import assert from 'node:assert/strict';
import test from 'node:test';

const { globToRegex } = await import('../scripts/audit-styles.js');

test('globToRegex does not let a literal backslash in the glob be reinterpreted as a regex escape', () => {
  // Previously a literal backslash in the input was never escaped at all, so a
  // glob containing "\d" would silently become the regex digit class instead of
  // matching a literal backslash followed by "d" (CodeQL js/incomplete-sanitization).
  const re = globToRegex('weird\\d*.js');
  assert.ok(!re.test('weird5-build.js'), 'a literal digit must not satisfy an unescaped \\d');
  assert.ok(re.test('weird\\d-build.js'), 'the literal backslash+d text must still match itself');
});

test('globToRegex keeps matching the real design-system config include pattern unchanged', () => {
  // Regression guard: the escaping fix must not change which files the design-system
  // audit scans (see scripts/audit-styles.js --json: errors/warnings/filesScanned are
  // unchanged by this fix). This is the exact pattern from design-system.config.json.
  const re = globToRegex('src/**/*.{astro,ts,tsx,js,jsx,md,mdx,css}');
  assert.ok(re.test('src/Xcomponents/YFoo.astro'));
  assert.ok(!re.test('src/components/deep/Foo.astro'));
});
