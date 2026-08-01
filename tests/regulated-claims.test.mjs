// Phase 3-B2 (Workstream A / CL-04, CL-05, CL-06 per the 2026-07-18 fable-5 independent audit,
// docs/audits/fable-5-2026-07-18/01-independent-audit.md §9C, preserved at commit
// b431d5a2c76069d809ee65b2bd439156d2223dfd and removed from the active tree by 5e21c9f — the raw
// audit is historical evidence, not living documentation). The BentoGrid homepage card advertised
// "Finanzberatung mit IHK-Zertifizierung" (CL-04): "Finanzberatung" over-reaches into financial-
// product advisory (§ 34f GewO territory, unclaimed and unneeded for the actual services), and
// generic "IHK-Zertifizierung" implies the financial-advisory activity itself is IHK-certified,
// when the actual certificate is a bookkeeping qualification. corpus.jsonl's
// service:*:financial-consulting record separately offered unqualified "Sanierungs- bzw.
// Entwicklungsstrategien" (CL-05), overbroad for a provider without insolvency/legal/tax-advisory
// authorization. These guards make both regressions permanently source-detectable, independent of
// any disclaimer on a different page (a disclaimer is not the sole protection against an overbroad
// headline).
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');

// Every surface that could present an "offer" to a visitor or to the chat assistant's evidence
// base. MethodologyModal.svelte is intentionally excluded: it uses "Finanzberatung" only inside a
// disclaimer ("...ersetzen keine professionelle Steuer- oder Finanzberatung" — the tool does NOT
// replace financial advisory), which is an explicitly permitted explanatory/negating context, not
// an offer.
const OFFER_SURFACES = [
  'src/components/sections/BentoGrid.astro',
  'src/pages/services.astro',
  'src/pages/en/services.astro',
  'src/pages/ro/services.astro',
  'src/data/translations.ts',
  'public/corpus.jsonl',
  'public/facts.json',
];

test('no offer surface advertises "Finanzberatung" as an active service', () => {
  // The German word itself (unqualified) is the actual defect: it connotes § 34f GewO
  // investment/financial-product advisory, an authorization not held or needed for the actual
  // (bookkeeping/reporting/consulting) services. Generic "financial consulting"/"consultanță
  // financiară" category labels are not banned outright — see the CL-08-style disposition for
  // properly scoped, disclaimed business consulting — only the BentoGrid credential-attached form
  // is checked for those (next test).
  for (const file of OFFER_SURFACES) {
    assert.doesNotMatch(read(file), /Finanzberatung/, `${file}: must not advertise "Finanzberatung"`);
  }
});

test('no offer surface uses generic "IHK-Zertifizierung" without the exact qualification name attached', () => {
  // A bare, unqualified "IHK-Zertifizierung" mention reads as if the offered activity itself is
  // IHK-certified. Legitimate mentions elsewhere in the repo always name the exact qualification
  // (e.g. "IHK-Zertifizierung in Finanzbuchführung", "IHK-Zertifizierung als Fachkraft für
  // Buchführung") — this guard targets only the offer-facing surfaces where the generic form was
  // the actual defect (CL-04's BentoGrid card and its services/translations neighbors).
  for (const file of ['src/components/sections/BentoGrid.astro', 'src/pages/services.astro', 'src/pages/en/services.astro', 'src/pages/ro/services.astro']) {
    const source = read(file);
    assert.doesNotMatch(source, /IHK-Zertifizierung/, `${file}: must not use generic "IHK-Zertifizierung" as an offer credential`);
    assert.doesNotMatch(source, /IHK certification/i, `${file}: must not use generic "IHK certification" as an offer credential`);
    assert.doesNotMatch(source, /certificare IHK/i, `${file}: must not use generic "certificare IHK" as an offer credential`);
  }
});

test('BentoGrid services card is DE/EN/RO semantically equivalent and free of the CL-04 defect', () => {
  const source = read('src/components/sections/BentoGrid.astro');
  assert.match(source, /Finance Operations, Reporting und KI-gestützte digitale Workflows/, 'DE card description must use the owner-approved wording');
  assert.match(source, /Finance operations, reporting and AI-enabled digital workflows/, 'EN card description must use the owner-approved wording');
  assert.match(source, /Operațiuni financiare, raportare și fluxuri digitale asistate de AI/, 'RO card description must use the owner-approved wording');
  // The stat badge itself must not reintroduce a credential-attached claim.
  assert.doesNotMatch(source, /label: 'Beratung', value: 'IHK'/, 'DE stat badge must not read "Beratung: IHK"');
  assert.doesNotMatch(source, /label: 'Consulting', value: 'IHK'/, 'EN stat badge must not read "Consulting: IHK"');
  assert.doesNotMatch(source, /label: 'Consultanță', value: 'IHK'/, 'RO stat badge must not read "Consultanță: IHK"');
});

test('the §6 Nr.4 StBerG disclaimer and its statute-verbatim bullets remain intact on /services (CL-01/02/03, owner-confirmed eligibility, unaffected by this wave)', () => {
  for (const [file, expected] of [
    ['src/pages/services.astro', /Leistungen nach §6 Nr\.4 StBerG\. Ausdrücklich keine Steuerberatung, keine Jahresabschlüsse oder EÜR\./],
    ['src/pages/en/services.astro', /Services under §6 No\.4 StBerG\. Explicitly no tax advisory, no annual financial statements, and no EÜR\./],
    ['src/pages/ro/services.astro', /Servicii conform §6 Nr\.4 StBerG\. Fără consultanță fiscală, fără bilanț anual și fără EÜR\./],
  ]) {
    assert.match(read(file), expected, `${file}: the § 6 Nr.4 StBerG scope disclaimer must remain unchanged`);
  }
});

test('corpus.jsonl financial-consulting records no longer offer unqualified restructuring/insolvency-adjacent strategy work (CL-05)', () => {
  const corpus = read('public/corpus.jsonl');
  const records = corpus.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const financialConsulting = records.filter((r) => r.id?.startsWith('service:') && r.id?.endsWith(':financial-consulting'));
  assert.equal(financialConsulting.length, 3, 'expected exactly 3 locale variants of the financial-consulting service record');
  for (const record of financialConsulting) {
    assert.doesNotMatch(record.text, /Sanierung/i, `${record.id}: must not offer unqualified Sanierungsstrategien (restructuring/insolvency-adjacent advisory, outside RDG/StBerG/GewO authorization)`);
    assert.doesNotMatch(record.text, /Entwicklungsstrategien|growth strategy design|strategii de.*dezvoltare/i, `${record.id}: must not offer unqualified strategy-design work beyond scenario modelling`);
  }
});

test('no corpus.jsonl service/pricing record offers a reserved tax activity as Mihai\'s own service (only as a disclaimed exclusion)', () => {
  // Negation-aware: the CL-03 disclaimer legitimately *names* these reserved activities only to
  // exclude them ("keine Jahresabschlüsse oder EÜR"). The defect this guards against is a reserved
  // term appearing in the same sentence WITHOUT a negation cue — i.e. presented as offered.
  const reserved = [/Jahresabschluss/i, /\bEÜR\b/, /Umsatzsteuervoranmeldung/i, /Steuererklärung/i, /Anlageberatung/i];
  // No \b boundaries: \b is ASCII-word-only in JS and misbehaves around diacritics ("fără" ends in
  // a non-\w "ă", so a trailing \b never matches there). These strings are distinctive enough that
  // a plain substring test carries negligible false-positive risk.
  const negation = /keine|kein|nicht|no|not|without|fără|fara|\bnu\b/i;
  const corpus = read('public/corpus.jsonl');
  const records = corpus.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const offerRecords = records.filter((r) => r.metadata?.type === 'service' || r.metadata?.docType === 'service_pricing');
  assert.ok(offerRecords.length > 0, 'expected at least one service/pricing corpus record to check');
  for (const record of offerRecords) {
    for (const segment of record.text.split(/[.;]/)) {
      for (const pattern of reserved) {
        if (pattern.test(segment)) {
          assert.match(segment, negation, `${record.id}: "${segment.trim()}" names a StBerG-reserved activity without a negation cue — must not present it as offered`);
        }
      }
    }
  }
});

test('facts.json current_role frames USt-VA/BWA as an employment duty at a named employer, not a client offer', () => {
  const facts = JSON.parse(read('public/facts.json'));
  for (const lang of ['de', 'en', 'ro']) {
    const text = facts.current_role[lang];
    assert.match(text, /modal3/i, `current_role.${lang}: must name the employer, keeping this in an employment context`);
  }
});

test('chat.ts system prompt distinguishes employment/skill facts from client service offers (R5.6a)', () => {
  const source = read('functions/api/chat.ts');
  assert.match(
    source,
    /Distinguish employment duties and skills/,
    'BASE_SYSTEM_PROMPT must instruct the model to distinguish employment/skill facts from client-offered services',
  );
  assert.match(
    source,
    /Umsatzsteuervoranmeldung[\s\S]{0,80}Steuerberatung/,
    'BASE_SYSTEM_PROMPT must name Umsatzsteuervoranmeldung among the reserved activities never presented as a client offer',
  );
});

test('/now does not claim the paid sample review flow is currently available', () => {
  const source = read('src/pages/now.astro');
  assert.doesNotMatch(source, /paid sample review flow\./, '/now must not list the paid sample review as a live entry point without qualification');
  assert.match(source, /currently inactive/i, '/now must disclose the sample review form is currently inactive');
  assert.match(source, /no submission or paid review is\s*\n?\s*currently available/i, '/now must state no submission is currently available, matching the Sample Review page truth and the launch-scope lock');
});
