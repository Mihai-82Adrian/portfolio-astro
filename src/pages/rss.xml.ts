import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  // Get all published blog posts, sorted by date (newest first)
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const sortedPosts = posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  return rss({
    // RSS feed metadata
    title: 'Mihai Adrian Mateescu - Blog',
    description: 'Articles about AI/ML, finance, FinTech, Rust, Julia, and the intersection of technology and accounting.',
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
      <atom:link href="${context.site}rss.xml" rel="self" type="application/rss+xml" />
    `,

    // Generate full content in RSS (can be changed to false for excerpts only)
    stylesheet: '/rss-styles.xsl', // Optional: Add XSL stylesheet for RSS rendering
  });
}
