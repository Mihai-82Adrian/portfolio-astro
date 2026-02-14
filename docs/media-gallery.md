# Media Gallery Workflow (MindHafen)

## Goal
Surface YouTube promo Shorts and Deep Work videos without per-upload SEO overhead, while keeping Spotify embeds in the same gallery.

## YouTube upload workflow
1. Upload Shorts/videos to YouTube as **Unlisted**.
2. Add each upload to the target playlist:
   - Primary playlist: `PLwwUxXP19bWjvvHOKFs4PX3TGak9tbM6O`
3. The website embeds the playlist via `videoseries`; newly added items appear automatically.

## Why this reduces overhead
- No new page per upload.
- No manual route creation or metadata updates per video.
- Single curated playlist acts as a dynamic media feed.

## Data source
- Media items are configured in `src/data/media.ts`.
- Gallery rendering components:
  - `src/components/media/MediaGallery.astro`
  - `src/components/media/MediaCard.astro`
  - `src/components/media/MediaEmbed.astro`
