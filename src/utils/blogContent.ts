import fs from 'node:fs/promises';
import path from 'node:path';
import type { CollectionEntry } from 'astro:content';
import { calculateReadingTime } from '@/utils/readingTime';

const BLOG_DIR = path.join(process.cwd(), 'src/content/blog');
const BLOG_EXTENSIONS = ['.md', '.mdx'] as const;

async function readBlogSourceById(id: string): Promise<string | null> {
  for (const ext of BLOG_EXTENSIONS) {
    const filePath = path.join(BLOG_DIR, `${id}${ext}`);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      // Try next extension
    }
  }

  return null;
}

export async function getBlogReadingTimeById(id: string) {
  const source = await readBlogSourceById(id);
  return source ? calculateReadingTime(source) : { minutes: 1, text: '1 min read', words: 0 };
}

export async function decoratePostsWithReadingTime(
  posts: CollectionEntry<'blog'>[]
) {
  return Promise.all(
    posts.map(async (post) => ({
      ...post,
      readingTime: post.data.readingTime ?? await getBlogReadingTimeById(post.id),
    }))
  );
}

