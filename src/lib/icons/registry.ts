/**
 * Centralized registry of Lucide icon definitions.
 * Each icon consists of a list of SVG elements (paths, circles, etc.) and their attributes.
 * This replaces the @lucide/svelte library to resolve Astro 6 SSR resolution issues.
 */

export type IconNode = [string, Record<string, string | number>];

export const LUCIDE_ICONS: Record<string, IconNode[]> = {
  AlertCircle: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 12, y1: 8, x2: 12, y2: 12 }],
    ['line', { x1: 12, y1: 16, x2: 12.01, y2: 16 }]
  ],
  AlertTriangle: [
    ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z' }],
    ['line', { x1: 12, y1: 9, x2: 12, y2: 13 }],
    ['line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }]
  ],
  BookOpen: [
    ['path', { d: 'M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z' }],
    ['path', { d: 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z' }]
  ],
  Calculator: [
    ['rect', { width: 16, height: 20, x: 4, y: 2, rx: 2 }],
    ['line', { x1: 8, y1: 6, x2: 16, y2: 6 }],
    ['line', { x1: 16, y1: 14, x2: 16, y2: 14 }],
    ['line', { x1: 16, y1: 18, x2: 16, y2: 18 }],
    ['line', { x1: 12, y1: 14, x2: 12, y2: 14 }],
    ['line', { x1: 12, y1: 18, x2: 12, y2: 18 }],
    ['line', { x1: 8, y1: 14, x2: 8, y2: 14 }],
    ['line', { x1: 8, y1: 18, x2: 8, y2: 18 }]
  ],
  CheckCircle2: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'm9 12 2 2 4-4' }]
  ],
  ChevronDown: [
    ['path', { d: 'm6 9 6 6 6-6' }]
  ],
  ChevronUp: [
    ['path', { d: 'm18 15-6-6-6 6' }]
  ],
  Download: [
    ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
    ['polyline', { points: '7 10 12 15 17 10' }],
    ['line', { x1: 12, x2: 12, y1: 15, y2: 3 }]
  ],
  FileDown: [
    ['path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }],
    ['polyline', { points: '14 2 14 8 20 8' }],
    ['path', { d: 'M12 18v-6' }],
    ['path', { d: 'm9 15 3 3 3-3' }]
  ],
  HelpCircle: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3' }],
    ['line', { x1: 12, y1: 17, x2: 12.01, y2: 17 }]
  ],
  Info: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['line', { x1: 12, y1: 16, x2: 12, y2: 12 }],
    ['line', { x1: 12, y1: 8, x2: 12.01, y2: 8 }]
  ],
  Lightbulb: [
    ['path', { d: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5' }],
    ['line', { x1: 9, y1: 18, x2: 15, y2: 18 }],
    ['line', { x1: 10, y1: 22, x2: 14, y2: 22 }]
  ],
  Lock: [
    ['rect', { width: 18, height: 11, x: 3, y: 11, rx: 2, ry: 2 }],
    ['path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }]
  ],
  Pencil: [
    ['path', { d: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z' }],
    ['path', { d: 'm15 5 4 4' }]
  ],
  Play: [
    ['polygon', { points: '5 3 19 12 5 21 5 3' }]
  ],
  Plus: [
    ['path', { d: 'M5 12h14' }],
    ['path', { d: 'M12 5v14' }]
  ],
  Repeat: [
    ['path', { d: 'm17 1 4 4-4 4' }],
    ['path', { d: 'M3 11V9a4 4 0 0 1 4-4h14' }],
    ['path', { d: 'm7 23-4-4 4-4' }],
    ['path', { d: 'M21 13v2a4 4 0 0 1-4 4H3' }]
  ],
  ShieldAlert: [
    ['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10' }],
    ['path', { d: 'M12 8v4' }],
    ['path', { d: 'M12 16h.01' }]
  ],
  Sparkles: [
    ['path', { d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z' }],
    ['path', { d: 'M5 3L4 4' }],
    ['path', { d: 'M19 3l1 1' }],
    ['path', { d: 'M5 21l-1-1' }],
    ['path', { d: 'M19 21l1-1' }]
  ],
  Target: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['circle', { cx: 12, cy: 12, r: 6 }],
    ['circle', { cx: 12, cy: 12, r: 2 }]
  ],
  Trash2: [
    ['path', { d: 'M3 6h18' }],
    ['path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }],
    ['path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }],
    ['line', { x1: 10, x2: 10, y1: 11, y2: 17 }],
    ['line', { x1: 14, x2: 14, y1: 11, y2: 17 }]
  ],
  TrendingDown: [
    ['polyline', { points: '23 18 13.5 8.5 8.5 13.5 1 6' }],
    ['polyline', { points: '17 18 23 18 23 12' }]
  ],
  TrendingUp: [
    ['polyline', { points: '23 6 13.5 15.5 8.5 10.5 1 18' }],
    ['polyline', { points: '17 6 23 6 23 12' }]
  ],
  Users: [
    ['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }],
    ['circle', { cx: 9, cy: 7, r: 4 }],
    ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87' }],
    ['path', { d: 'M16 3.13a4 4 0 0 1 0 7.75' }]
  ],
  X: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }]
  ],
  Zap: [
    ['path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' }]
  ]
};
