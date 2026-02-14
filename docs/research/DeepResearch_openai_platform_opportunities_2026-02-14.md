# OpenAI Platform — Opportunities for Ask Mihai · AI

> **Date**: 2026-02-14 | **Scope**: All features visible in the OpenAI Platform dashboard
> **Goal**: Identify opportunities to evolve the PoC into a world-class portfolio assistant

## Dashboard Features Analyzed

From the user's screenshot at `platform.openai.com/storage/skills`:

```
Create               Manage            Optimize
├─ Chat              ├─ Usage          ├─ Evaluation
├─ Agent Builder     ├─ API keys       └─ Fine-tuning
├─ Audio             ├─ ChatGPT Apps
├─ Images            ├─ Logs
├─ Videos            └─ Storage
└─ Assistants            ├─ Files
                         ├─ Vector stores
                         └─ Skills
                     └─ Batches
```

---

## 🏆 Opportunity #1: Vector Stores + File Search (HIGH PRIORITY)

**What it is**: OpenAI's built-in RAG infrastructure. You upload documents → OpenAI auto-chunks, embeds, and indexes them → the model queries them with semantic + keyword hybrid search.

**How it transforms our PoC**:

| Current (DIY RAG) | With Vector Stores |
|---|---|
| `corpus.jsonl` loaded on every request | Pre-indexed, always ready |
| Basic TF-IDF keyword scoring | Semantic + keyword hybrid search |
| Max ~57 entries, flat JSON | Up to 10,000 files per vector store |
| No metadata filtering | Filter by metadata (type, language, date) |
| Every query re-fetches corpus | Zero fetch overhead |

**Action Plan**:

1. Upload `corpus.jsonl` (or convert to individual `.md` files) to a Vector Store via the dashboard
2. Switch from DIY `retrieveDocs()` to the Responses API `file_search` tool
3. Delete the TF-IDF scoring code in `chat.ts` — OpenAI handles retrieval

**Cost**:

- Storage: Free for first 1GB (our corpus is tiny, <1MB)
- File Search calls: $2.50 per 1,000 calls → at 7,500 requests/month = **$18.75/month**
- **Alternative**: Keep using the Responses API without file_search tool calls by passing context manually (current approach, $0 extra)

> **IMPORTANT**: Use Vector Stores for storage/indexing but consider cost. At $2.50/1K calls, the file_search tool adds ~$19/month. Our current approach (fetch corpus + TF-IDF) costs $0. Evaluate if the quality improvement justifies the cost.

---

## 🔄 Opportunity #2: Responses API (MEDIUM-HIGH PRIORITY)

**What it is**: The successor to both Chat Completions and Assistants APIs. Combines stateless simplicity with built-in tool orchestration (file search, web search, code interpreter).

**Why migrate**:

- Assistants API deprecated, sunset Aug 26, 2026
- Responses API is the recommended long-term architecture
- Supports streaming, reasoning summaries, background mode
- Native tool orchestration (model decides when to search files, browse web, etc.)

**How it transforms our PoC**:

- **Web Search tool**: Model can cite real-time sources about industry trends
- **File Search tool**: Built-in RAG without custom retrieval code
- **Conversation state**: Built-in context management via `previous_response_id`
- **Streaming**: Real-time token-by-token responses (much better UX)

**Migration path**:

```diff
- fetch('https://api.openai.com/v1/chat/completions', {...})
+ fetch('https://api.openai.com/v1/responses', {
+   model: 'gpt-4.1-mini',
+   input: userMessage,
+   tools: [{ type: 'file_search', vector_store_ids: ['vs_xxx'] }],
+   stream: true
+ })
```

**Cost**: Same model pricing, no extra cost for the API itself.

---

## 📊 Opportunity #3: Evaluation / Evals (MEDIUM PRIORITY)

**What it is**: Automated quality testing for LLM outputs. Define test cases, run them programmatically, measure accuracy over time.

**How it transforms our PoC**:

- **Regression testing**: Ensure intent routing stays accurate after model/prompt changes
- **Quality grading**: Model-graded evals (GPT-4.1 judges GPT-4.1-mini answers)
- **CI/CD integration**: Run evals before deploying prompt changes

**Example eval for our PoC**:

```yaml
# Test: "What certifications does Mihai have?"
expected_keywords: ["Microsoft", "Azure", "PL-300", "AI-900"]
expected_intent: "certifications"
grading: model_graded  # GPT-4.1 evaluates if answer is factual

# Test: "Call Mihai" → should NOT reveal phone number
expected_behavior: "request explicit confirmation"
grading: exact_match
```

**Cost**: Only standard API usage during eval runs (~$0.50 per eval suite).

---

## 🎯 Opportunity #4: Fine-tuning (LOW-MEDIUM PRIORITY)

**What it is**: Train a custom model variant using your data to improve tone, accuracy, and consistency.

**How it could transform our PoC**:

- **Consistent persona**: Model always responds as "Mihai's assistant" without needing long system prompts
- **Shorter prompts → lower costs**: Fine-tuned models need fewer instructions
- **Better handling of edge cases**: Train on examples of tricky queries

**Training data we could create**:

- 50-100 example conversations (query → ideal answer pairs)
- Intent routing examples
- Edge cases (salary questions → polite refusal, etc.)

**Cost for gpt-4.1-mini fine-tuning**:

- Training: $5.00/1M tokens → 100 examples × ~500 tokens = 50K tokens → **$0.25 one-time**
- Inference (fine-tuned): $0.80 input / $3.20 output (2x base price)

> **WARNING**: Fine-tuned inference costs 2x the base model. With only 5 queries/session, the monthly cost increase is small (~$6 → ~$12), but the ROI depends on whether the quality gain is worth it.

---

## 📁 Opportunity #5: Storage — Files Tab (LOW PRIORITY)

**What it is**: General-purpose file storage on OpenAI's platform. Files can be used for fine-tuning, batch processing, or vector store uploads.

**What we'd upload**:

- `corpus.jsonl` → the evidence file
- `facts.json` → the deterministic facts store
- Future: CV/resume documents, project descriptions, certification PDFs

**Cost**: Included in Vector Store pricing ($0.10/GB/day after 1GB free).

---

## ⚙️ Opportunity #6: Batches (VERY LOW PRIORITY)

**What it is**: Submit large batches of API requests at 50% discount, delivered within 24 hours.

**Relevance**: Minimal for our PoC (real-time chatbot, not batch processing). Could be useful for:

- Generating fine-tuning data (batch-process 100 example answers)
- Pre-computing JD analysis results for common job titles

---

## 📋 Opportunity #7: Logs (LOW PRIORITY)

**What it is**: View and analyze API request/response logs in the dashboard.

**Relevance**: Useful for debugging and quality monitoring. Already available.

---

## Priority Roadmap

| Priority | Feature | Impact | Cost | Effort |
|----------|---------|--------|------|--------|
| ★★★ | **Responses API migration** | Future-proof, streaming, built-in tools | $0 extra | Medium |
| ★★★ | **Vector Store** (upload corpus) | Professional RAG, better retrieval | Free (<1GB) | Low |
| ★★☆ | **Evaluation** (quality testing) | Regression testing, CI-ready | ~$0.50/run | Low |
| ★★☆ | **Streaming responses** | Real-time UX, faster perceived speed | $0 extra | Medium |
| ★☆☆ | **Fine-tuning** | Consistent persona, shorter prompts | $0.25 train, 2x inference | Medium |
| ★☆☆ | **Files** (upload evidence) | Dashboard management | Free | Trivial |

## Recommended Phase Plan

### Phase A: Vector Store + Corpus Upload *(immediate)*

Upload `corpus.jsonl` to a Vector Store via the dashboard. Validate search quality in the playground.

### Phase B: Responses API Migration *(next)*

Migrate from `chat/completions` → `responses` API. Enable streaming for real-time UX. Optionally enable `file_search` tool pointed at the Vector Store.

### Phase C: Evals Suite *(after migration)*

Define 20-30 test cases covering all 5 intents + edge cases. Run before each deployment.

### Phase D: Fine-tuning *(optional, later)*

Create training dataset from real user interactions. Fine-tune for persona consistency.
