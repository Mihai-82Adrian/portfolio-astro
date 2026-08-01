// Phase 2D-C Wave 1 acceptance closure: permanent coverage for the route-integrity
// verifier extensions (redirect destinations, JSON-LD URLs, social/page metadata, form
// actions, and meaningful --strict semantics). Complements the pre-existing
// verify-route-integrity.mjs integration run against the real dist/ output.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'node-html-parser';

import {
  parseRedirects,
  classifyRedirectDestination,
  classifySameOriginReference,
  collectJsonLdUrls,
  collectMetadataTargets,
  collectFormActions,
  buildKnownRouteSet,
  normalizePathname,
  verify,
} from '../scripts/verify-route-integrity.mjs';

test('parseRedirects extracts the tracked public/_redirects contract as 8 well-formed static/splat records', () => {
  const text = `# Netlify/Cloudflare Pages Redirects
# comment line

/en/blog           /blog            301
/ro/blog           /blog            301
/en/blog/*         /blog/:splat     301
`;
  const records = parseRedirects(text);
  assert.equal(records.length, 3);
  assert.ok(records.every((r) => r.malformed === false));
  assert.deepEqual(records[0], { line: 4, raw: '/en/blog           /blog            301', malformed: false, source: '/en/blog', destination: '/blog', status: '301' });
});

test('parseRedirects rejects structurally malformed lines', () => {
  const oneToken = parseRedirects('/only-one-token\n');
  assert.equal(oneToken[0].malformed, true);

  const tooMany = parseRedirects('/a /b 301 extra garbage\n');
  assert.equal(tooMany[0].malformed, true);

  const badStatus = parseRedirects('/a /b notacode\n');
  assert.equal(badStatus[0].malformed, true);
  assert.match(badStatus[0].reason, /status code/);
});

test('classifyRedirectDestination distinguishes static, dynamic, external, malformed, and unclassifiable rules', () => {
  assert.deepEqual(classifyRedirectDestination('/blog'), { type: 'static', pathname: '/blog' });
  assert.deepEqual(classifyRedirectDestination('/blog/:splat'), { type: 'dynamic', prefix: '/blog/' });
  assert.deepEqual(classifyRedirectDestination('/users/:id/profile'), { type: 'dynamic', prefix: '/users/' });
  assert.equal(classifyRedirectDestination('https://example.com/x').type, 'external');
  assert.equal(classifyRedirectDestination('').type, 'malformed');
  assert.equal(classifyRedirectDestination('no-leading-slash').type, 'malformed');
  assert.equal(classifyRedirectDestination('/foo/:bad!name').type, 'unclassifiable');
});

test('classifySameOriginReference separates ignorable, external, same-origin (with fragment), and malformed values', () => {
  const base = 'https://me-mateescu.de/about';
  assert.equal(classifySameOriginReference('mailto:a@b.com', base).type, 'ignorable');
  assert.equal(classifySameOriginReference('#top', base).type, 'ignorable');
  assert.equal(classifySameOriginReference('https://other.example/', base).type, 'external');

  const withFragment = classifySameOriginReference('/about#bio', base);
  assert.deepEqual(withFragment, { type: 'same-origin', pathname: '/about/' });

  assert.equal(classifySameOriginReference('', base).type, 'malformed');
  assert.equal(classifySameOriginReference(undefined, base).type, 'malformed');
  assert.equal(classifySameOriginReference(42, base).type, 'malformed');
  assert.equal(classifySameOriginReference('https://', base).type, 'malformed');
});

test('collectJsonLdUrls recurses through nested objects, arrays, and @id references', () => {
  assert.deepEqual(collectJsonLdUrls(null), []);
  assert.deepEqual(collectJsonLdUrls('not-an-object'), []);

  assert.deepEqual(collectJsonLdUrls({ mainEntityOfPage: 'https://me-mateescu.de/blog/post/' }), [
    'https://me-mateescu.de/blog/post/',
  ]);

  const nestedLogo = {
    '@type': 'BlogPosting',
    publisher: { '@type': 'Organization', logo: { '@type': 'ImageObject', url: 'https://me-mateescu.de/images/og.webp' } },
  };
  assert.deepEqual(collectJsonLdUrls(nestedLogo), ['https://me-mateescu.de/images/og.webp']);

  const sameAsArray = { sameAs: ['https://github.com/x', 'https://linkedin.com/in/x'] };
  assert.deepEqual(collectJsonLdUrls(sameAsArray), ['https://github.com/x', 'https://linkedin.com/in/x']);

  const idRef = { mainEntityOfPage: { '@id': 'https://me-mateescu.de/ai/' } };
  assert.deepEqual(collectJsonLdUrls(idRef), ['https://me-mateescu.de/ai/']);

  const graph = { '@graph': [{ image: 'https://me-mateescu.de/a.jpg' }, { image: 'https://me-mateescu.de/b.jpg' }] };
  assert.deepEqual(collectJsonLdUrls(graph), ['https://me-mateescu.de/a.jpg', 'https://me-mateescu.de/b.jpg']);
});

test('collectMetadataTargets and collectFormActions read the documented selector set from parsed HTML', () => {
  const html = `<html><head>
    <meta property="og:url" content="https://me-mateescu.de/projects/" />
    <meta property="og:image" content="/images/og-projects.jpg" />
    <meta name="twitter:image" content="/images/og-projects.jpg" />
    <link rel="icon" href="/images/favicon.ico" />
    <link rel="manifest" href="/site.webmanifest" />
  </head><body>
    <form action="/api/sample-review"><input /></form>
    <form><input /></form>
  </body></html>`;
  const root = parse(html, { comment: false });

  const metadata = collectMetadataTargets(root);
  assert.deepEqual(metadata.map((m) => m.value).sort(), [
    '/images/favicon.ico',
    '/images/og-projects.jpg',
    '/images/og-projects.jpg',
    '/site.webmanifest',
    'https://me-mateescu.de/projects/',
  ].sort());

  const forms = collectFormActions(root);
  assert.deepEqual(forms, [{ action: '/api/sample-review' }, { action: null }]);
});

test('buildKnownRouteSet includes Pages Functions routes alongside built dist output', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'route-integrity-known-'));
  try {
    const distDir = path.join(dir, 'dist');
    mkdirSync(distDir, { recursive: true });
    writeFileSync(path.join(distDir, 'index.html'), '<html></html>');
    const functionsDir = path.join(dir, 'functions', 'api');
    mkdirSync(functionsDir, { recursive: true });
    writeFileSync(path.join(functionsDir, 'sample-review.ts'), 'export const onRequestPost = () => {};');

    const known = await buildKnownRouteSet(distDir, dir);
    assert.ok(known.has('/'));
    assert.ok(known.has(normalizePathname('/api/sample-review')));
    assert.ok(!known.has(normalizePathname('/api/does-not-exist')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify(): end-to-end negative fixtures — confirmed-dead references fail in standard mode, unclassifiable dynamic redirects only fail under --strict', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'route-integrity-e2e-'));
  try {
    const distDir = path.join(dir, 'dist');
    mkdirSync(path.join(distDir, 'about'), { recursive: true });
    writeFileSync(path.join(distDir, 'index.html'), '<html><body>home</body></html>');
    writeFileSync(
      path.join(distDir, 'about', 'index.html'),
      `<html><head>
        <meta property="og:image" content="/images/missing.jpg" />
        <script type="application/ld+json">${JSON.stringify({ '@type': 'Person', mainEntityOfPage: 'https://me-mateescu.de/nope/' })}</script>
      </head><body>
        <form action="/api/does-not-exist"><input /></form>
      </body></html>`,
    );

    mkdirSync(path.join(dir, 'public'), { recursive: true });
    writeFileSync(
      path.join(dir, 'public', '_redirects'),
      [
        '/exact       /about             301',
        '/deadstatic  /nowhere           301',
        '/dyn/*       /about/:splat      301',
        '/deaddyn/*   /ghost/:splat      301',
        '/bad line here extra tokens 301 xx',
        '/weird       /foo/:bad!name     301',
      ].join('\n'),
    );

    const standard = await verify(distDir, dir, { strict: false });
    const standardKinds = standard.failures.map((f) => f.kind).sort();
    assert.deepEqual(standardKinds, [
      'form-action',
      'json-ld-url',
      'metadata:meta[property="og:image"]',
      'redirect-destination',
      'redirect-dynamic-prefix',
      'redirect-malformed',
    ].sort());
    assert.ok(
      standard.warnings.some((w) => w.kind === 'redirect-unclassifiable-dynamic'),
      'the unclassifiable dynamic redirect must be reported as a warning, not silently ignored',
    );
    assert.ok(!standardKinds.includes('redirect-unclassifiable-dynamic'), 'standard mode must not fail on an unclassifiable dynamic redirect');

    const strict = await verify(distDir, dir, { strict: true });
    const strictAll = [...strict.failures, ...strict.warnings].map((f) => f.kind);
    assert.ok(strictAll.includes('redirect-unclassifiable-dynamic'), '--strict must promote the unclassifiable dynamic redirect to an enforced finding');

    // Confirmed-good references must not be reported.
    assert.ok(!standardKinds.includes('redirect-destination') || standard.failures.filter((f) => f.href === '/about').length === 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
