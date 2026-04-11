import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  // Use the glob loader for Astro v6
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/blog" }),
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),

    // Optional metadata
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),

    // Language enforcement (Content Architect V2)
    lang: z.literal('en').default('en'),

    // Taxonomy
    category: z.enum(['finance', 'ai-ml', 'fintech', 'personal']),
    tags: z.array(z.string()),

    // Status flags
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),

    // Author information
    author: z.object({
      name: z.string(),
      email: z.string().email(),
      avatar: z.string().optional(),
    }).default({
      name: 'Mihai Adrian Mateescu',
      email: 'kontakt@me-mateescu.de',
      avatar: '/images/portrait.webp',
    }),

    // Reading time (now expected to be either in data or calculated via render)
    readingTime: z.object({
      minutes: z.number(),
      text: z.string(),
      words: z.number(),
    }).optional(),
  }),
});

export const collections = { blog };
