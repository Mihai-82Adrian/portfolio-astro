import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    // Required fields
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),

    // Optional metadata
    updatedDate: z.coerce.date().optional(),
    heroImage: z.string().optional(),

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
      email: 'mihai.mateescu@web.de',
      avatar: '/images/portrait.webp',
    }),

    // Auto-calculated field (will be added via utility)
    readingTime: z.number().optional(),
  }),
});

export const collections = { blog };
