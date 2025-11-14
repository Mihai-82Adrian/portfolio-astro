# Deployment Guide

## Overview

This portfolio is deployed to **Cloudflare Pages** with automated CI/CD via GitHub Actions.

---

## Architecture

```
┌─────────────────┐
│   GitHub Repo   │
│   (main branch) │
└────────┬────────┘
         │ git push
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  - Type check   │
│  - Color test   │
│  - Build        │
└────────┬────────┘
         │ npm run build
         ▼
┌─────────────────┐
│ Cloudflare      │
│ Pages Deploy    │
│  (dist/)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  me-mateescu.de │
│  (Production)   │
└─────────────────┘
```

---

## Prerequisites

### 1. Cloudflare Account

Create a free Cloudflare account at [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

### 2. Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **My Profile** → **API Tokens**
3. Click **Create Token**
4. Use the **Cloudflare Pages** template
5. **Permissions:**
   - Account - Cloudflare Pages: Edit
   - Zone - DNS: Edit (for custom domains)
6. **Account Resources:**
   - Include: Your Account
7. **Zone Resources:**
   - Include: me-mateescu.de
8. Click **Continue to summary** → **Create Token**
9. **Copy the token** (you won't see it again!)

### 3. Cloudflare Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain (me-mateescu.de)
3. Scroll down on the Overview page
4. Find **Account ID** in the right sidebar
5. Copy the ID (format: `1234567890abcdef1234567890abcdef`)

---

## Setup Instructions

### Step 1: Add GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

| Secret Name | Value | Example |
|------------|-------|---------|
| `CLOUDFLARE_API_TOKEN` | API token from above | `abc123...xyz789` |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from above | `1234567890abcdef...` |

**Security Note:** These secrets are encrypted and not visible after creation.

---

### Step 2: Create Cloudflare Pages Project

#### Option A: Via Dashboard (Recommended for First Time)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Pages** in the left sidebar
3. Click **Create a project**
4. Select **Connect to Git**
5. Authorize GitHub access
6. Select repository: `Mihai-82Adrian/portfolio-astro`
7. **Build settings:**
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
   - Environment variables:
     - `NODE_VERSION`: `20`
8. Click **Save and Deploy**

#### Option B: Via API (Automated by GitHub Actions)

If you've already set up GitHub secrets, the workflow will auto-create the project on first push.

---

### Step 3: Configure Custom Domain

1. In Cloudflare Pages project, go to **Custom domains**
2. Click **Set up a custom domain**
3. Enter: `me-mateescu.de`
4. Cloudflare will auto-detect DNS settings
5. Click **Activate domain**
6. DNS records will be automatically configured:
   - `CNAME me-mateescu.de` → `portfolio-astro.pages.dev`
7. Wait 2-5 minutes for SSL certificate provisioning

---

### Step 4: DNS Migration from IONOS

**Current Setup (IONOS):**
- Nameservers: IONOS default
- Domain: me-mateescu.de
- Cost: €60-210/year

**New Setup (Cloudflare):**
- Nameservers: Cloudflare
- Domain: me-mateescu.de
- Cost: **FREE** (includes SSL, CDN, analytics)

#### Migration Steps:

1. **Add Domain to Cloudflare:**
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Click **Add a site**
   - Enter `me-mateescu.de`
   - Select **Free** plan
   - Click **Continue**

2. **Review DNS Records:**
   - Cloudflare scans and imports existing IONOS DNS records
   - Verify all records are correct:
     - `A` records for root domain
     - `CNAME` records for subdomains
     - `MX` records for email (if applicable)
     - `TXT` records for verification
   - Click **Continue**

3. **Update Nameservers at IONOS:**
   - Cloudflare provides 2 nameservers (e.g., `dana.ns.cloudflare.com`, `manny.ns.cloudflare.com`)
   - Login to [IONOS Control Panel](https://www.ionos.de/)
   - Go to **Domains** → **me-mateescu.de** → **DNS Settings**
   - Click **Manage Nameservers**
   - Replace IONOS nameservers with Cloudflare's:
     ```
     Old: ns1.ionos.de, ns2.ionos.de
     New: dana.ns.cloudflare.com, manny.ns.cloudflare.com
     ```
   - Save changes

4. **Wait for Propagation:**
   - DNS changes take 24-48 hours globally
   - Check status: [https://www.whatsmydns.net/](https://www.whatsmydns.net/)
   - Enter `me-mateescu.de` and check nameservers worldwide

5. **Verify SSL Certificate:**
   - Once DNS propagates, Cloudflare auto-provisions SSL
   - Go to **SSL/TLS** tab in Cloudflare
   - Set encryption mode: **Full (strict)**
   - Enable **Always Use HTTPS**
   - Enable **Automatic HTTPS Rewrites**

6. **Enable Performance Features:**
   - Go to **Speed** → **Optimization**
   - Enable:
     - ✅ Auto Minify (JavaScript, CSS, HTML)
     - ✅ Brotli compression
     - ✅ Early Hints
     - ✅ HTTP/3 (QUIC)
   - Go to **Caching** → **Configuration**
   - Set **Browser Cache TTL**: 1 hour
   - Enable **Tiered Caching**

7. **Cancel IONOS Hosting (Optional):**
   - After successful migration (wait 1-2 weeks to be safe)
   - Cancel IONOS hosting plan
   - Keep domain registered at IONOS (or transfer to Cloudflare Registrar for cost savings)
   - **Annual Savings:** €60-210

---

## GitHub Actions Workflows

### 1. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` or `master` branch
- Manual trigger via **Actions** tab

**Jobs:**
1. **Quality Checks** (2-3 minutes)
   - TypeScript type checking (`astro check`)
   - Color contrast verification (WCAG AA)
   - Fails deployment if checks don't pass

2. **Build & Deploy** (3-5 minutes)
   - Install dependencies
   - Build Astro site
   - Deploy to Cloudflare Pages
   - Generate deployment summary

3. **Lighthouse Audit** (2-3 minutes, production only)
   - Wait for deployment to propagate
   - Run Lighthouse CI on key pages
   - Upload results as artifacts

**Total Time:** ~8-11 minutes per deployment

---

### 2. Quality Checks Workflow (`.github/workflows/quality.yml`)

**Triggers:**
- Pull requests to `main` or `master`
- Manual trigger via **Actions** tab

**Jobs:**
1. **Lint & Type Check**
   - Astro template validation
   - TypeScript strict mode checks
   - Color contrast verification

2. **Build Test**
   - Full production build
   - Verify page count (minimum 50 pages)
   - Upload dist artifacts

3. **Accessibility Audit**
   - Download build artifacts
   - Start local HTTP server
   - Run axe-core tests on key pages
   - Generate accessibility report

4. **Quality Summary**
   - Aggregate results from all jobs
   - Display pass/fail table in PR comments

---

## Manual Deployment (Fallback)

If GitHub Actions is unavailable, deploy manually:

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Build site
npm run build

# 4. Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=portfolio-astro
```

---

## Monitoring & Analytics

### Cloudflare Web Analytics (Privacy-Friendly)

1. Go to **Web Analytics** in Cloudflare Dashboard
2. Click **Add a site**
3. Enter `me-mateescu.de`
4. Copy the JavaScript snippet
5. Add to `src/layouts/BaseLayout.astro` (already integrated)

**Metrics Tracked:**
- Page views
- Unique visitors
- Top pages
- Referrers
- Browser/OS distribution
- Geographic distribution

**Privacy:** No cookies, GDPR-compliant, no personal data collected

---

### Cloudflare Real-Time Logs (Optional)

For advanced monitoring:

1. Go to **Analytics** → **Logs**
2. Enable **Logpush**
3. Configure destination (e.g., AWS S3, Google Cloud Storage)

---

## Rollback Procedure

If deployment fails or introduces bugs:

### Method 1: Cloudflare Dashboard

1. Go to Cloudflare Pages project
2. Click **View build history**
3. Find the last working deployment
4. Click **...** → **Rollback to this deployment**
5. Confirm rollback

### Method 2: Git Revert + Redeploy

```bash
# 1. Find the last working commit
git log --oneline

# 2. Revert to that commit
git revert <commit-hash>

# 3. Push to trigger new deployment
git push origin main
```

---

## Troubleshooting

### Build Fails: "Module not found"

**Cause:** Missing dependencies in `package.json`

**Fix:**
```bash
npm install <missing-package>
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

---

### Color Contrast Test Fails

**Cause:** New colors don't meet WCAG AA standards (4.5:1 ratio)

**Fix:**
1. Check `scripts/check-contrast.js` output
2. Identify failing color combinations
3. Adjust colors in `tailwind.config.mjs`
4. Run `node scripts/check-contrast.js` locally
5. Commit and push once passing

---

### Cloudflare Deployment Times Out

**Cause:** Build exceeds 20-minute limit

**Fix:**
1. Check build logs in GitHub Actions
2. Optimize dependencies (remove unused packages)
3. Consider using `npm ci --legacy-peer-deps` if peer dependency conflicts

---

### SSL Certificate Not Provisioning

**Cause:** DNS not fully propagated or misconfigured

**Fix:**
1. Verify nameservers: `dig NS me-mateescu.de`
2. Check DNS records in Cloudflare Dashboard
3. Wait 24-48 hours for global propagation
4. If still failing, go to **SSL/TLS** → **Edge Certificates** → **Order Certificate**

---

## Performance Optimization

### Current Metrics (Lighthouse)

| Page | Performance | Accessibility | Best Practices | SEO |
|------|------------|--------------|---------------|-----|
| Homepage | 97/100 | 92/100 | 96/100 | 100/100 |
| Blog | 100/100 | 92/100 | 96/100 | 100/100 |
| About | 97/100 | 92/100 | 96/100 | 100/100 |

### Cloudflare Optimizations Applied

- ✅ Auto Minify (JS, CSS, HTML)
- ✅ Brotli compression (20-30% smaller than gzip)
- ✅ HTTP/3 (QUIC) - faster connections
- ✅ Early Hints - preload critical resources
- ✅ Global CDN - 200+ data centers
- ✅ Image optimization (WebP format)
- ✅ Zero-JS Astro components

---

## Cost Comparison

### Before (IONOS Hosting)

- Hosting: €60-210/year
- SSL Certificate: €0 (Let's Encrypt)
- CDN: Not included
- Analytics: Not included
- **Total:** €60-210/year

### After (Cloudflare Pages)

- Hosting: **FREE** (unlimited bandwidth)
- SSL Certificate: **FREE** (auto-renewed)
- CDN: **FREE** (200+ global data centers)
- Analytics: **FREE** (privacy-friendly)
- DNS: **FREE**
- DDoS Protection: **FREE**
- **Total:** **€0/year** 🎉

**Annual Savings:** €60-210

---

## Support & Documentation

- **Cloudflare Pages Docs:** [https://developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- **Astro Docs:** [https://docs.astro.build](https://docs.astro.build)
- **GitHub Actions Docs:** [https://docs.github.com/actions](https://docs.github.com/actions)
- **Lighthouse CI:** [https://github.com/GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci)

---

**Last Updated:** 2025-11-14
**Version:** 1.0.0
**Status:** ✅ Production Ready
