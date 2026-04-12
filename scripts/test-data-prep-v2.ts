import assert from 'node:assert/strict';

import {
  dataPrepLandingContentByLocale,
  discoveryCallContentByLocale,
  sampleReviewContentByLocale,
} from '../src/data/services/data-prep-for-ai.ts';

const locales = ['de', 'en', 'ro'] as const;

for (const locale of locales) {
  const landing = dataPrepLandingContentByLocale[locale];
  const discovery = discoveryCallContentByLocale[locale];
  const sample = sampleReviewContentByLocale[locale];

  assert.ok(landing.hero.trustStrip, `${locale}: hero trust strip missing`);
  assert.equal(landing.hero.trustStrip.length, 3, `${locale}: hero trust strip must have 3 items`);

  assert.ok(landing.collaboration, `${locale}: collaboration section missing`);
  assert.equal(landing.collaboration.cards.length, 3, `${locale}: collaboration section must have 3 cards`);

  assert.ok(landing.whatItIs, `${locale}: what this is section missing`);
  assert.ok(landing.whatItIs.is.length >= 3, `${locale}: what this is items missing`);
  assert.ok(landing.whatItIs.isNot.length >= 3, `${locale}: what this is not items missing`);

  assert.ok(landing.bridgeFit, `${locale}: bridge fit section missing`);
  assert.ok(landing.bridgeFit.bullets.length >= 3, `${locale}: bridge fit bullets missing`);

  const aiActFaq = landing.faq.items.find((item) => /AI Act/i.test(item.question));
  assert.ok(aiActFaq, `${locale}: EU AI Act FAQ item missing`);
  assert.match(aiActFaq.answer, /support|supports|sprijină|unterstützt|readiness|pregătire|Disziplin|discipline/i, `${locale}: EU AI Act FAQ should describe support/readiness, not guarantees`);
  assert.match(aiActFaq.answer, /not replace|does not replace|kein Ersatz|ersetzt nicht|nu înlocuiește|nu reprezintă|does not certify|zertifiziert nicht|nu certifică/i, `${locale}: EU AI Act FAQ should include non-legal disclaimer`);

  const regulatedOutputsLine = landing.outputs.bullets.find((bullet) => /regulated|reguliert|sensitive|sensibile|traceable|nachvollziehbar|trasabil/i.test(bullet));
  assert.ok(regulatedOutputsLine, `${locale}: outputs should mention traceable/documented preparation for sensitive or regulated contexts`);

  assert.match(landing.hero.primaryCta.label, /Discovery/i, `${locale}: primary CTA should remain discovery-oriented`);

  const secondaryLabel = `${landing.hero.secondaryCta.label} ${landing.finalCta.secondaryCta.label} ${sample.form.submitLabel}`;
  assert.doesNotMatch(secondaryLabel, /start pilot|buy now/i, `${locale}: productized CTA wording detected`);

  assert.ok(discovery.cta.quickCheckItems.length >= 3, `${locale}: discovery page quick check should remain substantive`);
}

console.log('data prep V2 content contract OK');
