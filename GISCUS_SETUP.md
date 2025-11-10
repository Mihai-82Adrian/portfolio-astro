# Giscus Configuration

## How to Get Your Giscus IDs

1. Visit: https://giscus.app
2. Enter repository: `Mihai-82Adrian/portfolio-astro`
3. Select category: **General** (or create a new one like "Blog Comments")
4. Copy the generated configuration values:
   - `data-repo-id`
   - `data-category-id`

## Current Configuration (PLACEHOLDER - UPDATE AFTER GISCUS.APP VISIT)

```javascript
REPO: "Mihai-82Adrian/portfolio-astro"
REPO_ID: "R_kgDOQTF7rw" // ← Update this from giscus.app
CATEGORY: "General"
CATEGORY_ID: "DIC_kwDOQTF7r84ClL8Q" // ← Update this from giscus.app
```

## Steps to Complete Setup

1. ✅ GitHub Discussions enabled
2. ⏳ Visit https://giscus.app and get correct IDs
3. ⏳ Update `src/components/blog/Comments.astro` with correct IDs
4. ⏳ Test on a blog post

## Theme Configuration

- **Light Mode**: Uses GitHub light theme
- **Dark Mode**: Uses GitHub dark theme
- **Auto-switch**: Component listens for theme toggle and updates iframe

## Mapping Strategy

Using `pathname` mapping:
- Each blog post URL gets its own discussion thread
- Example: `/blog/julia-performance-optimization/` → Unique discussion
- Discussions are automatically created on first comment

## Alternative: Title Mapping

If you prefer title-based mapping (less precise):
- Change `data-mapping="pathname"` to `data-mapping="title"`
- Discussions match blog post title

**Pathname is recommended for blogs** to avoid conflicts with similar titles.
