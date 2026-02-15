---
name: "frontend-design"
description: "Create distinctive, production-grade frontend interfaces with high design quality for an Astro/Tailwind v4 stack. Generates polished, premium UI that avoids generic AI aesthetics while maintaining professional brand consistency."
argument-hint: "src/**/*.{astro,tsx}"
---

This skill guides the creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code (Astro + Tailwind v4 + React 19) with exceptional attention to aesthetic details, performance, and creative choices.

## Design Thinking

Before coding, understand the context and commit to a PREMIUM aesthetic direction:

- **Purpose**: What problem does this interface solve? Who uses it? (Recruiters, Financial Clients, Tech Peers).
- **Tone**: Unless explicitly asked to experiment, adhere to a **Refined, High-Tech, and Trustworthy** aesthetic. Think "Premium Fintech meets AI Research". Maintain the established "Eucalyptus" color palette and Dark Mode support.
- **Constraints**: Strict adherence to Astro 5/6 architecture, Tailwind v4 utility classes, and Cloudflare edge performance standards.
- **Differentiation**: What makes this UNFORGETTABLE without sacrificing professional credibility? Focus on elegant typography, perfect spacing, and sophisticated micro-interactions.

**CRITICAL**: Execute with precision. Refined minimalism and elegance come from restraint, perfect alignment, and careful attention to subtle details.

## Frontend Aesthetics Guidelines

Focus on:

- **Typography**: Choose fonts that are beautiful, modern, and highly legible. Pair a distinctive display font for headings with a rigorously clean geometric or humanist sans-serif for body text (e.g., tabular numbers for financial data). Avoid generic unstyled system fonts.
- **Color & Theme**: Commit to cohesive aesthetics using Tailwind v4 `@theme` variables. Rely on the "Eucalyptus" primary tones, deep dark backgrounds for contrast, and sharp, intentional accent colors. Avoid clichéd "AI aesthetics" (like generic purple/blue gradients on white backgrounds).
- **Motion**: Use animations to guide the eye and provide feedback, not to distract. Prioritize Tailwind `motion-*` utilities and CSS transitions. Use Astro's `ViewTransitions` for page routing. For complex React islands (`.tsx`), use Framer Motion sparingly and only for high-impact moments (staggered reveals, physics-based interactions).
- **Spatial Composition**: Use generous, intentional negative space. Break out of boring symmetric grids occasionally with subtle asymmetrical layouts, overlapping cards, or Bento Grid structures.
- **Backgrounds & Visual Details**: Create atmosphere and depth. Use subtle noise textures, glassmorphism (backdrop-blur) where appropriate, very soft glowing radial gradients behind key elements, and refined borders (`border-white/10` in dark mode) to define spatial hierarchy.

## Implementation Rules

- **Tech Stack**: NEVER generate raw CSS files, Vue, or generic HTML. Output strictly `.astro` components or `.tsx` React 19 islands styled entirely with **Tailwind v4**.
- Match implementation complexity to the aesthetic vision. A premium financial/tech portfolio needs absolute precision in padding, margins, and typography rendering (`text-balance`, `antialiased`).

Remember: You are capable of extraordinary creative work. Elevate the UI to feel like an expensive, award-winning SaaS product or a top-tier design agency's portfolio, while remaining perfectly functional and accessible.
