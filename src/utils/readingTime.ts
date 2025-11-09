/**
 * Calculate reading time for blog content
 * @param content - Markdown or plain text content
 * @param wordsPerMinute - Average reading speed (default: 200 wpm)
 * @returns Reading time object with minutes and formatted text
 */
export function calculateReadingTime(
  content: string,
  wordsPerMinute: number = 200
): { minutes: number; text: string; words: number } {
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---/, '');
  
  // Remove markdown syntax for accurate word count
  const plainText = withoutFrontmatter
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]*`/g, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove markdown links
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove markdown headings
    .replace(/^#+\s+/gm, '')
    // Remove markdown emphasis
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1');

  // Count words (split by whitespace)
  const words = plainText.trim().split(/\s+/).filter(w => w.length > 0).length;

  // Calculate reading time in minutes
  const minutes = Math.max(1, Math.ceil(words / wordsPerMinute));
  
  // Format text
  const text = minutes === 1 ? '1 min read' : `${minutes} min read`;

  return { minutes, text, words };
}

/**
 * Format reading time as human-readable string
 * @param minutes - Reading time in minutes
 * @param locale - Language locale (default: 'en')
 * @returns Formatted string like "5 min read"
 */
export function formatReadingTime(minutes: number, locale: string = 'en'): string {
  const labels = {
    en: `${minutes} min read`,
    de: `${minutes} Min. Lesezeit`,
    ro: `${minutes} min citit`,
  };

  return labels[locale as keyof typeof labels] || labels.en;
}
