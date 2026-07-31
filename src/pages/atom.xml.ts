import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') || 'https://me-mateescu.de';
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const sortedPosts = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const updated = sortedPosts[0]?.data.updatedDate ?? sortedPosts[0]?.data.pubDate ?? new Date(0);

  const entries = sortedPosts
    .map((post) => {
      const url = `${site}/blog/${post.id}/`;
      const updatedAt = post.data.updatedDate ?? post.data.pubDate;

      return `
  <entry>
    <title>${escapeXml(post.data.title)}</title>
    <link href="${url}" />
    <id>${url}</id>
    <updated>${updatedAt.toISOString()}</updated>
    <published>${post.data.pubDate.toISOString()}</published>
    <summary>${escapeXml(post.data.description)}</summary>
    <author>
      <name>${escapeXml(post.data.author.name)}</name>
      <email>${escapeXml(post.data.author.email)}</email>
    </author>
    ${[post.data.category, ...post.data.tags]
      .map((term) => `<category term="${escapeXml(term)}" />`)
      .join('\n    ')}
  </entry>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Mihai Adrian Mateescu - Blog</title>
  <subtitle>Articles about AI/ML, finance, FinTech, and software engineering.</subtitle>
  <link href="${site}/atom.xml" rel="self" />
  <link href="${site}/blog/" rel="alternate" />
  <id>${site}/blog/</id>
  <updated>${updated.toISOString()}</updated>
  <author>
    <name>Mihai Adrian Mateescu</name>
    <email>kontakt@me-mateescu.de</email>
  </author>
${entries}
</feed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
    },
  });
}
