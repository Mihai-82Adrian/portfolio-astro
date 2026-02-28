#!/usr/bin/env node
/**
 * Generate OG images (1200×630 WebP) for each Fin-Tool page.
 * Uses sharp + inline SVG — no external dependencies beyond sharp.
 *
 * Usage: node scripts/generate-og-tools.mjs
 * Output: public/images/tools/og-{slug}.webp
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';

const OUT_DIR = 'public/images/tools';
mkdirSync(OUT_DIR, { recursive: true });

const WIDTH = 1200;
const HEIGHT = 630;

// Eucalyptus brand palette
const BG = '#1a1f1a';          // dark surface
const ACCENT = '#6B8E6F';     // eucalyptus-500
const ACCENT_LIGHT = '#8FB393'; // eucalyptus-400
const TEXT = '#f0f0f0';
const MUTED = '#a0a0a0';

const tools = [
  {
    slug: 'xrechnung',
    title: 'XRechnung Generator',
    subtitle: 'EN 16931 · UBL 2.1 · KoSIT v3.0',
    icon: '📄',
  },
  {
    slug: 'startup-runway',
    title: 'Startup Runway',
    subtitle: 'Burn Rate · MRR Growth · Death Valley',
    icon: '📊',
  },
  {
    slug: 'cashflow-forecast',
    title: 'Cashflow & Forecasting',
    subtitle: '12-Month Planner · AI Stress Test',
    icon: '💰',
  },
  {
    slug: 'investment-analytics',
    title: 'Investment Analytics',
    subtitle: 'ROI · IRR · NPV · Monte Carlo · DACH Tax',
    icon: '📈',
  },
  {
    slug: 'salary-tax',
    title: 'Brutto-Netto 2026',
    subtitle: 'BMF PAP · Sozialabgaben · Tax Wedge',
    icon: '🧮',
  },
  {
    slug: 'founder-compass',
    title: 'Founder Compass',
    subtitle: 'AI Entrepreneur Profiler',
    icon: '🧭',
  },
];

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildSvg({ title, subtitle, icon }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="#0f140f"/>
    </linearGradient>
    <linearGradient id="accent-line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0"/>
      <stop offset="20%" stop-color="${ACCENT}"/>
      <stop offset="80%" stop-color="${ACCENT_LIGHT}"/>
      <stop offset="100%" stop-color="${ACCENT_LIGHT}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>

  <!-- Subtle grid pattern -->
  <g opacity="0.04">
    ${Array.from({ length: 20 }, (_, i) => `<line x1="${i * 60}" y1="0" x2="${i * 60}" y2="${HEIGHT}" stroke="${ACCENT}" stroke-width="1"/>`).join('\n    ')}
    ${Array.from({ length: 11 }, (_, i) => `<line x1="0" y1="${i * 60}" x2="${WIDTH}" y2="${i * 60}" stroke="${ACCENT}" stroke-width="1"/>`).join('\n    ')}
  </g>

  <!-- Accent line -->
  <rect x="0" y="0" width="${WIDTH}" height="4" fill="url(#accent-line)"/>

  <!-- Corner accent -->
  <rect x="60" y="80" width="4" height="60" rx="2" fill="${ACCENT}" opacity="0.8"/>

  <!-- Hub label -->
  <text x="84" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${ACCENT}" letter-spacing="2">FIN-TOOLS HUB</text>

  <!-- Icon -->
  <text x="84" y="260" font-family="system-ui, -apple-system, sans-serif" font-size="64">${icon}</text>

  <!-- Title -->
  <text x="84" y="350" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="700" fill="${TEXT}">${escapeXml(title)}</text>

  <!-- Subtitle -->
  <text x="84" y="410" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="${MUTED}">${escapeXml(subtitle)}</text>

  <!-- Bottom bar -->
  <rect x="0" y="${HEIGHT - 80}" width="${WIDTH}" height="80" fill="${BG}" opacity="0.7"/>
  <text x="84" y="${HEIGHT - 35}" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="${MUTED}">me-mateescu.de/tools</text>
  <text x="${WIDTH - 84}" y="${HEIGHT - 35}" font-family="system-ui, -apple-system, sans-serif" font-size="18" fill="${ACCENT}" text-anchor="end">Open Source · Local-First</text>

  <!-- Bottom accent line -->
  <rect x="0" y="${HEIGHT - 4}" width="${WIDTH}" height="4" fill="url(#accent-line)"/>
</svg>`;
}

for (const tool of tools) {
  const svg = buildSvg(tool);
  const outPath = `${OUT_DIR}/og-${tool.slug}.webp`;
  await sharp(Buffer.from(svg)).webp({ quality: 90 }).toFile(outPath);
  const stats = await sharp(outPath).metadata();
  console.log(`✓ ${outPath} (${stats.width}×${stats.height})`);
}

console.log(`\nDone — ${tools.length} OG images generated.`);
