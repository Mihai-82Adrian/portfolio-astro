import defaultTheme from 'tailwindcss/defaultTheme';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Eucalyptus Green - Primary Brand Color (WCAG AA Compliant)
        eucalyptus: {
          50: '#F0F4F1',   // Lightest tint - backgrounds, subtle accents
          100: '#E1EBE4',  // Light tint - hover states, borders
          200: '#C3D7C9',  // Light - cards, surfaces
          300: '#9FBFA8',  // Mid-light - secondary elements
          400: '#7BA888',  // Mid - active states
          500: '#6B8E6F',  // PRIMARY BRAND - main CTA, links, identity
          600: '#557159',  // Dark - hover on primary (WCAG AA: 4.51:1 on #f5f3f0)
          700: '#4A6451',  // Darker - text, active primary (WCAG AA: 5.8:1)
          800: '#3A4E41',  // Very dark - dark mode surfaces
          900: '#2C3832',  // Darkest - dark mode backgrounds
          950: '#1A211D',  // Ultra dark - deep backgrounds
        },
        // Secondary Accent - Warm Taupe/Gold
        taupe: {
          50: '#FAF8F5',
          100: '#F5F3F0',  // Light mode card background
          200: '#E8E4DD',
          300: '#D8D2C7',
          400: '#C9B89B',  // SECONDARY ACCENT - warm gold highlights
          500: '#B8A485',
          600: '#9E8B6C',
          700: '#8B7355',  // Visited link color
          800: '#6F5A41',
          900: '#544433',
        },
        // Semantic Colors
        success: {
          light: '#E8F5E9',
          DEFAULT: '#7BA888', // Fresh Sage
          dark: '#5A8563',
        },
        warning: {
          light: '#FFF8E1',
          DEFAULT: '#D9A74B', // Warm Ochre
          dark: '#B8873D',
        },
        error: {
          light: '#FFEBEE',
          DEFAULT: '#B85C4A', // Muted Terracotta
          dark: '#9A4A3A',
        },
        info: {
          light: '#E0F2F1',
          DEFAULT: '#5B9BA3', // Soft Teal
          dark: '#4A7F85',
        },
        // Dark Mode Specific Colors
        dark: {
          bg: '#0F0F0F',        // Primary dark background (not pure black)
          surface: '#1A1916',   // Card/container backgrounds
          elevated: '#252320',  // Elevated surfaces
          border: '#3A3530',    // Borders
          accent: '#8BC299',    // Lightened eucalyptus for dark mode
        },
        // Light Mode Specific Colors
        light: {
          bg: '#FDFBF8',        // Warm cream background (not pure white)
          surface: '#F5F3F0',   // Card/container backgrounds
          elevated: '#FFFFFF',  // Elevated surfaces (pure white)
          border: '#E8E4DD',    // Borders
        },
        // Text Colors (WCAG 2.2 AA Compliant)
        text: {
          primary: {
            light: '#2C2C2C',   // Dark mode text primary (WCAG AAA: 13.4:1)
            dark: '#E8E6E1',    // Light mode text primary (WCAG AAA: 11.8:1)
          },
          secondary: {
            light: '#5A5A5A',   // Dark mode text secondary (WCAG AA: 7.2:1 on #f5f3f0)
            dark: '#A99E94',    // Light mode text secondary (WCAG AA: 4.7:1)
          },
          tertiary: {
            light: '#6E6E6E',   // Dark mode text tertiary (WCAG AA: 4.92:1 on #f5f3f0, 5.28:1 on #FDFBF8)
            dark: '#6F6760',    // Light mode text tertiary (WCAG AA: 5.8:1)
          },
        },
      },
      fontFamily: {
        // Professional, modern sans-serif for headings and body
        sans: ['Inter', 'Geist', ...defaultTheme.fontFamily.sans],
        // Monospace for code blocks
        mono: ['JetBrains Mono', 'Fira Code', ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        // Typography Scale (8px grid system)
        // Mobile-first with responsive sizing
        'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],     // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px (H3)
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px (H2)
        '5xl': ['3rem', { lineHeight: '3.5rem' }],      // 48px (H1)
        '6xl': ['3.5rem', { lineHeight: '4rem' }],      // 56px (Hero H1)
      },
      spacing: {
        // Additional spacing values for 8px grid system
        // Tailwind's default spacing already follows 4px grid (0.25rem increments)
        // These add common patterns
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '112': '28rem',   // 448px
        '128': '32rem',   // 512px
      },
      borderRadius: {
        DEFAULT: '0.5rem',  // 8px - professional, subtle
        'lg': '1rem',       // 16px - cards
        'xl': '1.5rem',     // 24px - hero sections
      },
      boxShadow: {
        // Subtle shadows for depth
        'subtle': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08)',
        // Dark mode shadows
        'dark-subtle': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'dark-elevated': '0 8px 24px rgba(0, 0, 0, 0.5)',
      },
      maxWidth: {
        'content': '65ch',  // Optimal reading width (65 characters)
        'prose': '75ch',    // Blog posts
        'container': '1200px', // Site container
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.text.primary.light'),
            '--tw-prose-headings': theme('colors.text.primary.light'),
            '--tw-prose-links': theme('colors.eucalyptus.700'),
            '--tw-prose-bold': theme('colors.text.primary.light'),
            '--tw-prose-counters': theme('colors.text.secondary.light'),
            '--tw-prose-bullets': theme('colors.eucalyptus.500'),
            '--tw-prose-hr': theme('colors.light.border'),
            '--tw-prose-quotes': theme('colors.text.secondary.light'),
            '--tw-prose-quote-borders': theme('colors.eucalyptus.300'),
            '--tw-prose-captions': theme('colors.text.secondary.light'),
            '--tw-prose-code': theme('colors.eucalyptus.700'),
            '--tw-prose-pre-code': theme('colors.text.primary.dark'),
            '--tw-prose-pre-bg': theme('colors.dark.surface'),
            '--tw-prose-th-borders': theme('colors.light.border'),
            '--tw-prose-td-borders': theme('colors.light.border'),
            // Line height for body text
            lineHeight: '1.75',
            // Code blocks
            'code': {
              backgroundColor: theme('colors.eucalyptus.50'),
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            // Links
            'a': {
              color: theme('colors.eucalyptus.700'),
              textDecoration: 'none',
              fontWeight: '500',
              '&:hover': {
                color: theme('colors.eucalyptus.600'),
                textDecoration: 'underline',
              },
            },
          },
        },
        // Dark mode typography
        dark: {
          css: {
            '--tw-prose-body': theme('colors.text.primary.dark'),
            '--tw-prose-headings': theme('colors.text.primary.dark'),
            '--tw-prose-links': theme('colors.eucalyptus.300'),
            '--tw-prose-bold': theme('colors.text.primary.dark'),
            '--tw-prose-counters': theme('colors.text.secondary.dark'),
            '--tw-prose-bullets': theme('colors.eucalyptus.400'),
            '--tw-prose-hr': theme('colors.dark.border'),
            '--tw-prose-quotes': theme('colors.text.secondary.dark'),
            '--tw-prose-quote-borders': theme('colors.eucalyptus.700'),
            '--tw-prose-captions': theme('colors.text.secondary.dark'),
            '--tw-prose-code': theme('colors.eucalyptus.300'),
            '--tw-prose-pre-code': theme('colors.text.primary.dark'),
            '--tw-prose-pre-bg': theme('colors.dark.surface'),
            '--tw-prose-th-borders': theme('colors.dark.border'),
            '--tw-prose-td-borders': theme('colors.dark.border'),
            // Code blocks
            'code': {
              backgroundColor: theme('colors.dark.elevated'),
            },
            // Links
            'a': {
              color: theme('colors.eucalyptus.300'),
              '&:hover': {
                color: theme('colors.eucalyptus.200'),
              },
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
