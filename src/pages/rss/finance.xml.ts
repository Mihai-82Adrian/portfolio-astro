import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  // Get all published finance/fintech blog posts, sorted by date (newest first)
  const posts = await getCollection('blog', ({ data }) =>
    !data.draft && (data.category === 'finance' || data.category === 'fintech')
  );
  const sortedPosts = posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    // RSS feed metadata
    title: 'Mihai Adrian Mateescu - Finance & FinTech Blog',
    description: 'Articles about finance, FinTech, accounting automation, compliance, and the intersection of finance and technology.',
    site: context.site || 'https://me-mateescu.de',

    // RSS feed items
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.slug}/`,

      // Category as RSS category
      categories: [post.data.category, ...post.data.tags],

      // Author information
      author: `${post.data.author.email} (${post.data.author.name})`,

      // Custom namespaces for additional metadata
      customData: [
        post.data.updatedDate
          ? `<atom:updated>${post.data.updatedDate.toISOString()}</atom:updated>`
          : '',
        `<category>${post.data.category}</category>`,
        ...post.data.tags.map(tag => `<category>${tag}</category>`),
      ].filter(Boolean).join('\n'),
    })),

    // XML namespace for Atom extensions
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },

    // Additional RSS customization
    customData: `
      <language>en-us</language>
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
      <atom:link href="${context.site}rss/finance.xml" rel="self" type="application/rss+xml" />
      <category>Finance</category>
      <category>FinTech</category>
    `,

    // Generate full content in RSS
    stylesheet: '/rss-styles.xsl',
  });
}
