import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html>', {
  url: 'https://me-mateescu.de/tools/founder-compass',
  runScripts: 'dangerously',
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;

const { renderReportMarkdown } = await import(
  '../src/lib/security/report-markdown.ts'
);

function render(markdown) {
  const html = renderReportMarkdown(markdown);
  const container = document.createElement('div');
  container.innerHTML = html;
  return { html, container };
}

const negativeCorpus = [
  `<script>window.__reportViewSecurityMarker='script'</script>`,
  `<img src=x onerror="window.__reportViewSecurityMarker='onerror'">`,
  `<svg onload="window.__reportViewSecurityMarker='svg'"></svg>`,
  `<iframe srcdoc="<script>parent.__reportViewSecurityMarker='iframe'</script>"></iframe>`,
  `[unsafe](javascript:window.__reportViewSecurityMarker='javascript-url')`,
  `[mixed](JaVaScRiPt:alert(1))`,
  `[newline](java%0ascript:alert(1))`,
  `[percent](javascript%3Aalert(1))`,
  `<a href="&#x6a;avascript&#x3a;alert(1)">entity</a>`,
  `[data](data:text/html,<script>alert(1)</script>)`,
  `[vbscript](vbscript:alert(1))`,
  `<img src=x onerror=window.__reportViewSecurityMarker='unquoted'>`,
  `<object data="data:text/html,<script>alert(1)</script>"></object>`,
  `<embed src="data:text/html,<script>alert(1)</script>">`,
  `<form action="javascript:alert(1)"><input><button formaction="javascript:alert(1)">go</button></form>`,
  `<svg><foreignObject><p onload="alert(1)">svg</p></foreignObject></svg>`,
  `<math><mtext><img src=x onerror=alert(1)></mtext></math>`,
  `<p style="background:url(javascript:alert(1))">styled</p>`,
  `<svg><p><style><img src=x onerror=alert(1)></style></p></svg>`,
  `<math><mtext></form><form><mglyph><style></math><img src=x onerror=alert(1)>`,
  `![tracking pixel](https://attacker.invalid/pixel.gif)`,
];

test('removes the complete dangerous structure corpus', () => {
  const { html, container } = render(negativeCorpus.join('\n\n'));

  assert.equal(
    container.querySelector(
      'script,img,svg,math,iframe,object,embed,form,input,button,style,video,audio,source,picture'
    ),
    null
  );
  for (const element of container.querySelectorAll('*')) {
    for (const attribute of element.getAttributeNames()) {
      assert.doesNotMatch(attribute, /^on/i);
      assert.ok(!['style', 'class', 'id', 'name', 'src', 'srcset'].includes(attribute));
    }
  }
  assert.doesNotMatch(html, /(?:javascript|vbscript|data|file|blob)\s*:/i);
  assert.match(container.textContent, /unsafe/);
  assert.match(container.textContent, /tracking pixel/);
});

test('never executes attacker markers when inserted into a DOM', () => {
  delete window.__reportViewSecurityMarker;
  const { container } = render(negativeCorpus.join('\n\n'));
  document.body.replaceChildren(container);
  for (const element of document.body.querySelectorAll('*')) {
    element.dispatchEvent(new window.Event('error'));
    element.dispatchEvent(new window.Event('load'));
  }
  assert.equal(window.__reportViewSecurityMarker, undefined);
});

test('preserves supported report Markdown and maps embedded headings', () => {
  const markdown = `# Eins\n\n## Zwei\n\n### Drei\n\n#### Vier\n\nAbsatz mit **fett**, *kursiv* und \`code\`.\n\n- Punkt\n- Zweiter\n\n1. Erstens\n2. Zweitens\n\n> Zitat\n\n\`\`\`js\nconst safe = true;\n\`\`\`\n\n---\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n[Relativ](../services) [Root](/tools) [Fragment](#eins) [Extern](https://example.com/path?q=1 "Titel")\n\nDeutsch, English și română: Gründer, analysis, încredere.`;
  const { container } = render(markdown);

  assert.deepEqual(
    [...container.querySelectorAll('h2,h3,h4')].map((heading) => heading.tagName),
    ['H2', 'H3', 'H4', 'H4']
  );
  assert.equal(container.querySelector('h1'), null);
  for (const selector of ['p', 'strong', 'em', 'code', 'ul', 'ol', 'blockquote', 'pre', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td']) {
    assert.ok(container.querySelector(selector), `missing ${selector}`);
  }
  assert.match(container.textContent, /Deutsch, English și română/);
});

test('applies the explicit safe-link policy', () => {
  const { container } = render(
    `[relative](guide/start) [parent](../services) [root](/tools) [fragment](#part) [same](https://me-mateescu.de/about) [external](https://example.com/) [http](http://example.com/) [protocol-relative](//example.com/) [mail](mailto:test@example.com) [bad](javascript:alert(1))`
  );
  const links = Object.fromEntries(
    [...container.querySelectorAll('a')].map((link) => [link.textContent, link])
  );

  for (const label of ['relative', 'parent', 'root', 'fragment', 'same']) {
    assert.ok(links[label]);
    assert.equal(links[label].hasAttribute('target'), false);
  }
  for (const label of ['external', 'http']) {
    assert.equal(links[label].target, '_blank');
    assert.equal(links[label].rel, 'noopener noreferrer');
  }
  for (const label of ['protocol-relative', 'mail', 'bad']) {
    assert.equal(links[label], undefined);
    assert.match(container.textContent, new RegExp(label));
  }
});

test('rejects canonicalized protocol obfuscation while preserving labels', () => {
  const rejected = [
    '[numeric](&#x6a;avascript:alert(1))',
    '[named](javascript&colon;alert(1))',
    '[tab](java&#x09;script:alert(1))',
    '[percent](%6a%61%76%61%73%63%72%69%70%74%3Aalert(1))',
    '[double](javascript%253Aalert(1))',
    '[triple](javascript%25253Aalert(1))',
  ];

  for (const markdown of rejected) {
    const { container } = render(markdown);
    assert.equal(container.querySelector('a'), null, markdown);
    assert.ok(container.textContent.trim(), markdown);
  }
});

test('normalizes defensively and renders deterministically', () => {
  assert.equal(renderReportMarkdown(''), '');
  assert.equal(renderReportMarkdown(null), '');
  assert.equal(renderReportMarkdown({}), '');
  assert.equal(renderReportMarkdown('\ufeff\u200b# Titel'), '<h2>Titel</h2>\n');

  const markdown = '# Titel\n\n' + 'Langer, legitimer Inhalt. '.repeat(2_000);
  assert.equal(renderReportMarkdown(markdown), renderReportMarkdown(markdown));
});

test('fails closed to escaped plain text if rendering throws', () => {
  const createElement = document.createElement;
  document.createElement = () => {
    throw new Error('forced DOM failure');
  };
  try {
    assert.equal(
      renderReportMarkdown('[label](https://example.com)<img src=x>'),
      '[label](https://example.com)&lt;img src=x&gt;'
    );
  } finally {
    document.createElement = createElement;
  }
});

test('emits only the strict allowlist and permitted attributes', () => {
  const { container } = render(
    '# Title\n\n[external](https://example.com "title")\n\n| A |\n|---|\n| B |'
  );
  const allowedTags = new Set([
    'P', 'H2', 'H3', 'H4', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'BLOCKQUOTE',
    'CODE', 'PRE', 'A', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'HR', 'BR',
  ]);
  const allowedAttributes = {
    A: new Set(['href', 'title', 'target', 'rel']),
    TH: new Set(['colspan', 'rowspan']),
    TD: new Set(['colspan', 'rowspan']),
  };

  for (const element of container.querySelectorAll('*')) {
    assert.ok(allowedTags.has(element.tagName), element.outerHTML);
    for (const attribute of element.getAttributeNames()) {
      assert.ok(allowedAttributes[element.tagName]?.has(attribute), element.outerHTML);
    }
  }
});
