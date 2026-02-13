#!/usr/bin/env node
/**
 * export-corpus.mjs
 *
 * Generates public/corpus.jsonl from ALL site content:
 *   1. Career experience (src/data/experience.ts)
 *   2. Education (src/data/education.ts)
 *   3. Certifications (src/data/certifications.ts)
 *   4. Projects (src/data/projects.json)
 *   5. Blog articles (src/content/blog/*.md)
 *
 * Each language (de/en/ro) generates separate corpus entries so the AI can
 * answer recruiters in any of the three portfolio languages.
 *
 * Usage:  node scripts/export-corpus.mjs
 * Output: public/corpus.jsonl
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';
import matter from 'gray-matter';

const ROOT = process.cwd();
const OUTPUT_FILE = join(ROOT, 'public', 'corpus.jsonl');
const LANGS = ['de', 'en', 'ro'];

const docs = [];

// ─── Helpers ───────────────────────────────────────────────────────

function slugify(text) {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
}

function push(id, url, title, sectionTitle, text, meta = {}) {
    if (!text || text.length < 20) return;
    docs.push({ id, url, title, sectionTitle, text, metadata: { source: 'export-corpus', ...meta } });
}

// Page URLs per language
function pageUrl(lang, path) {
    if (lang === 'de') return path;
    return `/${lang}${path}`;
}

// ─── 1. Career Experience ──────────────────────────────────────────

async function indexExperience() {
    const raw = await readFile(join(ROOT, 'src/data/experience.ts'), 'utf-8');

    // Parse the TypeScript array manually (it's a data-only file)
    // Extract each position block
    const positionRegex = /\{\s*id:\s*'(\d+)'[\s\S]*?company:\s*'([^']+)'[\s\S]*?role:\s*\{[\s\S]*?de:\s*'([^']*)'[\s\S]*?en:\s*'([^']*)'[\s\S]*?ro:\s*'([^']*)'/g;

    // Simpler approach: use dynamic import after stripping TS types
    // Since the data file uses TS exports, we'll parse it as structured text
    const positions = [];
    const blocks = raw.split(/\n\s*\{[\s\n]*id:/);

    for (const block of blocks.slice(1)) { // skip first split (before first position)
        const getId = block.match(/^\s*'(\d+)'/);
        const getCompany = block.match(/company:\s*'([^']+)'/);
        const getRoleDe = block.match(/role:\s*\{[^}]*de:\s*'([^']*)'/s);
        const getRoleEn = block.match(/role:\s*\{[^}]*en:\s*'([^']*)'/s);
        const getRoleRo = block.match(/role:\s*\{[^}]*ro:\s*'([^']*)'/s);
        const getLocation = block.match(/location:\s*'([^']+)'/);
        const getStart = block.match(/startDate:\s*'([^']+)'/);
        const getEnd = block.match(/endDate:\s*'([^']+)'/);
        const getTech = block.match(/technologies:\s*\[([^\]]*)\]/);

        if (!getId || !getCompany) continue;

        // Extract description arrays for each language
        const descDe = [];
        const descEn = [];
        const descRo = [];

        // Match description block
        const descBlock = block.match(/description:\s*\{([\s\S]*?)\n\s{4}\}/);
        if (descBlock) {
            const dBlock = descBlock[1];
            // Extract each language's array
            for (const lang of ['de', 'en', 'ro']) {
                const langMatch = dBlock.match(new RegExp(`${lang}:\\s*\\[([\\s\\S]*?)\\]`, 's'));
                if (langMatch) {
                    const items = langMatch[1].match(/'([^']*)'/g);
                    if (items) {
                        const arr = lang === 'de' ? descDe : lang === 'en' ? descEn : descRo;
                        items.forEach(i => arr.push(i.replace(/^'|'$/g, '')));
                    }
                }
            }
        }

        const techs = getTech
            ? getTech[1].match(/'([^']+)'/g)?.map(t => t.replace(/'/g, '')) || []
            : [];

        positions.push({
            id: getId[1],
            company: getCompany[1],
            role: { de: getRoleDe?.[1] || '', en: getRoleEn?.[1] || '', ro: getRoleRo?.[1] || '' },
            location: getLocation?.[1] || '',
            startDate: getStart?.[1] || '',
            endDate: getEnd?.[1] || '',
            description: { de: descDe, en: descEn, ro: descRo },
            technologies: techs,
        });
    }

    console.log(`  📋 Experience: ${positions.length} positions`);

    for (const pos of positions) {
        for (const lang of LANGS) {
            const role = pos.role[lang] || pos.role.en;
            const desc = (pos.description[lang] || []).join(' ');
            const techStr = pos.technologies.length > 0 ? `\nTechnologies: ${pos.technologies.join(', ')}` : '';
            const period = `${pos.startDate} – ${pos.endDate === 'present' ? 'Present' : pos.endDate}`;

            const text = `${role} at ${pos.company}, ${pos.location} (${period})\n${desc}${techStr}`;

            push(
                `experience:${lang}:${pos.id}`,
                pageUrl(lang, '/experience'),
                `${pos.company} – ${role}`,
                `Career Experience (${period})`,
                text,
                { type: 'experience', lang }
            );
        }
    }
}

// ─── 2. Education ──────────────────────────────────────────────────

async function indexEducation() {
    const raw = await readFile(join(ROOT, 'src/data/education.ts'), 'utf-8');

    const entries = [];
    const blocks = raw.split(/\n\s*\{[\s\n]*id:/);

    for (const block of blocks.slice(1)) {
        const getId = block.match(/^\s*'([^']+)'/);
        const getInst = block.match(/institution:\s*'([^']+)'/);
        const getDegreeDe = block.match(/degree:\s*\{[^}]*de:\s*'([^']*)'/s);
        const getDegreeEn = block.match(/degree:\s*\{[^}]*en:\s*'([^']*)'/s);
        const getDegreeRo = block.match(/degree:\s*\{[^}]*ro:\s*'([^']*)'/s);
        const getFieldDe = block.match(/field:\s*\{[^}]*de:\s*'([^']*)'/s);
        const getFieldEn = block.match(/field:\s*\{[^}]*en:\s*'([^']*)'/s);
        const getFieldRo = block.match(/field:\s*\{[^}]*ro:\s*'([^']*)'/s);
        const getLocation = block.match(/location:\s*'([^']+)'/);
        const getStart = block.match(/startDate:\s*'([^']+)'/);
        const getEnd = block.match(/endDate:\s*'([^']+)'/);
        const getStatus = block.match(/status:\s*'([^']+)'/);

        if (!getId || !getInst) continue;

        // Extract descriptions
        const descBlock = block.match(/description:\s*\{([\s\S]*?)\n\s{4}\}/);
        const desc = { de: [], en: [], ro: [] };
        if (descBlock) {
            for (const lang of LANGS) {
                const m = descBlock[1].match(new RegExp(`${lang}:\\s*\\[([\\s\\S]*?)\\]`, 's'));
                if (m) {
                    const items = m[1].match(/'([^']*)'/g);
                    if (items) desc[lang] = items.map(i => i.replace(/^'|'$/g, ''));
                }
            }
        }

        entries.push({
            id: getId[1],
            institution: getInst[1],
            degree: { de: getDegreeDe?.[1] || '', en: getDegreeEn?.[1] || '', ro: getDegreeRo?.[1] || '' },
            field: { de: getFieldDe?.[1] || '', en: getFieldEn?.[1] || '', ro: getFieldRo?.[1] || '' },
            location: getLocation?.[1] || '',
            startDate: getStart?.[1] || '',
            endDate: getEnd?.[1] || '',
            status: getStatus?.[1] || '',
            description: desc,
        });
    }

    console.log(`  🎓 Education: ${entries.length} entries`);

    for (const edu of entries) {
        for (const lang of LANGS) {
            const degree = edu.degree[lang] || edu.degree.en;
            const field = edu.field[lang] || edu.field.en;
            const descText = (edu.description[lang] || []).join('. ');
            const period = `${edu.startDate} – ${edu.endDate === 'present' ? 'Present' : edu.endDate}`;

            const text = `${degree} – ${field}\n${edu.institution}, ${edu.location} (${period})\nStatus: ${edu.status || 'completed'}\n${descText}`;

            push(
                `education:${lang}:${edu.id}`,
                pageUrl(lang, '/education'),
                `${edu.institution} – ${degree}`,
                `Education`,
                text,
                { type: 'education', lang }
            );
        }
    }
}

// ─── 3. Certifications ─────────────────────────────────────────────

async function indexCertifications() {
    const raw = await readFile(join(ROOT, 'src/data/certifications.ts'), 'utf-8');

    const entries = [];
    const blocks = raw.split(/\n\s*\{[\s\n]*id:/);

    for (const block of blocks.slice(1)) {
        const getId = block.match(/^\s*'([^']+)'/);
        const getTitleDe = block.match(/title:\s*\{[^}]*de:\s*'([^']*)'/s);
        const getTitleEn = block.match(/title:\s*\{[^}]*en:\s*'([^']*)'/s);
        const getTitleRo = block.match(/title:\s*\{[^}]*ro:\s*'([^']*)'/s);
        const getIssuer = block.match(/issuer:\s*'([^']+)'/);
        const getDate = block.match(/dateObtained:\s*'([^']+)'/);
        const getCategory = block.match(/category:\s*'([^']+)'/);

        if (!getId) continue;

        // Extract description
        const descBlock = block.match(/description:\s*\{[^}]*de:\s*'([^']*)'[^}]*en:\s*'([^']*)'[^}]*ro:\s*'([^']*)'/s);

        entries.push({
            id: getId[1],
            title: { de: getTitleDe?.[1] || '', en: getTitleEn?.[1] || '', ro: getTitleRo?.[1] || '' },
            issuer: getIssuer?.[1] || '',
            dateObtained: getDate?.[1] || '',
            category: getCategory?.[1] || '',
            description: {
                de: descBlock?.[1] || '',
                en: descBlock?.[2] || '',
                ro: descBlock?.[3] || '',
            },
        });
    }

    console.log(`  📜 Certifications: ${entries.length} entries`);

    for (const cert of entries) {
        for (const lang of LANGS) {
            const title = cert.title[lang] || cert.title.en;
            const desc = cert.description[lang] || cert.description.en || '';

            const text = `${title}\nIssued by: ${cert.issuer} (${cert.dateObtained})\nCategory: ${cert.category}\n${desc}`;

            push(
                `certification:${lang}:${cert.id}`,
                pageUrl(lang, '/certifications'),
                title,
                `Certifications & References`,
                text,
                { type: 'certification', lang }
            );
        }
    }
}

// ─── 4. Projects ────────────────────────────────────────────────────

async function indexProjects() {
    const raw = await readFile(join(ROOT, 'src/data/projects.json'), 'utf-8');
    const { projects } = JSON.parse(raw);

    console.log(`  🚀 Projects: ${projects.length} entries`);

    for (const proj of projects) {
        // Projects data is in English; generate one entry per lang pointing to the right URL
        for (const lang of LANGS) {
            const techStack = (proj.techStack || []).map(t => t.name).join(', ');
            const features = (proj.features || []).join('. ');
            const metrics = (proj.metrics || []).map(m => `${m.label}: ${m.value}`).join(', ');
            const timeline = (proj.timeline?.milestones || []).map(m => `${m.phase}: ${m.description} (${m.status})`).join('. ');
            const details = proj.technicalDetails
                ? Object.entries(proj.technicalDetails).map(([k, v]) => `${k}: ${v}`).join('. ')
                : '';

            const text = [
                `${proj.title} – ${proj.tagline}`,
                proj.description,
                `Status: ${proj.status?.label} (${proj.status?.detail})`,
                `Tech Stack: ${techStack}`,
                `Key Metrics: ${metrics}`,
                `Features: ${features}`,
                `Timeline: ${timeline}`,
                `Technical Details: ${details}`,
            ].join('\n');

            push(
                `project:${lang}:${proj.slug}`,
                pageUrl(lang, `/projects/${proj.slug}`),
                proj.title,
                `Projects`,
                text,
                { type: 'project', lang, category: proj.category }
            );
        }
    }
}

// ─── 5. About / Profile (from translations) ────────────────────────

async function indexProfile() {
    // Hardcode the essential "About Mihai" profile info that recruiters need
    // This is the core personal brand content
    const profiles = {
        de: {
            title: 'Über Mihai Adrian Mateescu',
            text: `Mihai Adrian Mateescu – Finanzbuchhalter & Finanzexperte.
Engagierter Finanzbuchhalter mit Erfahrung in der Buchhaltung und Finanzverwaltung, spezialisiert auf die detaillierte Analyse von Geschäftsvorfällen und die steuerliche Berichterstattung.
Aktuell: Weiterbildung zum Bilanzbuchhalter (IHK) bei Steuer-Fachschule Dr. Endriss.
Aktuelle Position: Finanzbuchhalter bei modal3 Logistik GmbH, Hamburg (seit Mai 2025).
Kernkompetenzen: Finanzbuchhaltung, DATEV, Umsatzsteuer, Jahresabschlüsse, BWA, Lohn- und Gehaltsrechnung.
Sprachen: Deutsch (B2 telc), Englisch (fließend), Rumänisch (Muttersprache).
Standort: Hamburg, Deutschland.
Nebenberufliche Interessen: AI Research, Cognitive Computing, Full-Stack Development.`,
        },
        en: {
            title: 'About Mihai Adrian Mateescu',
            text: `Mihai Adrian Mateescu – Financial Accountant & Finance Expert.
Dedicated financial accountant with experience in accounting and financial management, specialized in detailed analysis of business transactions and tax reporting.
Currently: Continuing education as Certified Accountant (Bilanzbuchhalter IHK) at Steuer-Fachschule Dr. Endriss.
Current Position: Financial Accountant at modal3 Logistik GmbH, Hamburg (since May 2025).
Core Competencies: Financial Accounting, DATEV, VAT, Annual Financial Statements, Business Evaluations (BWA), Payroll.
Languages: German (B2 telc), English (fluent), Romanian (native).
Location: Hamburg, Germany.
Side Interests: AI Research, Cognitive Computing, Full-Stack Development.`,
        },
        ro: {
            title: 'Despre Mihai Adrian Mateescu',
            text: `Mihai Adrian Mateescu – Contabil Financiar & Expert Financiar.
Contabil financiar dedicat cu experiență în contabilitate și management financiar, specializat în analiza detaliată a tranzacțiilor comerciale și raportare fiscală.
Actual: Educație continuă ca Bilanzbuchhalter (IHK) la Steuer-Fachschule Dr. Endriss.
Poziția actuală: Contabil Financiar la modal3 Logistik GmbH, Hamburg (din mai 2025).
Competențe cheie: Contabilitate Financiară, DATEV, TVA, Situații Financiare Anuale, BWA, Salarizare.
Limbi: Germană (B2 telc), Engleză (fluent), Română (nativă).
Locație: Hamburg, Germania.
Interese secundare: Cercetare AI, Cognitive Computing, Full-Stack Development.`,
        },
    };

    console.log(`  👤 Profile: 3 language variants`);

    for (const lang of LANGS) {
        const p = profiles[lang];
        push(
            `profile:${lang}`,
            pageUrl(lang, '/about'),
            p.title,
            'About / Profile',
            p.text,
            { type: 'profile', lang }
        );
    }
}

// ─── 6. Blog Articles ───────────────────────────────────────────────

function splitIntoSections(markdownBody) {
    const lines = markdownBody.split('\n');
    const sections = [];
    let currentTitle = null;
    let currentLines = [];

    for (const line of lines) {
        const h2Match = line.match(/^##\s+(.+)/);
        if (h2Match) {
            if (currentTitle !== null || currentLines.length > 0) {
                sections.push({ sectionTitle: currentTitle || 'Introduction', text: currentLines.join('\n').trim() });
            }
            currentTitle = h2Match[1].trim();
            currentLines = [];
        } else {
            currentLines.push(line);
        }
    }
    if (currentTitle !== null || currentLines.length > 0) {
        sections.push({ sectionTitle: currentTitle || 'Introduction', text: currentLines.join('\n').trim() });
    }
    return sections;
}

async function indexBlog() {
    const blogDir = join(ROOT, 'src', 'content', 'blog');
    if (!existsSync(blogDir)) { console.log('  📝 Blog: directory not found, skipping'); return; }

    const files = (await readdir(blogDir)).filter(f => f.endsWith('.md') || f.endsWith('.mdx'));
    let sectionCount = 0;

    for (const file of files) {
        const raw = await readFile(join(blogDir, file), 'utf-8');
        const { data: fm, content } = matter(raw);
        const slug = basename(file, '.md').replace('.mdx', '');
        const title = fm.title || slug;
        const lang = fm.lang || 'en';
        const url = `/blog/${slug}`;

        const sections = splitIntoSections(content);
        for (const section of sections) {
            if (section.text.length < 30) continue;
            sectionCount++;
            push(
                `blog:${lang}:${slug}#${slugify(section.sectionTitle)}`,
                `${url}#${slugify(section.sectionTitle)}`,
                title,
                section.sectionTitle,
                section.text,
                { type: 'blog', lang, tags: fm.tags || [], pubDate: fm.pubDate ? new Date(fm.pubDate).toISOString() : null }
            );
        }
    }

    console.log(`  📝 Blog: ${sectionCount} sections from ${files.length} files`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
    console.log('📦 Export Corpus: Building comprehensive knowledge base...\n');

    await indexProfile();
    await indexExperience();
    await indexEducation();
    await indexCertifications();
    await indexProjects();
    await indexBlog();

    // Write JSONL
    const jsonl = docs.map(d => JSON.stringify(d)).join('\n') + '\n';
    await writeFile(OUTPUT_FILE, jsonl, 'utf-8');

    console.log(`\n✅ Total: ${docs.length} corpus entries → ${OUTPUT_FILE}`);
}

main().catch(err => {
    console.error('❌ Export failed:', err);
    process.exit(1);
});
