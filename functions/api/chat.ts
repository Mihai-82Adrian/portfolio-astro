
interface Env {
    OPENAI_API_KEY: string;
}

interface Doc {
    id: string;
    url: string;
    title: string;
    sectionTitle?: string;
    text: string;
}

// Global cache for warm starts
let cachedCorpus: Doc[] | null = null;
let corpusEtag: string | null = null;

export const onRequestPost = async (context: any) => {
    const request = context.request;
    const env = context.env as Env;

    if (!env.OPENAI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Missing API Key config' }), { status: 500 });
    }

    try {
        const { message, lang } = await request.json();

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid message' }), { status: 400 });
        }

        // 1. Load Corpus (with caching)
        if (!cachedCorpus) {
            const url = new URL(request.url);
            const corpusUrl = `${url.origin}/corpus.jsonl`;
            console.log(`Loading corpus from ${corpusUrl}`);

            const response = await fetch(corpusUrl);
            if (!response.ok) {
                return new Response(JSON.stringify({ error: 'Failed to load corpus' }), { status: 500 });
            }

            const text = await response.text();
            cachedCorpus = text.trim().split('\n').map((line) => {
                try { return JSON.parse(line) } catch (e) { return null }
            }).filter(Boolean) as Doc[];

            console.log(`Loaded ${cachedCorpus.length} documents.`);
        }

        // 2. Retrieval (Simple BM25-like)
        const query = message.toLowerCase();
        const tokens = query.split(/\W+/).filter((t: string) => t.length > 2);

        // Scorer
        const scoredDocs = cachedCorpus.map(doc => {
            let score = 0;
            const text = (doc.title + ' ' + (doc.sectionTitle || '') + ' ' + doc.text).toLowerCase();

            for (const token of tokens) {
                // Simple term frequency check + title boost
                if (text.includes(token)) {
                    const count = text.split(token).length - 1;
                    score += count;
                    if (doc.title.toLowerCase().includes(token)) score += 5;
                }
            }
            return { doc, score };
        });

        const topDocs = scoredDocs
            .filter(d => d.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(d => d.doc);

        // 3. Construct Prompt
        const systemPrompt = `You are a helpful portfolio assistant for Mihai. 
    Use the provided CONTEXT to answer the user's question. 
    If the answer is not in the context, strictly say "I don't know based on the provided content."
    Cite sources using [Source Name](url) format at the end of relevant sentences.
    Start with a direct answer.`;

        const contextText = topDocs.map(d => `SOURCE: ${d.title} (${d.url})\nCONTENT: ${d.text}`).join('\n\n');

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: `CONTEXT:\n${contextText}\n\nQUESTION: ${message}` }
        ];

        // 4. Call OpenAI
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: messages,
                temperature: 0.3,
                max_tokens: 500
            })
        });

        if (!openAIResponse.ok) {
            const err = await openAIResponse.text();
            console.error('OpenAI Error', err);
            return new Response(JSON.stringify({ error: 'Upstream API error' }), { status: 502 });
        }

        const data: any = await openAIResponse.json();
        const answer = data.choices[0].message.content;

        // 5. Return Response
        return new Response(JSON.stringify({
            answer,
            sources: topDocs.map(d => ({ title: d.title, url: d.url }))
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error(err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
