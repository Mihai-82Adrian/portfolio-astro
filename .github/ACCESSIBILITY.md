# Accessibility Manual Testing Guide

## Overview

This guide provides step-by-step instructions for manual accessibility testing to ensure WCAG 2.2 AA compliance before production deployment.

**Target Standard:** WCAG 2.2 Level AA
**Test Duration:** ~3-4 hours
**Tools Needed:** Browser, keyboard, screen reader (NVDA/VoiceOver)

---

## 1. Keyboard Navigation Testing (60 minutes)

### Prerequisites
- Close all browser extensions (they may interfere with keyboard navigation)
- Test in both light and dark modes

### Test Pages
- [ ] Homepage (`/`)
- [ ] About page (`/about`)
- [ ] Experience page (`/experience`)
- [ ] Blog listing (`/blog`)
- [ ] Blog post detail (`/blog/*`)
- [ ] Projects section (`/projects`)
- [ ] Contact section (on homepage)

### Test Checklist

#### 1.1 Tab Order (WCAG 2.4.3)

**Goal:** Ensure logical keyboard navigation order

**Steps:**
1. Press `Tab` repeatedly from the top of the page
2. Verify focus moves in a logical order:
   - Skip to main content link (should be first)
   - Header navigation (logo → links)
   - Main content (top to bottom, left to right)
   - Sidebar (if present)
   - Footer links

**Expected Result:**
- ✅ Focus follows visual layout
- ✅ No trapped focus (can always Tab forward/backward)
- ✅ No focus jumps (skipping visible elements)

**Common Issues:**
- ❌ Focus trapped in modal/overlay
- ❌ Focus moves to hidden elements
- ❌ Focus order differs from visual order

---

#### 1.2 Focus Indicator Visibility (WCAG 2.4.7)

**Goal:** All interactive elements show clear focus indicator

**Steps:**
1. Tab to each interactive element:
   - Links
   - Buttons
   - Form inputs
   - Theme toggle
   - Search input
   - TOC links
2. Verify visible focus indicator (outline or highlight)

**Expected Result:**
- ✅ Focus indicator visible on ALL elements
- ✅ Contrast ratio ≥ 3:1 against background
- ✅ At least 2px thick (or equivalent visual weight)

**CSS Used:**
```css
:focus-visible {
  outline: 2px solid theme('colors.eucalyptus.500');
  outline-offset: 2px;
}
```

---

#### 1.3 Interactive Element Activation (WCAG 2.1.1)

**Goal:** All interactive elements work with keyboard

**Test:**

| Element | Key | Expected Behavior |
|---------|-----|------------------|
| Links | `Enter` | Navigates to destination |
| Buttons | `Enter` or `Space` | Activates button |
| Theme toggle | `Enter` or `Space` | Toggles dark/light mode |
| Search input | `Tab` | Focus moves to input |
| TOC toggle (mobile) | `Enter` or `Space` | Expands/collapses TOC |
| Timeline items | `Tab` | Focus moves through timeline |
| Newsletter form | `Tab` → `Enter` | Focus form → Submit |

**Expected Result:**
- ✅ All elements respond to appropriate keys
- ✅ No elements require mouse-only interaction

---

#### 1.4 Skip to Main Content (WCAG 2.4.1)

**Goal:** Bypass repeated navigation blocks

**Steps:**
1. Load any page
2. Press `Tab` once (focus should move to "Skip to main content" link)
3. Press `Enter`
4. Verify focus moves to main content area

**Expected Result:**
- ✅ Skip link visible on focus
- ✅ Clicking skip link moves focus to `<main id="main-content">`
- ✅ URL hash updates (e.g., `/#main-content`)

---

#### 1.5 No Keyboard Trap (WCAG 2.1.2)

**Goal:** User can navigate away from every element

**Test:**
1. Tab to each interactive element
2. Verify you can Tab forward (next element)
3. Verify you can Shift+Tab backward (previous element)
4. Press `Esc` on overlays/modals (should close)

**Known Potential Traps:**
- Search input (Pagefind UI)
- Newsletter form
- TOC on mobile (when expanded)
- Comments (Giscus iframe)

**Expected Result:**
- ✅ No element traps keyboard focus
- ✅ Can always navigate away with Tab/Shift+Tab
- ✅ `Esc` closes dismissible components

---

### Keyboard Testing Results Template

```markdown
## Keyboard Navigation Test Results

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Browser:** Chrome 120 / Firefox 121 / Safari 17

| Test | Homepage | About | Experience | Blog List | Blog Post | Projects |
|------|----------|-------|-----------|-----------|-----------|----------|
| Tab Order | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Focus Visible | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Activation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Skip Link | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| No Trap | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Issues Found:** None / [List issues]

**Status:** ✅ PASSED / ❌ FAILED
```

---

## 2. Screen Reader Testing (90 minutes)

### Tools

**Windows:**
- **NVDA** (free, recommended): [https://www.nvaccess.org/download/](https://www.nvaccess.org/download/)
- **JAWS** (commercial, free trial): [https://www.freedomscientific.com/downloads/jaws](https://www.freedomscientific.com/downloads/jaws)

**macOS:**
- **VoiceOver** (built-in): Press `Cmd + F5` to enable

**Mobile:**
- **iOS VoiceOver**: Settings → Accessibility → VoiceOver
- **Android TalkBack**: Settings → Accessibility → TalkBack

---

### NVDA Quickstart (Windows)

1. **Install NVDA:**
   - Download from [https://www.nvaccess.org/download/](https://www.nvaccess.org/download/)
   - Run installer
   - Choose "Install NVDA on this computer"

2. **Basic Commands:**
   - `Ctrl` - Stop speech
   - `Insert + Down Arrow` - Read all (from current position)
   - `Insert + T` - Read page title
   - `Insert + F7` - List all headings
   - `Insert + F5` - Refresh element list
   - `H` - Next heading
   - `Shift + H` - Previous heading
   - `K` - Next link
   - `Shift + K` - Previous link
   - `B` - Next button
   - `F` - Next form field
   - `Insert + Q` - Quit NVDA

3. **Testing Workflow:**
   ```
   1. Start NVDA (Desktop shortcut or Ctrl+Alt+N)
   2. Open browser (Chrome/Firefox recommended)
   3. Navigate to portfolio site
   4. Press Insert + Down Arrow (reads entire page)
   5. Use H to jump between headings
   6. Use K to jump between links
   7. Verify all content is announced
   ```

---

### VoiceOver Quickstart (macOS)

1. **Enable VoiceOver:**
   - Press `Cmd + F5`
   - Or: System Preferences → Accessibility → VoiceOver → Enable

2. **Basic Commands:**
   - `Ctrl` - Stop speech
   - `VO + A` - Read all (VO = Ctrl + Option)
   - `VO + Right/Left Arrow` - Navigate elements
   - `VO + Space` - Activate element
   - `VO + H` - Next heading
   - `VO + Shift + H` - Previous heading
   - `VO + Command + H` - Heading rotor
   - `VO + U` - Open rotor (lists headings, links, forms)

3. **Testing Workflow:**
   ```
   1. Press Cmd + F5 (enable VoiceOver)
   2. Open Safari or Chrome
   3. Navigate to portfolio site
   4. Press VO + A (reads entire page)
   5. Press VO + U (opens rotor)
   6. Verify all headings are listed correctly
   7. Navigate with VO + Arrow keys
   ```

---

### Screen Reader Test Checklist

#### 2.1 Page Structure (WCAG 1.3.1)

**Goal:** Screen reader announces semantic structure

**Test:**
1. Enable screen reader
2. Press heading navigation key (H in NVDA, VO+U in VoiceOver)
3. Verify heading hierarchy:
   ```
   Homepage:
   H1: "Mihai Adrian Mateescu"
   H2: "About Me"
   H2: "Skills"
   H2: "Recent Blog Posts"
   H2: "Contact"

   Blog Post:
   H1: [Article Title]
   H2: "Table of Contents" (if present)
   H2: [First Major Section]
   H3: [Subsection]
   ```

**Expected Result:**
- ✅ Only ONE `<h1>` per page
- ✅ Headings in logical order (no skipped levels)
- ✅ Headings describe content structure

**Common Issues:**
- ❌ Multiple `<h1>` tags
- ❌ Skipped heading levels (H1 → H3)
- ❌ Headings used for styling (non-semantic)

---

#### 2.2 Landmark Regions (WCAG 1.3.1)

**Goal:** Screen reader announces page landmarks

**Test:**
1. Enable screen reader
2. Navigate by landmarks:
   - NVDA: `Insert + F7` → Landmarks tab
   - VoiceOver: `VO + U` → Landmarks rotor

**Expected Landmarks:**
- `<header>` or `role="banner"` - Site header
- `<nav>` or `role="navigation"` - Main navigation
- `<main>` or `role="main"` - Main content
- `<aside>` or `role="complementary"` - Sidebar (if present)
- `<footer>` or `role="contentinfo"` - Site footer

**Expected Result:**
- ✅ All major page sections have semantic landmarks
- ✅ Screen reader announces landmark when entering
- ✅ Users can jump between landmarks

---

#### 2.3 Link Text (WCAG 2.4.4)

**Goal:** Link purpose clear from text alone

**Test:**
1. List all links (NVDA: `Insert + F7` → Links)
2. Verify each link text is descriptive:
   - ✅ Good: "Read more about Rust lifetimes"
   - ❌ Bad: "Read more", "Click here", "Link"

**Pages to Check:**
- Blog listing (post titles as links)
- Navigation menu
- Footer links
- Related posts
- "Read more" links (should include post title)

**Expected Result:**
- ✅ All links have unique, descriptive text
- ✅ No generic "click here" or "read more" links
- ✅ Link text explains destination

---

#### 2.4 Images (WCAG 1.1.1)

**Goal:** All images have appropriate alt text

**Test:**
1. Navigate to images
2. Verify screen reader announces:
   - Alt text (descriptive)
   - "Image" or "Graphic" (role)

**Alt Text Rules:**
- **Decorative images:** `alt=""` (empty, screen reader skips)
- **Informative images:** Describe content/function
- **Logo:** "Mihai Adrian Mateescu" (not "Logo")
- **Hero image:** Describe scene or leave empty if purely decorative
- **Blog post images:** Descriptive alt text explaining content

**Expected Result:**
- ✅ All non-decorative images have alt text
- ✅ Alt text is concise and meaningful
- ✅ Decorative images have `alt=""`

---

#### 2.5 Forms (WCAG 1.3.1, 3.3.2)

**Goal:** Form fields have accessible labels and error messages

**Test:**
1. Navigate to forms:
   - Newsletter signup
   - Search input
   - Contact form (if present)
2. Verify screen reader announces:
   - Field label (e.g., "Email address")
   - Field type (e.g., "Edit text")
   - Required status (if applicable)
   - Error messages (if validation fails)

**Newsletter Form Test:**
1. Tab to email input
2. Verify announces: "Email address, edit text, required"
3. Tab to topic checkboxes
4. Verify announces: "Finance & Automation, checkbox, checked"
5. Tab to submit button
6. Verify announces: "Subscribe, button"
7. Submit without email
8. Verify error announced: "Please enter a valid email address"

**Expected Result:**
- ✅ All form fields have `<label>` associated via `for` attribute
- ✅ Error messages announced when validation fails
- ✅ Required fields indicated (visually and to screen readers)

---

#### 2.6 Table of Contents (Blog Posts)

**Goal:** TOC navigation works with screen reader

**Test:**
1. Open blog post with TOC
2. Navigate to TOC
3. Verify:
   - Announces as navigation landmark
   - Each link announces heading text
   - Current active link indicated (ARIA)

**Expected Result:**
- ✅ TOC announced as "navigation" region
- ✅ Links announce destination (heading text)
- ✅ Active link has `aria-current="true"` (when scrolled to)

---

#### 2.7 Comments Section (Giscus)

**Goal:** Comments iframe is accessible

**Test:**
1. Navigate to comments section
2. Verify:
   - Announces "Comments" heading before iframe
   - Can enter iframe with keyboard
   - Can navigate comments with screen reader

**Note:** Giscus is a third-party component. Test basic accessibility, but full control is limited.

**Expected Result:**
- ✅ "Comments" heading present before iframe
- ✅ Can Tab into iframe
- ✅ Giscus provides own accessibility features

---

### Screen Reader Testing Results Template

```markdown
## Screen Reader Test Results

**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Screen Reader:** NVDA 2024.1 / VoiceOver (macOS 14)
**Browser:** Chrome 120 / Safari 17

| Test | Result | Notes |
|------|--------|-------|
| Page Structure | ✅ | Heading hierarchy correct on all pages |
| Landmarks | ✅ | Header, nav, main, footer present |
| Link Text | ✅ | All links descriptive |
| Images | ✅ | Alt text appropriate, decorative images skipped |
| Forms | ✅ | Labels associated, errors announced |
| TOC | ✅ | Navigation works, active link indicated |
| Comments | ⚠️ | Giscus iframe accessible, limited control |

**Overall Status:** ✅ PASSED / ❌ FAILED

**Issues Found:** None / [List issues]
```

---

## 3. Color Contrast Verification (30 minutes)

### Automated Check

Already completed via `scripts/check-contrast.js`. All 20 combinations pass WCAG AA.

### Manual Visual Check

**Goal:** Verify contrast in real browser (different from calculations)

**Tools:**
- Chrome DevTools: Inspect → Accessibility pane → Contrast ratio
- Firefox DevTools: Inspect → Accessibility → Check for Issues
- Browser extension: [axe DevTools](https://www.deque.com/axe/devtools/)

**Test:**
1. Install axe DevTools extension
2. Open DevTools (F12)
3. Go to "axe DevTools" tab
4. Click "Scan ALL of my page"
5. Review color contrast issues (should be zero)

**Pages to Check:**
- [ ] Homepage (light mode)
- [ ] Homepage (dark mode)
- [ ] Blog listing (light mode)
- [ ] Blog listing (dark mode)
- [ ] Blog post (light mode)
- [ ] Blog post (dark mode)

**Expected Result:**
- ✅ Zero color contrast failures
- ✅ All text meets 4.5:1 ratio (normal text)
- ✅ All text meets 3:1 ratio (large text, 18pt+ or 14pt+ bold)

---

## 4. Responsive Design Testing (30 minutes)

### Viewports to Test

| Device | Viewport | Browser |
|--------|----------|---------|
| Mobile (iPhone SE) | 375x667 | Chrome, Safari |
| Tablet (iPad) | 768x1024 | Safari |
| Desktop (1080p) | 1920x1080 | Chrome, Firefox |
| Desktop (1440p) | 2560x1440 | Chrome |

### Test Checklist

#### 4.1 Mobile (375px)

- [ ] All text readable (no horizontal scroll)
- [ ] Touch targets ≥ 44x44px (WCAG 2.5.5)
- [ ] Navigation accessible (hamburger menu if present)
- [ ] Images scale appropriately
- [ ] No content overlap
- [ ] Forms usable with touch

#### 4.2 Tablet (768px)

- [ ] Layout adapts (2-column grid where appropriate)
- [ ] Navigation expanded (no hamburger)
- [ ] Touch targets still ≥ 44x44px
- [ ] Sidebar visible (if applicable)

#### 4.3 Desktop (1920px+)

- [ ] Content centered with max-width (not full screen)
- [ ] Readable line length (65-75 characters)
- [ ] Hover states work
- [ ] Focus indicators visible

---

## 5. Final Checklist (30 minutes)

### Pre-Deployment Verification

- [ ] All keyboard navigation tests pass
- [ ] Screen reader announces all content correctly
- [ ] Color contrast passes automated and manual checks
- [ ] Responsive design works on all viewports
- [ ] No JavaScript console errors
- [ ] No missing images (404s)
- [ ] Forms validate and submit correctly
- [ ] Dark mode toggle works
- [ ] Search functionality works
- [ ] RSS feeds validate (https://validator.w3.org/feed/)
- [ ] Sitemap generated (`/sitemap-index.xml`)
- [ ] Robots.txt present (`/robots.txt`)

### Known Limitations (Document These)

1. **Giscus Comments:** Third-party iframe, limited accessibility control
2. **Pagefind Search:** Third-party component, tested but not fully customizable
3. **Hero Images:** Some decorative images may not add value for screen reader users (marked with `alt=""`)

---

## 6. Accessibility Statement (Optional)

Consider adding an accessibility statement page (`/accessibility`) documenting:

1. Conformance level (WCAG 2.2 AA)
2. Known issues and workarounds
3. Contact for accessibility feedback
4. Date of last audit

**Example:**
```markdown
# Accessibility Statement

This website aims to conform to WCAG 2.2 Level AA standards.

**Conformance Status:** Partially Conformant

**Known Issues:**
- Giscus comments (third-party) may have limited screen reader support

**Feedback:** Contact mihai.mateescu@web.de with accessibility concerns.

**Last Audit:** 2025-11-14
```

---

## Resources

### Tools
- **NVDA:** https://www.nvaccess.org/
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **Lighthouse:** Built into Chrome DevTools

### Guidelines
- **WCAG 2.2:** https://www.w3.org/WAI/WCAG22/quickref/
- **WebAIM Checklist:** https://webaim.org/standards/wcag/checklist

### Testing Services
- **NVDA Training:** https://www.nvaccess.org/get-help/
- **VoiceOver Guide:** https://support.apple.com/guide/voiceover/welcome/mac

---

**Status:** ⏳ PENDING MANUAL TESTING
**Estimated Time:** 3-4 hours
**Last Updated:** 2025-11-14
