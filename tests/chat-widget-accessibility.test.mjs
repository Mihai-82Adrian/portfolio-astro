// Wave 3 closure: the ChatWidget chat-message textarea sits inside a real <form> with no `id`
// or `name`, which browsers flag with an autofill-association console warning ("A form field
// element has neither an id nor a name attribute") independent of the `aria-label` that already
// gives it an accessible name. Both textareas now carry a stable `id`/`name`, derived from the
// widget's own `id` prop so two mounted instances (ChatDrawer vs. the standalone /ai page) never
// collide. The chat form's submit handler already calls `e.preventDefault()`, so `name` creates
// no native form-submission side effect.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const SOURCE = readFileSync(new URL('../src/components/ChatWidget.astro', import.meta.url), 'utf8');

function textareaBlock(marker) {
    const idx = SOURCE.indexOf(marker);
    assert.ok(idx !== -1, `expected to find a textarea containing ${marker}`);
    const start = SOURCE.lastIndexOf('<textarea', idx);
    const end = SOURCE.indexOf('</textarea>', idx);
    return SOURCE.slice(start, end);
}

test('ChatWidget: the chat-message textarea has a stable, instance-unique id and an accessible name', () => {
    const block = textareaBlock('chat-input');
    assert.match(block, /id=\{`\$\{id\}-message`\}/, 'id must be derived from the widget id prop, not a hardcoded literal');
    assert.match(block, /name="message"/);
    assert.match(block, /aria-label=\{copy\.chatMessage\}/);
});

test('ChatWidget: the JD textarea has a stable, instance-unique id and an accessible name', () => {
    const block = textareaBlock('jd-input');
    assert.match(block, /id=\{`\$\{id\}-jd-input`\}/, 'id must be derived from the widget id prop, not a hardcoded literal');
    assert.match(block, /name="jobDescription"/);
    assert.match(block, /aria-label=\{copy\.jdInput\}/);
});

test('ChatWidget: the language <select> has a stable, instance-unique id and an accessible name', () => {
    const idx = SOURCE.indexOf('chat-lang-select');
    const start = SOURCE.lastIndexOf('<select', idx);
    const end = SOURCE.indexOf('>', idx);
    const block = SOURCE.slice(start, end);
    assert.match(block, /id=\{`\$\{id\}-lang`\}/, 'id must be derived from the widget id prop, not a hardcoded literal');
    assert.match(block, /name="responseLanguage"/);
    assert.match(block, /aria-label=\{copy\.responseLanguage\}/);
});

test('ChatWidget: the widget id prop still defaults to a fixed value for the single-instance /ai page', () => {
    assert.match(SOURCE, /const id = props\.id \|\| 'ai-chat-widget';/);
});

test('ChatWidget: the chat form submit handler prevents native submission, so adding `name` has no navigation side effect', () => {
    assert.match(SOURCE, /handleChatSubmit\(e: Event\) \{\s*e\.preventDefault\(\);/);
});
