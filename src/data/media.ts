export type MediaType =
  | 'youtube_playlist'
  | 'youtube_video'
  | 'spotify_artist'
  | 'spotify_playlist'
  | 'spotify_track';

export type MediaLang = 'de' | 'en' | 'ro';

export interface MediaItem {
  id: string;
  projectId: string;
  type: MediaType;
  title: string;
  localeLabels?: Partial<Record<MediaLang, string>>;
  description?: string;
  localeDescriptions?: Partial<Record<MediaLang, string>>;
  url: string;
  embedUrl: string;
  poster?: string;
  tags: string[];
  featured: boolean;
  date?: string;
}

export const MINDHAFEN_YOUTUBE_PLAYLIST_ID = 'PLwwUxXP19bWjvvHOKFs4PX3TGak9tbM6O';
export const MINDHAFEN_PROMO_CLIPS_PLAYLIST_ID = 'PLwwUxXP19bWhwyfxXOhL6apjp2o0QWvZa';

const mediaItems: MediaItem[] = [
  {
    id: 'mindhafen-spotify-artist',
    projectId: 'mindhafen',
    type: 'spotify_artist',
    title: 'MindHafen on Spotify',
    localeLabels: {
      de: 'MindHafen auf Spotify',
      en: 'MindHafen on Spotify',
      ro: 'MindHafen pe Spotify',
    },
    description: 'Artist profile with latest releases and catalog.',
    localeDescriptions: {
      de: 'Künstlerprofil mit aktuellen Veröffentlichungen und Katalog.',
      en: 'Artist profile with latest releases and catalog.',
      ro: 'Profil de artist cu lansările recente și catalogul complet.',
    },
    url: 'https://open.spotify.com/artist/5E7D3GVsqcPDaWSyxCQHFg',
    embedUrl:
      'https://open.spotify.com/embed/artist/5E7D3GVsqcPDaWSyxCQHFg?utm_source=generator&theme=0',
    poster: '/images/spotify.webp',
    tags: ['spotify', 'featured'],
    featured: true,
    date: '2026-02-14',
  },
  {
    id: 'mindhafen-spotify-deep-focus',
    projectId: 'mindhafen',
    type: 'spotify_playlist',
    title: 'Deep Focus (Spotify Playlist)',
    localeLabels: {
      de: 'Deep Focus (Spotify Playlist)',
      en: 'Deep Focus (Spotify Playlist)',
      ro: 'Deep Focus (Spotify Playlist)',
    },
    description: 'Reference deep-work playlist for focus sessions.',
    localeDescriptions: {
      de: 'Referenz-Playlist für Deep-Work- und Fokus-Sessions.',
      en: 'Reference deep-work playlist for focus sessions.',
      ro: 'Playlist de referință pentru sesiuni de deep work și focus.',
    },
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
    embedUrl:
      'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKCadgRdKQ?utm_source=generator&theme=0',
    poster: '/images/spotify.webp',
    tags: ['spotify', 'deep-work'],
    featured: false,
    date: '2026-02-14',
  },
  {
    id: 'mindhafen-youtube-deep-work',
    projectId: 'mindhafen',
    type: 'youtube_playlist',
    title: 'Deep Work / Focus Media Gallery',
    localeLabels: {
      de: 'Deep Work / Fokus-Mediathek',
      en: 'Deep Work / Focus Media Gallery',
      ro: 'Deep Work / Galerie Focus',
    },
    description: 'Unlisted playlist used for deep-work sessions.',
    localeDescriptions: {
      de: 'Nicht gelistete Playlist für Deep-Work-Sessions.',
      en: 'Unlisted playlist used for deep-work sessions.',
      ro: 'Playlist nelistată folosită pentru sesiuni de deep work.',
    },
    url: `https://www.youtube.com/playlist?list=${MINDHAFEN_YOUTUBE_PLAYLIST_ID}`,
    embedUrl: `https://www.youtube.com/embed/videoseries?list=${MINDHAFEN_YOUTUBE_PLAYLIST_ID}`,
    poster: '/images/yt-long.webp',
    tags: ['youtube', 'deep-work', 'featured'],
    featured: true,
    date: '2026-02-14',
  },
  {
    id: 'mindhafen-youtube-promo-clips',
    projectId: 'mindhafen',
    type: 'youtube_playlist',
    title: 'Promo Clips Media Gallery',
    localeLabels: {
      de: 'Promo-Clips-Mediathek',
      en: 'Promo Clips Media Gallery',
      ro: 'Galerie clipuri promo',
    },
    description: 'Unlisted playlist for promo Shorts and teaser clips.',
    localeDescriptions: {
      de: 'Nicht gelistete Playlist für Promo-Shorts und Teaser-Clips.',
      en: 'Unlisted playlist for promo Shorts and teaser clips.',
      ro: 'Playlist nelistată pentru Shorts promo și clipuri teaser.',
    },
    url: `https://www.youtube.com/playlist?list=${MINDHAFEN_PROMO_CLIPS_PLAYLIST_ID}&pp=sAgC`,
    embedUrl: `https://www.youtube.com/embed/videoseries?list=${MINDHAFEN_PROMO_CLIPS_PLAYLIST_ID}`,
    poster: '/images/yt-shorts.webp',
    tags: ['youtube', 'promo-shorts'],
    featured: true,
    date: '2026-02-14',
  },
];

export function getMediaItems(projectId: string): MediaItem[] {
  return mediaItems
    .filter((item) => item.projectId === projectId)
    .sort((a, b) => Number(b.featured) - Number(a.featured));
}
