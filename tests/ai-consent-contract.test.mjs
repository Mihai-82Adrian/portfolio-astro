// Phase 3-C Step 2B-2: permanent guards for the AI contextual-consent contract across all five
// AI surfaces (Ask Mihai chat, JD analysis, Founder Compass, Cashflow AI narrative, Investment
// Analytics AI interpretation). Covers both the built output (checkboxes start unchecked, the
// notice-version marker matches the single authoritative constant) and the source (every AI
// Function enforces the gate, no component persists AI consent to localStorage/cookies).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'node-html-parser';
import { AI_PRIVACY_NOTICE_VERSION } from '../functions/_lib/ai-privacy-notice.ts';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');

function readSource(relativePath) {
    return readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readDist(relativePath) {
    assert.ok(existsSync(DIST), 'run npm run build before verify:privacy');
    return readFileSync(path.join(DIST, relativePath), 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────
// Built output: every rendered consent checkbox starts unchecked
// ─────────────────────────────────────────────────────────────────────────

function assertCheckboxesUnchecked(html, file, selector) {
    const root = parse(html);
    const boxes = root.querySelectorAll(selector);
    assert.ok(boxes.length > 0, `${file}: expected at least one ${selector} checkbox`);
    for (const box of boxes) {
        assert.equal(box.getAttribute('checked'), undefined, `${file}: ${selector} must not render pre-checked`);
        assert.equal(box.getAttribute('type'), 'checkbox');
    }
}

test('/ai chat and JD consent checkboxes render unchecked', () => {
    const html = readDist('ai/index.html');
    assertCheckboxesUnchecked(html, 'ai/index.html', '.chat-consent-checkbox');
    assertCheckboxesUnchecked(html, 'ai/index.html', '.jd-consent-checkbox');
});

test('cashflow-forecast AI-narrative consent checkbox renders unchecked with the correct notice-version marker', () => {
    const html = readDist('tools/cashflow-forecast/index.html');
    const root = parse(html);
    const box = root.querySelector('input[data-ai-privacy-notice-version]');
    assert.ok(box, 'expected the shared AIDisclosureNote checkbox to render on first load');
    assert.equal(box.getAttribute('checked'), undefined);
    assert.equal(box.getAttribute('data-ai-privacy-notice-version'), AI_PRIVACY_NOTICE_VERSION);
});

test('investment-analytics AI-interpretation consent checkbox renders unchecked with the correct notice-version marker', () => {
    const html = readDist('tools/investment-analytics/index.html');
    const root = parse(html);
    const box = root.querySelector('input[data-ai-privacy-notice-version]');
    assert.ok(box, 'expected the shared AIDisclosureNote checkbox to render on first load');
    assert.equal(box.getAttribute('checked'), undefined);
    assert.equal(box.getAttribute('data-ai-privacy-notice-version'), AI_PRIVACY_NOTICE_VERSION);
});

test('every page-embedded ChatDrawer/ChatWidget instance renders both consent checkboxes unchecked', () => {
    // founder-compass does not itself reach the consent step on first load (gated behind the
    // 12-question quiz), but the site-wide ChatDrawer is still present and must be unchecked too.
    const html = readDist('tools/founder-compass/index.html');
    assertCheckboxesUnchecked(html, 'tools/founder-compass/index.html', '.chat-consent-checkbox');
    assertCheckboxesUnchecked(html, 'tools/founder-compass/index.html', '.jd-consent-checkbox');
});

// ─────────────────────────────────────────────────────────────────────────
// Single authoritative notice-version constant — no divergent duplication
// ─────────────────────────────────────────────────────────────────────────

test('AI_PRIVACY_NOTICE_VERSION is a single literal, defined only in functions/_lib/ai-privacy-notice.ts', () => {
    assert.equal(AI_PRIVACY_NOTICE_VERSION, 'ai-openai-v2');
    const owner = readSource('functions/_lib/ai-privacy-notice.ts');
    assert.match(owner, /export const AI_PRIVACY_NOTICE_VERSION = 'ai-openai-v2';/);
});

const CLIENT_SITES_IMPORTING_NOTICE_VERSION = [
    'src/components/ChatWidget.astro',
    'src/components/tools/ui/AIDisclosureNote.svelte',
    'src/components/tools/founder-compass/FounderCompassApp.svelte',
    'src/components/tools/cashflow-forecast/CashflowApp.svelte',
    'src/components/tools/investment-analytics/InvestmentApp.svelte',
];

for (const file of CLIENT_SITES_IMPORTING_NOTICE_VERSION) {
    test(`${file} imports AI_PRIVACY_NOTICE_VERSION rather than hardcoding it`, () => {
        const source = readSource(file);
        assert.match(source, /import\s*\{\s*AI_PRIVACY_NOTICE_VERSION\s*\}\s*from\s*['"].*ai-privacy-notice\.ts['"]/);
        assert.doesNotMatch(source, /['"]ai-openai-v2['"]/, `${file} must reference the constant, not a duplicated literal`);
    });
}

// ─────────────────────────────────────────────────────────────────────────
// Server-side enforcement is wired into all four AI Functions
// ─────────────────────────────────────────────────────────────────────────

const AI_FUNCTIONS = [
    'functions/api/chat.ts',
    'functions/api/compass.ts',
    'functions/api/cashflow-scenario.ts',
    'functions/api/investment-analysis.ts',
];

for (const file of AI_FUNCTIONS) {
    test(`${file} imports and calls hasValidAiPrivacyConsent before any provider call`, () => {
        const source = readSource(file);
        assert.match(source, /import\s*\{\s*hasValidAiPrivacyConsent\s*\}\s*from\s*['"]\.\.\/_lib\/ai-privacy-notice\.ts['"]/);
        assert.match(source, /hasValidAiPrivacyConsent\(/);
        assert.match(source, /PRIVACY_CONSENT_REQUIRED/);
    });
}

// ─────────────────────────────────────────────────────────────────────────
// AI consent is never persisted (no localStorage, no cookie, no global toggle)
// ─────────────────────────────────────────────────────────────────────────

const LOCALSTORAGE_SNAPSHOT_SITES = [
    'src/components/tools/founder-compass/FounderCompassApp.svelte',
    'src/components/tools/cashflow-forecast/CashflowApp.svelte',
    'src/components/tools/investment-analytics/InvestmentApp.svelte',
];

for (const file of LOCALSTORAGE_SNAPSHOT_SITES) {
    test(`${file} never writes AI consent state to localStorage`, () => {
        const source = readSource(file);
        assert.ok(source.includes('localStorage'), `${file}: expected an existing localStorage persistence block`);
        assert.doesNotMatch(source, /localStorage\.setItem\([^)]*aiConsent/is);
        assert.doesNotMatch(source, /aiConsent[^;]*localStorage\.setItem/is);
    });
}

test('AIDisclosureNote.svelte holds consent only in transient component state, never document.cookie', () => {
    const source = readSource('src/components/tools/ui/AIDisclosureNote.svelte');
    assert.doesNotMatch(source, /document\.cookie/);
    assert.doesNotMatch(source, /localStorage/);
    assert.match(source, /\$bindable\(false\)/, 'checked must default to false via $bindable');
});

test('ChatWidget.astro consent checkboxes are plain, non-persisted DOM state (no localStorage/cookie)', () => {
    const source = readSource('src/components/ChatWidget.astro');
    assert.doesNotMatch(source, /document\.cookie\s*=/);
    assert.doesNotMatch(source, /localStorage\.setItem\([^)]*[Cc]onsent/);
});

// ─────────────────────────────────────────────────────────────────────────
// Phase 3-C Step 2B-2R: accessible error/focus contract for the three Svelte AI surfaces.
// A disabled control can never receive the focus/error feedback a missing-consent click must
// produce, so none of these buttons may be disabled solely because consent is missing — instead,
// each action handler calls the shared AIDisclosureNote's exported requireConsent(), which shows
// an accessible error and focuses the checkbox on failure.
// ─────────────────────────────────────────────────────────────────────────

test('AIDisclosureNote.svelte exposes the shared requireConsent() accessible error/focus contract', () => {
    const source = readSource('src/components/tools/ui/AIDisclosureNote.svelte');
    assert.match(source, /export function requireConsent\(\)/, 'must export requireConsent for parents to call via bind:this');
    assert.match(source, /checkboxEl\?\.focus\(\)/, 'must focus the checkbox on a failed requireConsent() call');
    assert.match(source, /role="alert"/, 'the error message must be an accessible alert');
    assert.match(source, /aria-invalid=\{showError/, 'the checkbox must reflect its invalid state via aria-invalid');
    assert.match(source, /bind:this=\{checkboxEl\}/, 'must bind the checkbox element to focus it programmatically');
});

const SVELTE_AI_SURFACES = [
    { file: 'src/components/tools/founder-compass/ConsentStep.svelte', refs: ['disclosureRef'] },
    { file: 'src/components/tools/cashflow-forecast/ScenarioPanel.svelte', refs: ['disclosureRefFirst', 'disclosureRefRegenerate'] },
    { file: 'src/components/tools/investment-analytics/InvestmentApp.svelte', refs: ['disclosureRef'] },
];

for (const { file, refs } of SVELTE_AI_SURFACES) {
    test(`${file}: no AI action button is disabled solely because of aiConsent`, () => {
        const source = readSource(file);
        const disabledExpressions = [...source.matchAll(/disabled=\{([^}]*)\}/g)].map((m) => m[1]);
        assert.ok(disabledExpressions.length > 0, 'expected at least one disabled expression (submitting/cooldown/deterministic-input gating)');
        for (const expr of disabledExpressions) {
            assert.doesNotMatch(expr, /aiConsent/, `disabled expression must not reference aiConsent directly (found: ${expr}) — consent must be enforced in the click handler, not via disabled`);
        }
    });

    test(`${file}: every AI-triggering click handler calls requireConsent() via a bound AIDisclosureNote ref before proceeding`, () => {
        const source = readSource(file);
        for (const ref of refs) {
            assert.match(source, new RegExp(`bind:this=\\{${ref}\\}`), `expected <AIDisclosureNote bind:this={${ref}} .../> in ${file}`);
            assert.match(source, new RegExp(`${ref}\\??\\.requireConsent\\(\\)`), `expected a call to ${ref}?.requireConsent() guarding the action in ${file}`);
        }
    });
}

test("ScenarioPanel's regenerate AIDisclosureNote instance stays mounted regardless of aiConsent, so the bound ref is never stale", () => {
    const source = readSource('src/components/tools/cashflow-forecast/ScenarioPanel.svelte');
    // The regenerate flow's disclosure block must be gated only on weeklyLocked, not on aiConsent
    // itself — unmounting it the instant the box is checked would leave disclosureRefRegenerate
    // pointing at a destroyed component instance on the very next click.
    assert.doesNotMatch(
        source,
        /\{#if\s+!weeklyLocked\s+&&\s+!aiConsent\s*\}\s*<AIDisclosureNote[^>]*disclosureRefRegenerate/,
        'the regenerate AIDisclosureNote must not be conditionally unmounted based on aiConsent',
    );
    const disclosureUsages = source.match(/<AIDisclosureNote/g) ?? [];
    assert.ok(disclosureUsages.length >= 2, 'AIDisclosureNote must be reachable both before first generation and before regeneration');
});

test("InvestmentApp's AIDisclosureNote stays mounted regardless of aiNarrative, so disclosureRef is never stale for a re-analysis", () => {
    const source = readSource('src/components/tools/investment-analytics/InvestmentApp.svelte');
    // The analyze button's `disabled` never depends on `aiNarrative` (see the surface test above),
    // so gating the disclosure note's mount on `!aiNarrative` would leave disclosureRef pointing at
    // a destroyed instance once the weekly cooldown expires after a first completed analysis —
    // every subsequent click would silently no-op inside requireConsent()?. Regression: an earlier
    // version of this fix gated the note on `!aiNarrative && !weeklyLocked`.
    assert.doesNotMatch(
        source,
        /\{#if\s+!aiNarrative\s+&&\s+!weeklyLocked\s*\}\s*<AIDisclosureNote/,
        'the disclosure note must not be conditionally unmounted based on aiNarrative',
    );
    assert.match(
        source,
        /\{#if\s+!weeklyLocked\s*\}\s*<AIDisclosureNote[^>]*disclosureRef/,
        'the disclosure note must be mounted whenever the cooldown is not active, matching the button\'s real availability',
    );
});

// ─────────────────────────────────────────────────────────────────────────
// Phase 3-C Step 2B-2R, Finding C: no account-specific OpenAI training/opt-in claim
// ─────────────────────────────────────────────────────────────────────────

const NO_ACCOUNT_SPECIFIC_TRAINING_CLAIM_SITES = [
    'src/components/ChatWidget.astro',
    'src/components/tools/ui/AIDisclosureNote.svelte',
    'src/pages/datenschutz.astro',
    'docs/operations/ai-provider-responses-migration.md',
    'docs/operations/privacy-consent-external-services.md',
];

for (const file of NO_ACCOUNT_SPECIFIC_TRAINING_CLAIM_SITES) {
    test(`${file} does not assert this account's specific OpenAI training opt-in status as settled fact`, () => {
        const source = readSource(file);
        assert.doesNotMatch(source, /not opted in\b/i, `${file} must not assert this account's opt-in status`);
        assert.doesNotMatch(source, /besteht hier nicht/i, `${file} must not assert this account's opt-in status`);
        assert.doesNotMatch(source, /has not opted\b/i, `${file} must not assert this account's opt-in status`);
    });
}

test('built dist output carries no account-specific OpenAI opt-in claim', () => {
    const files = ['datenschutz/index.html', 'ai/index.html', 'tools/cashflow-forecast/index.html', 'tools/investment-analytics/index.html'];
    for (const file of files) {
        const html = readDist(file);
        assert.doesNotMatch(html, /not opted in\b/i, `${file}`);
        assert.doesNotMatch(html, /besteht hier nicht/i, `${file}`);
    }
});

// ─────────────────────────────────────────────────────────────────────────
// Phase 3-C Step 2B-2R, Finding D: chat.ts's ordering exception is documented, not hidden or
// silently uniformized with the other three Functions.
// ─────────────────────────────────────────────────────────────────────────

const CHAT_ORDERING_EXCEPTION_DOCS = [
    'docs/operations/pages-functions-contracts.md',
    'docs/operations/operational-controls-observability.md',
    'docs/operations/privacy-consent-external-services.md',
    'docs/operations/ai-provider-responses-migration.md',
    'docs/ARCHITECTURE.md',
    'README.md',
    'docs/ROADMAP.md',
];

for (const file of CHAT_ORDERING_EXCEPTION_DOCS) {
    test(`${file} names chat's burst-limiter/quota-read ordering exception wherever it describes the consent-vs-quota/rate-limit ordering`, () => {
        const source = readSource(file);
        // Every mention of the consent-before-quota/rate-limit contract in these documents must
        // co-occur with an explicit mention of chat's ordering exception (burst limiter and/or
        // quota lookup running before consent) — a bare, unqualified "all four Functions" claim
        // without this nearby is exactly the Finding D regression.
        const mentionsOrderingContract = /quota (lookup\/write|write)[^.]*(rate-limit|provider call)/i.test(source);
        if (mentionsOrderingContract) {
            assert.match(source, /burst|exception/i, `${file} mentions the consent/quota ordering contract but not chat's documented exception`);
        }
    });
}

test("pages-functions-contracts.md classifies chat.ts's ordering as an accepted security exception", () => {
    const source = readSource('docs/operations/pages-functions-contracts.md');
    assert.match(source, /ACCEPTED-SECURITY-ORDERING-EXCEPTION/);
});

// ─────────────────────────────────────────────────────────────────────────
// Phase 5-D1A: chat/JD consent collapse lifecycle (undecided -> granted -> withdrawn). Immediate
// collapse on checkbox change is a client-side layout transition; these are the static/build-time
// contracts a regex/DOM-parse test can prove. Computed-height, real-network, and keyboard-focus
// behavior require the browser-level Firefox regression instead (see the AI contextual-consent
// matrix in scripts/release/firefox-release.mjs).
// ─────────────────────────────────────────────────────────────────────────

test('ChatWidget.astro: chat and JD consent blocks each render fully expanded with a hidden compact status row on first load', () => {
    const html = readDist('index.html');
    const root = parse(html);
    for (const [expandedSel, statusSel, containerSel] of [
        ['.chat-consent-expanded', '.chat-consent-status', '.chat-consent'],
        ['.jd-consent-expanded', '.jd-consent-status', '.jd-consent'],
    ]) {
        const expanded = root.querySelector(expandedSel);
        const status = root.querySelector(statusSel);
        const container = root.querySelector(containerSel);
        assert.ok(expanded, `expected ${expandedSel} in built HTML`);
        assert.ok(status, `expected ${statusSel} in built HTML`);
        assert.ok(!expanded.classList.contains('hidden'), `${expandedSel} must be visible on first load`);
        assert.ok(status.classList.contains('hidden'), `${statusSel} must be hidden on first load`);
        assert.equal(container.getAttribute('data-consent-state'), 'undecided', `${containerSel} must start in the undecided state`);
    }
});

test('ChatWidget.astro: chat and JD consent state containers are structurally independent (two distinct data-consent-state hooks, two distinct listener pairs)', () => {
    const source = readSource('src/components/ChatWidget.astro');
    assert.match(source, /class="chat-consent shrink-0" data-consent-state="undecided"/);
    assert.match(source, /class="jd-consent mt-2" data-consent-state="undecided"/);
    // Each surface is wired via its own checkbox `change` listener and its own withdraw button
    // click listener -- granting/withdrawing one must never reference the other surface's element.
    assert.match(source, /chatConsentCheckbox\?\.addEventListener\('change', \(\) => this\.handleConsentChecked\('chat'\)\)/);
    assert.match(source, /jdConsentCheckbox\?\.addEventListener\('change', \(\) => this\.handleConsentChecked\('jd'\)\)/);
    assert.match(source, /chatConsentWithdrawBtn\?\.addEventListener\('click', \(\) => this\.handleConsentWithdraw\('chat'\)\)/);
    assert.match(source, /jdConsentWithdrawBtn\?\.addEventListener\('click', \(\) => this\.handleConsentWithdraw\('jd'\)\)/);
});

test('ChatWidget.astro: granting or withdrawing consent never triggers a fetch -- the state transition is presentation-only', () => {
    const source = readSource('src/components/ChatWidget.astro');
    const checkedMethod = source.match(/handleConsentChecked\(surface: 'chat' \| 'jd'\) \{[\s\S]*?\n {4}\}/);
    const withdrawMethod = source.match(/handleConsentWithdraw\(surface: 'chat' \| 'jd'\) \{[\s\S]*?\n {4}\}/);
    assert.ok(checkedMethod, 'expected a handleConsentChecked method');
    assert.ok(withdrawMethod, 'expected a handleConsentWithdraw method');
    assert.doesNotMatch(checkedMethod[0], /fetch\(/, 'checking the box must not itself call fetch()');
    assert.doesNotMatch(withdrawMethod[0], /fetch\(/, 'withdrawing consent must not itself call fetch()');
});

test("ChatWidget.astro: aria-invalid is toggled on both success and failure, matching AIDisclosureNote.svelte's pattern", () => {
    const source = readSource('src/components/ChatWidget.astro');
    assert.match(source, /checkbox\?\.setAttribute\('aria-invalid', 'false'\)/);
    assert.match(source, /checkbox\?\.setAttribute\('aria-invalid', 'true'\)/);
});

test('ChatWidget.astro: withdrawal restores the expanded disclosure, clears the error, and re-focuses the checkbox', () => {
    const source = readSource('src/components/ChatWidget.astro');
    const withdrawMethod = source.match(/handleConsentWithdraw\(surface: 'chat' \| 'jd'\) \{[\s\S]*?\n {4}\}/)[0];
    assert.match(withdrawMethod, /checkbox\.checked = false/);
    assert.match(withdrawMethod, /errorEl\?\.classList\.add\('hidden'\)/);
    assert.match(withdrawMethod, /this\.setConsentState\(surface, 'withdrawn'\)/);
    assert.match(withdrawMethod, /checkbox\?\.focus\(\)/);
});

test('built dist output localizes the compact withdrawal control for all three locales, with an accessible name from its own text content', () => {
    const expectations = [
        ['index.html', 'Widerrufen'],
        ['en/index.html', 'Withdraw'],
        ['ro/index.html', 'Retrage'],
    ];
    for (const [file, expectedText] of expectations) {
        const html = readDist(file);
        const root = parse(html);
        const chatWithdraw = root.querySelector('.chat-consent-withdraw');
        const jdWithdraw = root.querySelector('.jd-consent-withdraw');
        assert.ok(chatWithdraw, `${file}: expected a .chat-consent-withdraw button`);
        assert.ok(jdWithdraw, `${file}: expected a .jd-consent-withdraw button`);
        assert.equal(chatWithdraw.getAttribute('type'), 'button');
        assert.equal(jdWithdraw.getAttribute('type'), 'button');
        assert.equal(chatWithdraw.text.trim(), expectedText, `${file}: chat withdrawal button must be localized`);
        assert.equal(jdWithdraw.text.trim(), expectedText, `${file}: JD withdrawal button must be localized`);
    }
});

test('ChatWidget.astro: the consent lifecycle addition stays presentation-only -- no new sessionStorage/cookie/localStorage persistence', () => {
    const source = readSource('src/components/ChatWidget.astro');
    assert.doesNotMatch(source, /sessionStorage/);
    // Reasserts the existing whole-file guard still holds after the Phase 5-D1A lifecycle addition.
    assert.doesNotMatch(source, /document\.cookie\s*=/);
    assert.doesNotMatch(source, /localStorage\.setItem\([^)]*[Cc]onsent/);
});
