# Enhanced Corpus & Responses API Migration

> **Date**: 2026-02-14 | **Status**: Design validated via brainstorming
> **Approach**: Option C — Rich corpus + Responses API (without file_search)

## Goal

Transform the current flat `corpus.jsonl` (~250KB, 155 entries) into a professional knowledge base (~500KB-1MB, 300+ entries) and migrate from Chat Completions to the Responses API for streaming support. **$0 additional monthly cost.**

---

## Part 1: Enhanced Corpus Schema

### Current Types (keep & refine)

| Type | Count | Notes |
|------|-------|-------|
| `profile` | 3 (DE/EN/RO) | ✅ Keep as-is |
| `experience` | 36 | ✅ Keep, add `present: true` flag to current role |
| `education` | 12 | ✅ Keep as-is |
| `certification` | 24 | ✅ Keep as-is |
| `project` | 18 | ✅ Keep, extend with deep-dive entries |
| `blog` | 62 (EN only) | ✅ Keep, no DE/RO needed (technical content) |

### New Types — Must-Have

#### 1. `faq` — Recruiter & visitor questions (~30 entries × 3 langs = ~90 entries)

```jsonl
{
  "id": "faq:en:why-hire",
  "title": "Why should I hire Mihai?",
  "sectionTitle": "FAQ",
  "text": "Q: Why should I hire Mihai?\nA: Mihai brings a rare combination of deep financial accounting expertise (3+ years in German Finanzbuchhaltung, DATEV, VAT reporting) with hands-on AI/ML engineering skills. He builds production-grade systems — from RAG-powered chatbots to multi-agent audit platforms — while maintaining the rigor and compliance mindset that finance demands. Currently pursuing his Bilanzbuchhalter IHK certification, he represents the next generation of finance professionals who bridge the gap between traditional accounting and intelligent automation.",
  "metadata": { "type": "faq", "lang": "en", "category": "hiring", "keywords": ["hire", "why", "value", "benefit"] }
}
```

**FAQ categories to cover:**

- **Hiring**: Why hire, what differentiates, strengths/weaknesses
- **Availability**: Remote, relocation, start date, part-time
- **Salary**: Polite deflection → "Let's discuss based on role scope"
- **Technical**: Tools used, AI experience level, programming languages
- **Personal**: Career change motivation, Germany transition story
- **Site**: How to contact, where to find CV, how AI assistant works

#### 2. `skills_taxonomy` — Individual skill entries (~25 skills × 3 langs = ~75 entries)

```jsonl
{
  "id": "skill:en:datev",
  "title": "DATEV",
  "sectionTitle": "Skills Taxonomy",
  "text": "DATEV — Proficiency: Advanced | Category: Accounting Software | Experience: 2+ years\nUsed DATEV for financial accounting at Grone Wirtschaftsakademie (IHK certification program) and applied DATEV workflows at Kesen Steuerberatungsgesellschaft. Competent in DATEV Unternehmen Online, Kanzlei-Rechnungswesen, and DATEV export formats for tax advisors.",
  "metadata": { "type": "skill", "lang": "en", "category": "accounting", "proficiency": "advanced", "years": 2 }
}
```

**Skill categories:**

- **Accounting**: DATEV, SelectLine, Finanzbuchhaltung, Umsatzsteuer, BWA, Jahresabschluss, Lohnabrechnung
- **Programming**: TypeScript, Python, Go, Kotlin, Julia, Rust, SQL
- **AI/ML**: RAG Systems, LLM Integration, Vector Search, Prompt Engineering
- **Frameworks**: Astro, Cloudflare Workers, REST APIs
- **Languages**: German B2, English fluent, Romanian native
- **Soft Skills**: Team Leadership, Cross-cultural Communication, Process Digitalization

#### 3. `value_proposition` — Personal brand narrative (~6 entries × 3 langs = ~18 entries)

```jsonl
{
  "id": "value:en:unique-blend",
  "title": "What makes Mihai unique",
  "sectionTitle": "Value Proposition",
  "text": "Mihai represents a rare professional archetype: a certified financial accountant who codes production-grade AI systems. While most accountants use software, Mihai builds it. While most developers lack domain expertise, Mihai brings years of hands-on Finanzbuchhaltung experience. This blend enables him to identify automation opportunities that pure technologists miss and build solutions that pure accountants can't imagine — from GoBD-compliant anomaly detection pipelines to AI-powered portfolio assistants.",
  "metadata": { "type": "value_proposition", "lang": "en", "category": "unique-blend" }
}
```

**Narrative sections:**

- `unique-blend` — Finance + Tech intersection
- `career-journey` — Romania → Germany → Finance → AI arc
- `growth-mindset` — Continuous learning (IHK → Bilanzbuchhalter → AI research)
- `practical-builder` — Ships real products (portfolio site, ProfitMinds, GENESIS)
- `multilingual-advantage` — 3 languages, intercultural experience
- `german-market-expertise` — Deep understanding of German business/tax landscape

#### 4. `career_narrative` — Timeline-aware career story (~4 entries × 3 langs = ~12 entries)

```jsonl
{
  "id": "career:en:phase-transition",
  "title": "Career Phase: Transition to German Financial Accounting",
  "sectionTitle": "Career Narrative",
  "text": "Phase: Career Reinvention (2020-2023)\nAfter relocating from Romania to Germany, Mihai pivoted from sales management to financial accounting. He completed the IHK Fachkraft für Buchführung program at Grone Wirtschaftsakademie (2023), earning certifications in Financial Accounting, Payroll Accounting, and DATEV. The experience at Dipl.oec. Gerolf Herrmann (2023) and Quadriga Steuerberatungsgesellschaft (2022) provided foundational practice. This wasn't starting over — it was leveraging 15+ years of business experience (own clothing store, SMC sales management) into a specialized, high-demand field in Germany.",
  "metadata": { "type": "career_narrative", "lang": "en", "phase": "transition", "period": "2020-2023" }
}
```

**Career phases:**

- `early-career` — Romania: retail, own business, sales (2003-2018)
- `transition` — Germany: reinvention into accounting (2020-2023)
- `professional` — Financial accounting mastery (2023-present)
- `future-vision` — Bilanzbuchhalter + AI integration (2025+)

### New Types — Nice-to-Have

#### 5. `industry_knowledge` (~8 entries × 3 langs = ~24 entries)

German tax concepts, GoBD, DATEV ecosystem, e-invoicing standards

#### 6. `project_deep_dive` (~6 entries, EN only = ~6 entries)

Extended technical narratives for GDS, GENESIS, ProfitMinds + this portfolio site

#### 7. `testimonial` (~4 entries × 3 langs = ~12 entries)

Themes from Arbeitszeugnisse (reliability, punctuality, team integration)

#### 8. `site_meta` (~8 entries × 3 langs = ~24 entries)

Navigation: "Where do I find certifications?" → `/certifications` with description

---

## Part 2: Retrieval Upgrade

### Enhanced Scoring Algorithm

Current `scoreDoc()` uses basic TF-IDF with keyword matching. Enhancements:

```typescript
// NEW: Boost FAQ matches on question similarity
if (doc.metadata?.type === 'faq') {
  // Match against the question part of FAQ entries
  const questionMatch = doc.title.toLowerCase();
  const queryLower = message.toLowerCase();
  // Fuzzy question matching boost
  if (similarity(queryLower, questionMatch) > 0.6) score += 15;
}

// NEW: Keyword metadata matching
if (doc.metadata?.keywords) {
  const keywordHits = doc.metadata.keywords.filter(k => 
    queryTokens.includes(k.toLowerCase())
  );
  score += keywordHits.length * 3;
}

// NEW: Category-aware retrieval
if (doc.metadata?.category) {
  const categoryTokens = doc.metadata.category.split('-');
  const categoryHits = categoryTokens.filter(t => queryTokens.includes(t));
  score += categoryHits.length * 2;
}
```

### Language-Aware Retrieval

Detect query language and boost same-language documents:

```typescript
// If query is in German, boost DE docs
if (detectedLang === 'de' && doc.metadata?.lang === 'de') score *= 1.5;
```

---

## Part 3: Responses API Migration

### Endpoint Change

```diff
- POST https://api.openai.com/v1/chat/completions
+ POST https://api.openai.com/v1/responses
```

### Request Format Change

```typescript
// NEW: Responses API format
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4.1-mini',
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    stream: true,  // Enable streaming
    // No tools (no file_search) — we pass context manually
  }),
});
```

### Streaming Response Handling

Frontend receives tokens in real-time instead of waiting for complete response:

```typescript
// Server-Sent Events streaming
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  // Parse SSE events, extract text deltas
  // Append to chat bubble in real-time
}
```

---

## Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Corpus entries | 155 | ~400+ |
| Corpus size | 250KB | ~700KB |
| Document types | 6 | 14 |
| Query coverage | ~60% | ~90%+ |
| Response latency | 2-4s (full wait) | <500ms (first token) |
| Monthly cost | ~$6 | ~$6 (unchanged) |
| API future-proofing | Chat Completions (legacy) | Responses API (current) |

---

## Implementation Phases

### Phase 1: Corpus Enrichment

1. Create all must-have entries (faq, skills_taxonomy, value_proposition, career_narrative)
2. Create nice-to-have entries (industry_knowledge, project_deep_dive, testimonial, site_meta)
3. Validate JSONL format and test retrieval quality

### Phase 2: Retrieval Upgrade

1. Enhance `scoreDoc()` with FAQ matching, keyword metadata, category awareness
2. Add language detection boost
3. Test retrieval accuracy on sample queries

### Phase 3: Responses API Migration

1. Migrate `chat.ts` from Chat Completions to Responses API
2. Implement server-side streaming
3. Update frontend for streaming response rendering
4. Test error handling with new API format

### Phase 4: Verification

1. Test all 5 intents + new FAQ queries
2. Verify streaming works in production
3. Run `npm run build` to ensure no regressions
