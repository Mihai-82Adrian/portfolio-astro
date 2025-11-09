/**
 * Related posts utility functions
 */

import type { CollectionEntry } from 'astro:content';

/**
 * Calculate similarity score between two blog posts
 * @param currentPost - The current post to find related posts for
 * @param comparePost - The post to compare against
 * @returns Similarity score (higher is more similar)
 */
export function calculateSimilarity(
  currentPost: CollectionEntry<'blog'>,
  comparePost: CollectionEntry<'blog'>
): number {
  let score = 0;

  // Same category: +10 points (strong indicator)
  if (currentPost.data.category === comparePost.data.category) {
    score += 10;
  }

  // Shared tags: +3 points each (good indicator)
  const currentTags = currentPost.data.tags || [];
  const compareTags = comparePost.data.tags || [];
  const sharedTags = currentTags.filter(tag => compareTags.includes(tag));
  score += sharedTags.length * 3;

  // Recency bonus: More recent posts get slight boost (0-2 points)
  const daysDiff = Math.abs(
    (currentPost.data.pubDate.getTime() - comparePost.data.pubDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff < 30) {
    score += 2; // Published within 30 days
  } else if (daysDiff < 90) {
    score += 1; // Published within 90 days
  }

  return score;
}

/**
 * Get related posts for a given blog post
 * @param currentPost - The current post to find related posts for
 * @param allPosts - Array of all blog posts
 * @param limit - Maximum number of related posts to return (default: 3)
 * @returns Array of related posts sorted by relevance
 */
export function getRelatedPosts(
  currentPost: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  limit: number = 3
): CollectionEntry<'blog'>[] {
  return allPosts
    .filter(post => 
      post.slug !== currentPost.slug && // Exclude current post
      !post.data.draft // Exclude drafts
    )
    .map(post => ({
      post,
      score: calculateSimilarity(currentPost, post)
    }))
    .filter(item => item.score > 0) // Only include posts with some similarity
    .sort((a, b) => {
      // Sort by score (descending), then by date (descending)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf();
    })
    .slice(0, limit)
    .map(item => item.post);
}

/**
 * Get posts from the same category
 * @param category - The category to filter by
 * @param allPosts - Array of all blog posts
 * @param excludeSlug - Post slug to exclude (usually current post)
 * @param limit - Maximum number of posts to return (default: 3)
 * @returns Array of posts from the same category
 */
export function getPostsByCategory(
  category: string,
  allPosts: CollectionEntry<'blog'>[],
  excludeSlug?: string,
  limit: number = 3
): CollectionEntry<'blog'>[] {
  return allPosts
    .filter(post => 
      post.data.category === category &&
      !post.data.draft &&
      post.slug !== excludeSlug
    )
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, limit);
}

/**
 * Get posts with a specific tag
 * @param tag - The tag to filter by
 * @param allPosts - Array of all blog posts
 * @param excludeSlug - Post slug to exclude (usually current post)
 * @param limit - Maximum number of posts to return (default: 3)
 * @returns Array of posts with the specified tag
 */
export function getPostsByTag(
  tag: string,
  allPosts: CollectionEntry<'blog'>[],
  excludeSlug?: string,
  limit: number = 3
): CollectionEntry<'blog'>[] {
  return allPosts
    .filter(post => 
      (post.data.tags || []).includes(tag) &&
      !post.data.draft &&
      post.slug !== excludeSlug
    )
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, limit);
}
