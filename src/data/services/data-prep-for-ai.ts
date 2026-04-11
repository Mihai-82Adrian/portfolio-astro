import { normalizeSiteUrl } from '@utils/i18n';

export const dataPrepCalUrl = 'https://cal.eu/mihai-adrian.mateescu';
export type DataPrepLocale = 'de' | 'en' | 'ro';

export interface CtaLink {
  label: string;
  href: string;
  external?: boolean;
  description?: string;
}

export interface BulletItem {
  title: string;
  description?: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ServiceRow {
  direction: string;
  problem: string;
  process: string;
  output: string;
}

export interface ProcessStep {
  title: string;
  description: string;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  scope: string[];
  duration: string;
  note?: string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'hidden';
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  autocomplete?: string;
  value?: string;
}

export interface PageSeo {
  title: string;
  description: string;
  ogImage?: string;
}

export interface LandingPageContent {
  seo: PageSeo;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    bullets: BulletItem[];
    primaryCta: CtaLink;
    secondaryCta: CtaLink;
    flowLabel: string;
    flowStages: [string, string, string];
    outputFocusTitle: string;
    outputFocusBody: string;
  };
  problem: {
    title: string;
    intro: string;
    causesTitle: string;
    consequencesTitle: string;
    body: string[];
    missingElements: string[];
    consequences: string[];
  };
  services: {
    title: string;
    intro: string;
    tableHeaders: {
      direction: string;
      problem: string;
      process: string;
      output: string;
    };
    rows: ServiceRow[];
    details: BulletItem[];
  };
  outputs: {
    title: string;
    intro: string;
    resultsTitle: string;
    suitableForTitle: string;
    bullets: string[];
    suitableFor: string[];
  };
  process: {
    title: string;
    intro: string;
    stepLabel: string;
    steps: ProcessStep[];
    microcopy: string;
  };
  trust: {
    title: string;
    proofTitle: string;
    bullets: string[];
    proof: string[];
  };
  faq: {
    title: string;
    items: FaqItem[];
  };
  pricing: {
    title: string;
    intro: string;
    tableHeaders: {
      service: string;
      entryPoint: string;
      suitableFor: string;
      scopeOutcome: string;
    };
    notesTitle: string;
    rationaleTitle: string;
    tiers: PricingTier[];
    notes: string[];
    premiumRationale: string[];
  };
  finalCta: {
    title: string;
    body: string;
    primaryCta: CtaLink;
    secondaryCta: CtaLink;
    microcopy: string;
  };
}

export interface DiscoveryCallContent {
  seo: PageSeo;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  fit: {
    title: string;
    bullets: string[];
  };
  agenda: {
    title: string;
    bullets: string[];
  };
  expectations: {
    title: string;
    bullets: string[];
  };
  cta: {
    title: string;
    body: string;
    button: CtaLink;
    microcopy: string;
    backLabel: string;
    quickCheckTitle: string;
    quickCheckItems: string[];
  };
}

export interface SampleReviewContent {
  seo: PageSeo;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
  };
  commercial: {
    title: string;
    price: string;
    body: string;
    note: string;
  };
  pitch: {
    title: string;
    body: string[];
  };
  requirements: {
    title: string;
    bullets: string[];
  };
  form: {
    title: string;
    intro: string;
    sendTitle: string;
    sendItems: string[];
    doNotSendTitle: string;
    doNotSendItems: string[];
    securityNote: string;
    footerNote: string;
    selectPlaceholder: string;
    fields: FormField[];
    consentLabel: string;
    submitLabel: string;
    successRedirect: string;
  };
  submission: {
    title: string;
    body: string[];
    guarantee: string;
  };
  cta: {
    title: string;
    body: string;
    minimizationTitle: string;
    minimizationBody: string;
    reviewSummary: string;
    backLabel: string;
  };
}

export interface ThankYouPageContent {
  seo: PageSeo;
  eyebrow: string;
  title: string;
  body: string;
  nextStepTitle: string;
  nextStepBody: string;
  replyTitle: string;
  replyBody: string;
  reviewTitle: string;
  reviewItems: string[];
  reviewNote: string;
  backLink: CtaLink;
}

export interface DataPrepRouteSet {
  landing: string;
  discovery: string;
  sampleReview: string;
  thankYou: string;
}

export const dataPrepRoutes: Record<DataPrepLocale, DataPrepRouteSet> = {
  de: {
    landing: '/datenaufbereitung-fuer-ki',
    discovery: '/discovery-call',
    sampleReview: '/sample-struktur-pruefen',
    thankYou: '/sample-struktur-pruefen/danke',
  },
  en: {
    landing: '/en/ai-data-preparation',
    discovery: '/en/discovery-call',
    sampleReview: '/en/sample-structure-review',
    thankYou: '/en/sample-structure-review/thank-you',
  },
  ro: {
    landing: '/ro/pregatire-date-ai',
    discovery: '/ro/discovery-call',
    sampleReview: '/ro/revizuire-structura-esantion',
    thankYou: '/ro/revizuire-structura-esantion/multumesc',
  },
};

export function buildAlternateUrls(routeKey: keyof DataPrepRouteSet): Record<string, string> {
  return {
    de: normalizeSiteUrl(`https://me-mateescu.de${dataPrepRoutes.de[routeKey]}`),
    en: normalizeSiteUrl(`https://me-mateescu.de${dataPrepRoutes.en[routeKey]}`),
    ro: normalizeSiteUrl(`https://me-mateescu.de${dataPrepRoutes.ro[routeKey]}`),
    'x-default': normalizeSiteUrl(`https://me-mateescu.de${dataPrepRoutes.de[routeKey]}`),
  };
}

function hiddenFields(successRedirect: string): FormField[] {
  return [
    { name: 'website', label: 'Website', type: 'hidden', value: '' },
    { name: 'submittedAt', label: 'submittedAt', type: 'hidden', value: '' },
    { name: 'successRedirect', label: 'successRedirect', type: 'hidden', value: successRedirect },
    { name: 'formPath', label: 'formPath', type: 'hidden', value: successRedirect.replace(/\/[^/]+$/, '') },
  ];
}

const deRoutes = dataPrepRoutes.de;
const enRoutes = dataPrepRoutes.en;
const roRoutes = dataPrepRoutes.ro;

export const dataPrepLandingContentByLocale: Record<DataPrepLocale, LandingPageContent> = {
  de: {
    seo: {
      title: 'Datenaufbereitung für KI im Finanzkontext | Mihai Adrian Mateescu',
      description:
        'Ich transformiere PDF-, ERP-, XML- und Compliance-Daten in saubere, strukturierte und KI-verwertbare Ergebnisse für RAG, Document AI und automatisierte Finanzprozesse.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'KI-Datenaufbereitung',
      title: 'Datenaufbereitung für KI im Finanzkontext',
      subtitle:
        'Für Teams, die unstrukturierte Dokumente und Finanzdaten in belastbare, KI-verwertbare Datenprodukte überführen müssen.',
      bullets: [
        { title: 'Finanznahes Prozessverständnis aus Buchhaltung und Rechnungswesen' },
        { title: 'KI-verwertbare Ergebnisse für RAG, Automatisierung und Weiterverarbeitung' },
        { title: 'Nachvollziehbare, datenschutzbewusste und compliance-orientierte Umsetzung' },
      ],
      primaryCta: { label: 'Discovery Call', href: deRoutes.discovery },
      secondaryCta: { label: 'Sample-Struktur prüfen', href: deRoutes.sampleReview },
      flowLabel: 'Input -> Struktur -> Ergebnis',
      flowStages: ['Input', 'Struktur', 'Ergebnis'],
      outputFocusTitle: 'Ergebnisfokus',
      outputFocusBody:
        'Saubere Strukturen, nachvollziehbare Felder und KI-verwertbare Ergebnisse für Finanz-, Compliance- und Dokumenten-Workflows.',
    },
    problem: {
      title: 'Warum AI-Projekte an unstrukturierten Daten scheitern',
      intro: 'Viele AI-Initiativen starten mit Modell- und Toolfragen und verlieren die Datenrealität aus dem Blick.',
      causesTitle: 'Typische Ursachen',
      consequencesTitle: 'Typische Folgen',
      body: [
        'PDFs, Scan-Dokumente, ERP-Exporte und uneinheitliche Tabellen sind für Menschen oft noch lesbar, für AI-Systeme aber selten direkt verwertbar.',
        'Es fehlen stabile Felder, saubere Metadaten, Segmentierung und eine belastbare Grundlage für Retrieval, Validierung oder Automatisierung.',
      ],
      missingElements: ['bereinigter Text', 'sinnvolle Segmentierung', 'stabile Feldlogik', 'nachvollziehbare Metadaten', 'verwertbare Ergebnisformate'],
      consequences: ['unpräzise Antworten', 'instabile RAG-Setups', 'hoher manueller Nachbearbeitungsaufwand', 'wenig Vertrauen in das System'],
    },
    services: {
      title: 'Drei typische Einsatzfelder',
      intro: 'Die Leistung ist klar umrissen: Daten- und Dokumentaufbereitung für AI-, RAG- und Automatisierungsanwendungen im finanznahen Kontext.',
      tableHeaders: {
        direction: 'Richtung',
        problem: 'Problem',
        process: 'Prozess',
        output: 'Ergebnis',
      },
      rows: [
        { direction: 'RAG Corpus Ingestion', problem: 'PDF, DOCX, Policies, Handbücher, OCR-lastige Dokumente', process: 'Text-Extraktion, Cleanup, Segmentierung, Metadaten', output: 'JSONL, Chunk-Sets, Retrieval-ready Corpus' },
        { direction: 'ERP & FiBu Cleanup', problem: 'ERP-Export, Buchungsdaten, OPOS-Listen, Reporting-Dateien', process: 'Normalisierung, Mapping, Deduplizierung, Feldprüfung', output: 'CSV, Parquet, validiertes Analyse-Set' },
        { direction: 'Compliance Transformation', problem: 'XRechnung, XML, strukturierte Business-Dokumente', process: 'Feldmapping, Validierung, Formatprüfung, Transformationslogik', output: 'XML, Prüfdateien, strukturierte Weiterverarbeitung' },
      ],
      details: [
        { title: 'RAG Corpus Ingestion', description: 'Für Wissensdatenbanken, Richtlinien, Verfahrensdokumentationen und gemischte Dokumentbestände.' },
        { title: 'ERP & FiBu Cleanup', description: 'Für exportierte Finanzdaten, die vor Analyse, Forecasting oder AI-Nutzung erst vereinheitlicht und geprüft werden müssen.' },
        { title: 'Compliance Transformation', description: 'Für strukturierte Geschäftsdokumente, bei denen Feldlogik, Validierung und Standardkonformität entscheidend sind.' },
      ],
    },
    outputs: {
      title: 'Was Sie konkret erhalten',
      intro: 'Kein abstraktes AI-Consulting, sondern nachvollziehbare und operativ nutzbare Arbeitsergebnisse.',
      resultsTitle: 'Ergebnisse im Fokus',
      suitableForTitle: 'Geeignet für',
      bullets: [
        'Bereinigte Rohdaten oder Dokumentinhalte',
        'Strukturierte Datensätze in JSONL, CSV oder Parquet',
        'Optional validierte XML-Ergebnisse im Compliance-Kontext',
        'Chunking-Struktur für RAG- oder Search-Implementierungen',
        'Felddefinitionen und Mapping-Logik',
        'Metadaten-Konzept für Dokumente und Datensätze',
        'Validierungsregeln und Qualitätschecks',
        'Übergabedokumentation für interne Teams oder Implementierungspartner',
      ],
      suitableFor: ['RAG / Knowledge Bases', 'Document AI', 'interne Suchsysteme', 'Datenmigration', 'Workflow-Automatisierung', 'Analyse- und Forecasting-Vorbereitung'],
    },
    process: {
      title: 'So läuft ein Projekt ab',
      intro: 'Klein anfangen ist ausdrücklich möglich. Viele Projekte starten mit einem begrenzten Beispieldatensatz oder einem eng umrissenen Pilot.',
      stepLabel: 'Schritt',
      steps: [
        { title: 'Intake & Zielbild', description: 'Datenlage verstehen, Quellen und Zielsysteme erfassen, Risiken und Ausschlusskriterien identifizieren.' },
        { title: 'Analyse & Strukturdesign', description: 'Muster, Inkonsistenzen und Sonderfälle prüfen, Zielstruktur, Felder und Validierungslogik definieren.' },
        { title: 'Aufbereitung & Validierung', description: 'Bereinigung, Mapping, Deduplizierung und Segmentierung durchführen, Metadaten ergänzen, Qualitätschecks anwenden.' },
        { title: 'Übergabe & nächste Schritte', description: 'Finales Ergebnispaket bereitstellen, Dokumentation und Empfehlungen übergeben, optional RAG- oder Automatisierungs-Setup vorbereiten.' },
      ],
      microcopy: 'Klein anfangen ist ausdrücklich möglich. Viele Projekte starten mit einem klar abgegrenzten Mini-Pilot.',
    },
    trust: {
      title: 'Warum diese Arbeit bei mir gut aufgehoben ist',
      proofTitle: 'Typische Ausgangslagen',
      bullets: [
        'Finanznaher Hintergrund mit Fokus auf Rechnungswesen und Prozessqualität',
        'Praxisverständnis für strukturierte und unstrukturierte Geschäftsdokumente',
        'Nachvollziehbarkeit statt Black-Box-Versprechen',
        'Gute Passung für Finance-, Compliance- und dokumentenlastige Umgebungen',
        'Brücke zwischen kaufmännischer Präzision und technischer Umsetzbarkeit',
      ],
      proof: ['uneinheitliche ERP-Exporte', 'heterogene PDF-/DOCX-Bestände', 'fehlende Metadaten', 'manuelle Vorarbeit vor AI-Projekten', 'XRechnung-/XML-nahe Validierungsanforderungen'],
    },
    faq: {
      title: 'Häufige Fragen',
      items: [
        { question: 'Arbeiten Sie auch mit sensiblen Finanzdaten?', answer: 'Ja. Für Pilotphasen bevorzuge ich anonymisierte oder reduzierte Beispieldaten und einen klar definierten sicheren Austausch erst nach Umfangsklärung.' },
        { question: 'Ist das nur für große AI-Projekte relevant?', answer: 'Nein. Gerade kleine Pilotprojekte profitieren stark von sauberer Datenstruktur, bevor größere Investitionen erfolgen.' },
        { question: 'Welche Formate können verarbeitet werden?', answer: 'Typisch sind PDF, DOCX, Tabellenexporte, CSV, ERP-Listen und strukturierte Formate wie XML.' },
        { question: 'Ersetzen Sie ein komplettes Data-Engineering-Team?', answer: 'Nein. Die Leistung ist bewusst fokussiert: Daten- und Dokumentaufbereitung für AI-, RAG- und Automatisierungsanwendungen.' },
      ],
    },
    pricing: {
      title: 'Preise & Einstieg',
      intro: 'Klare Pilotprojekte statt vager AI-Versprechen. Die meisten Vorhaben starten mit einem sauber abgegrenzten Umfang.',
      tableHeaders: {
        service: 'Leistung',
        entryPoint: 'Einstieg',
        suitableFor: 'Geeignet für',
        scopeOutcome: 'Umfang / Ergebnis',
      },
      notesTitle: 'Preislogik',
      rationaleTitle: 'Warum dieser Preisrahmen sinnvoll ist',
      tiers: [
        { name: 'Mini-Pilot / Strukturprüfung', price: 'ab 350 €', description: 'Für Unternehmen, die vorab prüfen möchten, ob ihre Dokumente oder Datenbestände für AI, RAG oder Automatisierung geeignet sind.', scope: ['1 Beispieldatensatz oder kleines Dokumentenpaket', 'Erste Analyse von Struktur, Qualität und Risiken', 'Einschätzung zu Format, Feldlogik und Verwendbarkeit', 'Kurze Empfehlung für den sinnvollsten nächsten Schritt'], duration: '0,5 bis 2 Arbeitstage', note: 'Wird bei Folgeprojekt vollständig angerechnet.' },
        { name: 'RAG Corpus Ingestion', price: 'ab 1.800 €', description: 'Für Dokumentbestände, die für RAG, interne Wissensdatenbanken oder AI-gestützte Suche vorbereitet werden sollen.', scope: ['Text-Extraktion und Bereinigung', 'Dokumentsegmentierung', 'Metadaten-Struktur', 'Retrieval-ready Ergebnis'], duration: '4 bis 8 Arbeitstage' },
        { name: 'ERP & FiBu Cleanup', price: 'ab 2.500 €', description: 'Für ERP-Exporte, Buchhaltungsdaten und Reporting-Dateien, die vor Analyse oder AI-Nutzung strukturiert und geprüft werden müssen.', scope: ['Normalisierung und Feldzuordnung', 'Deduplizierung und Plausibilitätsprüfung', 'Saubere Zielstruktur', 'Dokumentierte Validierungslogik'], duration: '5 bis 10 Arbeitstage' },
        { name: 'Compliance Transformation', price: 'ab 3.500 €', description: 'Für strukturierte Geschäftsdokumente mit hohem Anspruch an Nachvollziehbarkeit und Standardkonformität.', scope: ['Struktur- und Feldmapping', 'Validierungslogik', 'Transformationsregeln', 'Technisch sauberes Ergebnis'], duration: '7 bis 15 Arbeitstage' },
      ],
      notes: [
        'Der genaue Preis hängt von Datenqualität, Formatvielfalt, Umfang, Validierungstiefe und Anzahl der Sonderfälle ab.',
        'Für klar definierte Pilotprojekte arbeite ich bevorzugt mit Fixpreisen.',
        'Für komplexe oder iterative Datenlagen erfolgt die Umsetzung nach Aufwand.',
        'Der Fokus liegt auf klaren Einstiegspreisen und sauber abgegrenzten Umfängen.',
      ],
      premiumRationale: ['Datenaufbereitung im Finanz- und Rechnungswesen-Kontext', 'Saubere Strukturen statt bloßer Skripte', 'Nachvollziehbarkeit statt Black-Box-Lösungen', 'Weniger Rückfragen, weniger Nacharbeit, weniger Fehlzuordnungen'],
    },
    finalCta: {
      title: 'Der nächste sinnvolle Schritt',
      body: 'Wenn Sie bereits Dokumente oder Datenbestände haben, die für AI, RAG oder Automatisierung genutzt werden sollen, beginnt die eigentliche Arbeit meist vor dem Modell.',
      primaryCta: { label: 'Discovery Call', href: deRoutes.discovery },
      secondaryCta: { label: 'Sample-Struktur prüfen', href: deRoutes.sampleReview },
      microcopy: 'Auf Wunsch zunächst mit anonymisiertem Beispieldatensatz oder klar abgegrenztem Mini-Pilot.',
    },
  },
  en: {
    seo: {
      title: 'AI Data Preparation for Finance Workflows | Mihai Adrian Mateescu',
      description:
        'I turn PDF, ERP, XML and compliance-heavy datasets into clean, structured and AI-ready outputs for RAG, Document AI and automation projects.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'AI Data Preparation',
      title: 'AI Data Preparation for Finance Workflows',
      subtitle: 'For teams that need to turn messy documents and finance data into reliable, AI-ready data products.',
      bullets: [
        { title: 'Finance-aware process understanding from accounting and reporting' },
        { title: 'AI-ready outputs for RAG, automation and downstream systems' },
        { title: 'Traceable, privacy-aware and compliance-minded delivery' },
      ],
      primaryCta: { label: 'Discovery Call', href: enRoutes.discovery },
      secondaryCta: { label: 'Review Sample Structure', href: enRoutes.sampleReview },
      flowLabel: 'Input -> Structure -> Output',
      flowStages: ['Input', 'Structure', 'Output'],
      outputFocusTitle: 'Output focus',
      outputFocusBody:
        'Clean structures, traceable fields and AI-ready outputs for finance, compliance and document-heavy workflows.',
    },
    problem: {
      title: 'Why AI projects fail on unstructured data',
      intro: 'Many AI initiatives start with model questions and underestimate the reality of the source data.',
      causesTitle: 'Typical causes',
      consequencesTitle: 'Typical consequences',
      body: [
        'PDFs, scanned documents, ERP exports and inconsistent tables may still be readable for humans, but they are rarely directly usable for AI systems.',
        'What is missing are stable fields, sensible segmentation, trustworthy metadata and a reliable foundation for retrieval, validation and automation.',
      ],
      missingElements: ['clean text', 'sensible segmentation', 'stable field logic', 'traceable metadata', 'usable output formats'],
      consequences: ['imprecise answers', 'unstable RAG setups', 'high manual rework', 'low trust in the system'],
    },
    services: {
      title: 'Three common use cases',
      intro: 'The offer is deliberately narrow: data and document preparation for AI, RAG and automation use cases in finance-adjacent environments.',
      tableHeaders: {
        direction: 'Direction',
        problem: 'Problem',
        process: 'Process',
        output: 'Output',
      },
      rows: [
        { direction: 'RAG Corpus Ingestion', problem: 'PDFs, DOCX, policies, manuals, OCR-heavy documents', process: 'Text extraction, cleanup, segmentation, metadata', output: 'JSONL, chunk sets, retrieval-ready corpus' },
        { direction: 'ERP & Accounting Cleanup', problem: 'ERP exports, accounting data, open-item lists, reporting files', process: 'Normalization, mapping, deduplication, field checks', output: 'CSV, Parquet, validated analysis set' },
        { direction: 'Compliance Transformation', problem: 'XRechnung, XML, structured business documents', process: 'Field mapping, validation, format checks, transformation logic', output: 'XML, validation files, structured downstream processing' },
      ],
      details: [
        { title: 'RAG Corpus Ingestion', description: 'For internal knowledge bases, guidelines, process documentation and mixed document inventories.' },
        { title: 'ERP & Accounting Cleanup', description: 'For finance exports that must be standardized and checked before analytics, forecasting or AI usage.' },
        { title: 'Compliance Transformation', description: 'For structured business documents where field logic, validation and standard conformance matter.' },
      ],
    },
    outputs: {
      title: 'What you actually receive',
      intro: 'Not abstract AI consulting, but concrete and operationally usable deliverables.',
      resultsTitle: 'Deliverables in focus',
      suitableForTitle: 'Suitable for',
      bullets: [
        'Cleaned raw data or document content',
        'Structured datasets in JSONL, CSV or Parquet',
        'Optional validated XML outputs in compliance contexts',
        'Chunking structures for RAG or search implementations',
        'Field definitions and mapping logic',
        'Metadata concepts for documents and datasets',
        'Validation rules and quality checks',
        'Handover documentation for internal teams or implementation partners',
      ],
      suitableFor: ['RAG / knowledge bases', 'Document AI', 'internal search systems', 'data migration', 'workflow automation', 'analytics and forecasting preparation'],
    },
    process: {
      title: 'How a project works',
      intro: 'Starting small is explicitly possible. Many engagements begin with a limited sample dataset or a tightly scoped pilot.',
      stepLabel: 'Step',
      steps: [
        { title: 'Intake & target picture', description: 'Understand the data landscape, source systems and targets, and identify risks and exclusions.' },
        { title: 'Analysis & structure design', description: 'Review patterns, inconsistencies and edge cases, then define target structure, fields and validation logic.' },
        { title: 'Preparation & validation', description: 'Clean, map, deduplicate and segment the data, enrich metadata and apply quality checks.' },
        { title: 'Handover & next steps', description: 'Deliver the final output package, documentation and recommendations, with optional support for the next implementation step.' },
      ],
      microcopy: 'A narrow pilot is often the fastest way to de-risk a later AI implementation.',
    },
    trust: {
      title: 'Why this work fits my profile',
      proofTitle: 'Typical starting points',
      bullets: [
        'Finance-adjacent background with a focus on accounting and process quality',
        'Hands-on understanding of structured and unstructured business documents',
        'Traceability over black-box promises',
        'Strong fit for finance, compliance and document-heavy environments',
        'A practical bridge between business precision and technical implementation',
      ],
      proof: ['messy ERP exports', 'mixed PDF/DOCX inventories', 'missing metadata', 'manual prep before AI projects', 'XML/XRechnung-style validation requirements'],
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { question: 'Do you work with sensitive finance data?', answer: 'Yes. For pilot phases I prefer anonymized or reduced samples and a clearly defined secure exchange only after scope alignment.' },
        { question: 'Is this only relevant for large AI projects?', answer: 'No. Smaller pilots often benefit the most from proper structure before larger investments are made.' },
        { question: 'What formats can be processed?', answer: 'Typical inputs include PDF, DOCX, spreadsheet exports, CSV, ERP lists and structured formats such as XML.' },
        { question: 'Do you replace a full data engineering team?', answer: 'No. The service is intentionally focused on data and document preparation for AI, RAG and automation use cases.' },
      ],
    },
    pricing: {
      title: 'Pricing & entry points',
      intro: 'Clear pilots instead of vague AI promises. Most work starts with a well-bounded scope.',
      tableHeaders: {
        service: 'Service',
        entryPoint: 'Entry point',
        suitableFor: 'Suitable for',
        scopeOutcome: 'Scope / outcome',
      },
      notesTitle: 'Pricing logic',
      rationaleTitle: 'Why this pricing range makes sense',
      tiers: [
        { name: 'Mini Pilot / Sample Review', price: 'from €350', description: 'For teams that want to evaluate whether their documents or datasets are suitable for AI, RAG or automation before committing to a larger scope.', scope: ['1 sample dataset or small document package', 'Initial assessment of structure, quality and risks', 'Evaluation of format, field logic and usability', 'Short recommendation for the next sensible step'], duration: '0.5 to 2 work days', note: 'Fully credited if a follow-up project starts.' },
        { name: 'RAG Corpus Ingestion', price: 'from €1,800', description: 'For document inventories that need to be prepared for RAG, internal knowledge bases or AI-powered search.', scope: ['Text extraction and cleanup', 'Document segmentation', 'Metadata structure', 'Retrieval-ready output'], duration: '4 to 8 work days' },
        { name: 'ERP & Accounting Cleanup', price: 'from €2,500', description: 'For ERP exports, accounting datasets and reporting files that must be standardized before analytics or AI usage.', scope: ['Normalization and field mapping', 'Deduplication and plausibility checks', 'Clean target structure', 'Documented validation logic'], duration: '5 to 10 work days' },
        { name: 'Compliance Transformation', price: 'from €3,500', description: 'For structured business documents that require field-level traceability, validation and standards alignment.', scope: ['Structure and field mapping', 'Validation logic', 'Transformation rules', 'Technically clean downstream output'], duration: '7 to 15 work days' },
      ],
      notes: [
        'Exact pricing depends on data quality, format diversity, scale, validation depth and edge cases.',
        'For clearly defined pilots I prefer fixed pricing.',
        'For more complex or iterative scopes, delivery can also be effort-based.',
        'The focus is on clear entry prices and bounded scopes, not open-ended retainers.',
      ],
      premiumRationale: ['Finance-aware data preparation', 'Clean structures instead of ad-hoc scripts', 'Traceability instead of black-box shortcuts', 'Less rework and fewer downstream errors'],
    },
    finalCta: {
      title: 'The next sensible step',
      body: 'If you already have documents or datasets intended for AI, RAG or automation, the real work usually starts before the model does.',
      primaryCta: { label: 'Discovery Call', href: enRoutes.discovery },
      secondaryCta: { label: 'Review Sample Structure', href: enRoutes.sampleReview },
      microcopy: 'If needed, start with an anonymized sample or a tightly scoped mini pilot.',
    },
  },
  ro: {
    seo: {
      title: 'Pregătire Date pentru AI în Procese Financiare | Mihai Adrian Mateescu',
      description:
        'Transform PDF-uri, exporturi ERP, XML-uri și date de conformitate în seturi curate, structurate și pregătite pentru AI, RAG și automatizare.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Pregătire Date AI',
      title: 'Pregătire Date pentru AI în Procese Financiare',
      subtitle: 'Pentru echipe care trebuie să transforme documente și date financiare dezordonate în produse de date fiabile și utilizabile de AI.',
      bullets: [
        { title: 'Înțelegere practică a proceselor financiare și contabile' },
        { title: 'Rezultate pregătite pentru AI, RAG, automatizare și sistemele următoare' },
        { title: 'Implementare trasabilă, atentă la confidențialitate și conformitate' },
      ],
      primaryCta: { label: 'Discovery Call', href: roRoutes.discovery },
      secondaryCta: { label: 'Revizuire structură eșantion', href: roRoutes.sampleReview },
      flowLabel: 'Input -> Structură -> Rezultat',
      flowStages: ['Input', 'Structură', 'Rezultat'],
      outputFocusTitle: 'Focus pe rezultat',
      outputFocusBody:
        'Structuri curate, câmpuri trasabile și rezultate pregătite pentru AI în fluxuri financiare, de conformitate și cu volum mare de documente.',
    },
    problem: {
      title: 'De ce proiectele AI eșuează din cauza datelor nestructurate',
      intro: 'Multe inițiative AI pornesc de la întrebări despre model și subestimează realitatea datelor sursă.',
      causesTitle: 'Cauze tipice',
      consequencesTitle: 'Consecințe tipice',
      body: [
        'PDF-urile, documentele scanate, exporturile ERP și tabelele inconsistente pot fi încă lizibile pentru oameni, dar rareori sunt direct utilizabile pentru sisteme AI.',
        'Lipsesc câmpuri stabile, segmentare coerentă, metadate de încredere și o bază solidă pentru retrieval, validare sau automatizare.',
      ],
      missingElements: ['text curățat', 'segmentare coerentă', 'logică stabilă de câmpuri', 'metadate trasabile', 'formate de rezultat utilizabile'],
      consequences: ['răspunsuri imprecise', 'setup-uri RAG instabile', 'multă muncă manuală de corecție', 'încredere scăzută în sistem'],
    },
    services: {
      title: 'Trei cazuri tipice de utilizare',
      intro: 'Oferta este delimitată clar: pregătirea datelor și documentelor pentru AI, RAG și automatizare în contexte apropiate de procesele financiare.',
      tableHeaders: {
        direction: 'Direcție',
        problem: 'Problemă',
        process: 'Proces',
        output: 'Rezultat',
      },
      rows: [
        { direction: 'RAG Corpus Ingestion', problem: 'PDF, DOCX, politici, manuale, documente cu mult OCR', process: 'Extracție text, curățare, segmentare, metadate', output: 'JSONL, seturi de chunk-uri, corpus pregătit pentru retrieval' },
        { direction: 'ERP & Accounting Cleanup', problem: 'Exporturi ERP, date contabile, liste de creanțe, fișiere de raportare', process: 'Normalizare, mapare, deduplicare, verificări de câmpuri', output: 'CSV, Parquet, set validat pentru analiză' },
        { direction: 'Compliance Transformation', problem: 'XRechnung, XML, documente de business structurate', process: 'Mapare de câmpuri, validare, verificări de format, logică de transformare', output: 'XML, fișiere de validare, procesare structurată ulterioară' },
      ],
      details: [
        { title: 'RAG Corpus Ingestion', description: 'Pentru baze interne de cunoștințe, ghiduri, documentație de proces și inventare mixte de documente.' },
        { title: 'ERP & Accounting Cleanup', description: 'Pentru exporturi financiare care trebuie standardizate și verificate înainte de analiză, forecast sau utilizare AI.' },
        { title: 'Compliance Transformation', description: 'Pentru documente de business structurate unde logica de câmp, validarea și conformitatea cu standardele sunt esențiale.' },
      ],
    },
    outputs: {
      title: 'Ce primești concret',
      intro: 'Nu consultanță AI abstractă, ci livrabile clare și utilizabile operațional.',
      resultsTitle: 'Livrabile în prim-plan',
      suitableForTitle: 'Potrivit pentru',
      bullets: [
        'Date brute sau conținut de documente curățate',
        'Seturi de date structurate în JSONL, CSV sau Parquet',
        'Opțional rezultate XML validate în contexte de conformitate',
        'Structură de chunking pentru implementări RAG sau search',
        'Definiții de câmpuri și logică de mapping',
        'Concept de metadate pentru documente și seturi de date',
        'Reguli de validare și controale de calitate',
        'Documentație de handover pentru echipe interne sau parteneri de implementare',
      ],
      suitableFor: ['RAG / baze de cunoștințe', 'Document AI', 'sisteme interne de căutare', 'migrare de date', 'automatizare de fluxuri', 'pregătire pentru analiză și prognoză'],
    },
    process: {
      title: 'Cum decurge un proiect',
      intro: 'Un start mic este perfect legitim. Multe colaborări încep cu un eșantion limitat sau cu un pilot foarte bine delimitat.',
      stepLabel: 'Pas',
      steps: [
        { title: 'Clarificare & imagine-țintă', description: 'Înțeleg sursele de date, sistemele țintă și identific riscurile și excluderile.' },
        { title: 'Analiză & design de structură', description: 'Verific tipare, inconsistențe și cazuri speciale și definesc structura țintă, câmpurile și logica de validare.' },
        { title: 'Pregătire & validare', description: 'Curăț, mapez, deduplic și segmentez datele, completez metadatele și aplic verificări de calitate.' },
        { title: 'Predare & pașii următori', description: 'Livrez pachetul final, documentația și recomandările și pot pregăti și pasul următor de implementare.' },
      ],
      microcopy: 'Un pilot îngust este adesea cea mai rapidă cale de a reduce riscul înaintea unei implementări AI mai ample.',
    },
    trust: {
      title: 'De ce acest tip de muncă se potrivește profilului meu',
      proofTitle: 'Situații tipice de pornire',
      bullets: [
        'Background apropiat de finance, cu accent pe contabilitate și calitatea proceselor',
        'Înțelegere practică pentru documente business structurate și nestructurate',
        'Trasabilitate în loc de promisiuni de tip black-box',
        'Potrivire bună pentru medii financiare, de conformitate și cu volum mare de documente',
        'Punte reală între precizia business și implementarea tehnică',
      ],
      proof: ['exporturi ERP dezordonate', 'inventare mixte PDF/DOCX', 'metadate lipsă', 'muncă manuală înainte de proiecte AI', 'cerințe de validare în stil XML/XRechnung'],
    },
    faq: {
      title: 'Întrebări frecvente',
      items: [
        { question: 'Lucrezi și cu date financiare sensibile?', answer: 'Da. Pentru fazele pilot prefer mostre anonimizate sau reduse și un schimb securizat clar definit doar după alinierea anvergurii.' },
        { question: 'Este relevant doar pentru proiecte AI mari?', answer: 'Nu. Tocmai proiectele pilot mai mici beneficiază de structură bună înainte de investiții mai mari.' },
        { question: 'Ce formate poți procesa?', answer: 'Tipic: PDF, DOCX, exporturi tabelare, CSV, liste ERP și formate structurate precum XML.' },
        { question: 'Înlocuiești o echipă completă de data engineering?', answer: 'Nu. Serviciul este intenționat focalizat pe pregătirea datelor și documentelor pentru AI, RAG și automatizare.' },
      ],
    },
    pricing: {
      title: 'Prețuri & puncte de intrare',
      intro: 'Piloti clari în loc de promisiuni AI vagi. Majoritatea proiectelor încep cu o anvergură bine delimitată.',
      tableHeaders: {
        service: 'Serviciu',
        entryPoint: 'Punct de intrare',
        suitableFor: 'Potrivit pentru',
        scopeOutcome: 'Anvergură / rezultat',
      },
      notesTitle: 'Logica de preț',
      rationaleTitle: 'De ce acest interval de preț este justificat',
      tiers: [
        { name: 'Mini Pilot / Revizuire Eșantion', price: 'de la 350 €', description: 'Pentru echipe care vor să verifice dacă documentele sau seturile lor de date sunt potrivite pentru AI, RAG sau automatizare înainte de o anvergură mai mare.', scope: ['1 set de date exemplu sau un pachet mic de documente', 'Evaluare inițială a structurii, calității și riscurilor', 'Analiză a formatului, logicii de câmpuri și utilizabilității', 'Recomandare scurtă pentru următorul pas rezonabil'], duration: '0,5 până la 2 zile de lucru', note: 'Se deduce integral dacă pornește un proiect ulterior.' },
        { name: 'RAG Corpus Ingestion', price: 'de la 1.800 €', description: 'Pentru inventare de documente care trebuie pregătite pentru RAG, baze interne de cunoștințe sau căutare asistată de AI.', scope: ['Extracție și curățare de text', 'Segmentare de documente', 'Structură de metadate', 'Rezultat pregătit pentru retrieval'], duration: '4 până la 8 zile de lucru' },
        { name: 'ERP & Accounting Cleanup', price: 'de la 2.500 €', description: 'Pentru exporturi ERP, date contabile și fișiere de reporting care trebuie standardizate înainte de analiză sau utilizare AI.', scope: ['Normalizare și mapping de câmpuri', 'Deduplicare și verificări de plauzibilitate', 'Structură țintă curată', 'Logică de validare documentată'], duration: '5 până la 10 zile de lucru' },
        { name: 'Compliance Transformation', price: 'de la 3.500 €', description: 'Pentru documente de business structurate care cer trasabilitate la nivel de câmp, validare și aliniere la standarde.', scope: ['Structură și mapare de câmpuri', 'Logică de validare', 'Reguli de transformare', 'Rezultat tehnic curat pentru procesare ulterioară'], duration: '7 până la 15 zile de lucru' },
      ],
      notes: [
        'Prețul exact depinde de calitatea datelor, diversitatea formatelor, volum, profunzimea validării și cazurile speciale.',
        'Pentru piloti bine definiți prefer prețuri fixe.',
        'Pentru proiecte mai complexe sau iterative, livrarea poate fi și bazată pe efort.',
        'Accentul este pe prețuri de intrare clare și pe cadre bine delimitate, nu pe retainere deschise.',
      ],
      premiumRationale: ['Pregătire de date în contexte financiare și contabile', 'Structuri curate în loc de scripturi ad-hoc', 'Trasabilitate în loc de scurtături opace', 'Mai puțină refacere și mai puține erori în etapele următoare'],
    },
    finalCta: {
      title: 'Următorul pas rezonabil',
      body: 'Dacă ai deja documente sau date destinate AI, RAG sau automatizării, munca reală începe de obicei înainte de alegerea modelului.',
      primaryCta: { label: 'Discovery Call', href: roRoutes.discovery },
      secondaryCta: { label: 'Revizuire structură eșantion', href: roRoutes.sampleReview },
      microcopy: 'La nevoie, putem începe cu un eșantion anonimizat sau cu un mini pilot bine delimitat.',
    },
  },
};

export const discoveryCallContentByLocale: Record<DataPrepLocale, DiscoveryCallContent> = {
  de: {
    seo: {
      title: 'Discovery Call für Datenaufbereitung für KI | Mihai Adrian Mateescu',
      description: 'Buchen Sie einen Discovery Call, um Datenquellen, Zielsysteme, Ergebnisformate und den sinnvollsten Startpunkt für ein Pilotprojekt zu klären.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Discovery Call',
      title: 'Vorqualifizieren, bevor wir bauen',
      subtitle: 'Der Call ist für Entscheider gedacht, die klären möchten, ob ihre Dokumente oder Finanzdaten genug Struktur für einen AI-, RAG- oder Automatisierungs-Pilot haben.',
    },
    fit: { title: 'Für wen der Call sinnvoll ist', bullets: ['CFOs, Leiter Rechnungswesen und Finance Ops', 'ERP-/DMS-nahe Verantwortliche mit heterogenen Datenbeständen', 'Interne Teams oder Beratungen mit RAG-, Document-AI- oder Automatisierungsprojekten'] },
    agenda: { title: 'Was wir im Call klären', bullets: ['Datenquellen, Formate und Zielsysteme', 'Risiken, Sonderfälle und Ausschlusskriterien', 'Welche Ergebnisse realistisch sind', 'Ob ein Mini-Pilot oder direkt ein größeres Projekt sinnvoll ist'] },
    expectations: { title: 'Was der Call nicht ist', bullets: ['kein allgemeines AI-Strategiegespräch ohne Datenbezug', 'kein Sales-Pitch mit Buzzwords', 'keine technische Deep-Dive-Session ohne Vorabkontext'] },
    cta: { title: 'Termin buchen', body: 'Wenn der Fit klar ist, führen Sie den Call direkt über Cal.com fort.', button: { label: 'Discovery Call auf Cal.com', href: dataPrepCalUrl, external: true }, microcopy: 'Wenn Sie noch unsicher sind, starten Sie stattdessen mit einer Strukturprüfung auf Basis eines Samples.', backLabel: 'Zur Landing Page', quickCheckTitle: 'Schnellprüfung', quickCheckItems: ['Konkrete Datenquellen und Zielsysteme', 'Realistischer Ergebnisumfang', 'Risiken, Sonderfälle und Pilot-Eignung'] },
  },
  en: {
    seo: {
      title: 'Discovery Call for AI Data Preparation | Mihai Adrian Mateescu',
      description: 'Book a discovery call to clarify data sources, target systems, output formats and the most sensible starting point for a pilot.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Discovery Call',
      title: 'Qualify the problem before building',
      subtitle: 'This call is for decision-makers who want to understand whether their documents or finance data have enough structure for an AI, RAG or automation pilot.',
    },
    fit: { title: 'Who this call is for', bullets: ['CFOs, heads of accounting and finance operations', 'ERP- or DMS-adjacent owners of heterogeneous datasets', 'Internal teams or consultancies preparing RAG, Document AI or automation projects'] },
    agenda: { title: 'What we clarify in the call', bullets: ['Data sources, formats and target systems', 'Risks, edge cases and exclusions', 'What outputs are realistic', 'Whether a mini pilot or larger scope is the right next step'] },
    expectations: { title: 'What the call is not', bullets: ['not a generic AI strategy chat without data context', 'not a buzzword-heavy sales pitch', 'not a technical deep dive without upfront context'] },
    cta: { title: 'Book the call', body: 'If the fit looks clear, continue directly through Cal.com.', button: { label: 'Book on Cal.com', href: dataPrepCalUrl, external: true }, microcopy: 'If the scope is still unclear, start with a sample structure review instead.', backLabel: 'Back to landing page', quickCheckTitle: 'Quick check', quickCheckItems: ['Concrete data sources and target systems', 'Realistic scope of deliverables', 'Risks, edge cases and pilot fit'] },
  },
  ro: {
    seo: {
      title: 'Discovery Call pentru Pregătire Date AI | Mihai Adrian Mateescu',
      description: 'Programează un discovery call pentru a clarifica sursele de date, sistemele țintă, formatele de rezultat și cel mai potrivit punct de plecare pentru un pilot.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Discovery Call',
      title: 'Califică problema înainte să construim',
      subtitle: 'Această discuție este pentru decidenți care vor să înțeleagă dacă documentele sau datele lor financiare au suficientă structură pentru un pilot AI, RAG sau de automatizare.',
    },
    fit: { title: 'Pentru cine este util acest call', bullets: ['CFO, responsabili de contabilitate sau finance operations', 'Responsabili ERP / DMS cu seturi de date eterogene', 'Echipe interne sau consultanțe care pregătesc proiecte RAG, Document AI sau automatizare'] },
    agenda: { title: 'Ce clarificăm în call', bullets: ['Surse de date, formate și sisteme țintă', 'Riscuri, cazuri speciale și excluderi', 'Ce rezultate sunt realist posibile', 'Dacă următorul pas corect este un mini pilot sau un proiect mai amplu'] },
    expectations: { title: 'Ce nu este acest call', bullets: ['nu este o discuție generică de strategie AI fără context de date', 'nu este o prezentare de vânzare plină de buzzwords', 'nu este o analiză tehnică în profunzime fără context prealabil'] },
    cta: { title: 'Programează discuția', body: 'Dacă potrivirea este clară, continuă direct prin Cal.com.', button: { label: 'Programează pe Cal.com', href: dataPrepCalUrl, external: true }, microcopy: 'Dacă direcția este încă neclară, începe mai întâi cu o revizuire de structură pe eșantion.', backLabel: 'Înapoi la landing page', quickCheckTitle: 'Verificare rapidă', quickCheckItems: ['Surse concrete de date și sisteme țintă', 'Volum realist al rezultatelor', 'Riscuri, cazuri speciale și potrivirea pentru pilot'] },
  },
};

export const sampleReviewContentByLocale: Record<DataPrepLocale, SampleReviewContent> = {
  de: {
    seo: {
      title: 'Sample-Struktur prüfen | Datenaufbereitung für KI',
      description: 'Kostenpflichtiger Mini-Pilot zur fachlichen Vorprüfung Ihrer Datenbasis für AI, RAG oder Automatisierungs-Piloten.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Mini-Pilot',
      title: 'Sample-Struktur prüfen',
      subtitle: 'Mit einem kostenpflichtigen, klar abgegrenzten Mini-Pilot prüfen wir, ob Ihre Daten oder Dokumente für einen realistischen AI-Pilot geeignet sind.',
    },
    commercial: {
      title: 'Mini-Pilot mit echter B2B-Selektion',
      price: 'ab 350 €',
      body: 'Die Strukturprüfung des Samples ist keine kostenlose Anfrageform, sondern ein bezahlter Einstieg zur fachlichen Vorprüfung von Struktur, Risiken und realistischer Umsetzbarkeit.',
      note: 'Der Betrag wird bei Beauftragung eines Folgeprojekts vollständig angerechnet. Kein Datei-Upload in V1; der erste Schritt dient der Umfangsklärung, bevor sensible Finanzdaten sicher ausgetauscht werden.',
    },
    pitch: {
      title: 'Warum der Einstieg als Mini-Pilot sinnvoll ist',
      body: ['Viele AI- und Automatisierungsprojekte scheitern nicht am Modell, sondern an der Datenrealität.', 'Ein kleiner, klar abgegrenzter Mini-Pilot schafft früh Klarheit über Nutzbarkeit, Risiken, Zielstruktur und passende Ergebnisformate.'],
    },
    requirements: {
      title: 'Was Sie im Mini-Pilot erhalten',
      bullets: ['eine kurze fachliche und technische Einschätzung', 'Hinweise zu Risiken, Datenqualität und Struktur', 'einen realistischen Projektvorschlag', 'eine belastbare Grundlage für Budget und Umfang', 'auf Wunsch zunächst mit anonymisiertem Beispieldatensatz'],
    },
    form: {
      title: 'Anfrageformular',
      intro: 'Bitte senden Sie nur die Angaben, die für die fachliche Vorprüfung nötig sind. Kein Upload von sensiblen Daten in V1.',
      sendTitle: 'Bitte senden Sie',
      sendItems: [
        'konkrete Dokumenttypen oder Datenquellen',
        'den geplanten AI-, RAG- oder Automatisierungs-Use-Case',
        'eine grobe Einschätzung zum Volumen',
      ],
      doNotSendTitle: 'Bitte nicht senden',
      doNotSendItems: [
        'ungefilterte sensible Dokumente',
        'Passwörter, private Schlüssel oder Zugangsdaten',
        'große Datei-Anhänge in V1',
      ],
      securityNote: 'Auf Wunsch können Sie die Daten zuerst anonymisiert oder nur mit einem beschreibenden Auszug einreichen.',
      footerNote: 'Kein Datei-Upload in V1. Die Anfrage dient der Umfangsklärung für einen kostenpflichtigen Mini-Pilot, bevor sensible Daten sicher ausgetauscht werden.',
      selectPlaceholder: 'Bitte wählen',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, autocomplete: 'name' },
        { name: 'company', label: 'Unternehmen', type: 'text', required: true, autocomplete: 'organization' },
        { name: 'workEmail', label: 'Business E-Mail', type: 'email', required: true, autocomplete: 'email' },
        { name: 'dataType', label: 'Daten-/Dokumenttyp', type: 'select', required: true, options: ['PDF / Scan-Dokumente', 'DOCX / Policies / Handbücher', 'ERP-Export / FiBu-Daten', 'XRechnung / XML / strukturierte Business-Dokumente', 'Andere'] },
        { name: 'targetUseCase', label: 'Ziel-Use-Case', type: 'select', required: true, options: ['RAG / Knowledge Base', 'Document AI', 'ERP & FiBu Cleanup', 'Compliance Transformation', 'Noch unklar'] },
        { name: 'estimatedVolume', label: 'Umfang', type: 'select', required: true, options: ['Einzelnes Dokument / kleiner Beispieldatensatz', 'Kleines Paket', 'Mittlerer Bestand', 'Größerer Bestand / noch unklar'] },
        { name: 'notes', label: 'Zusätzliche Hinweise', type: 'textarea', placeholder: 'Was ist für die Vorprüfung wichtig?', helpText: 'Bitte keine sensiblen Dokumente hochladen. Links zu gesicherten Quellen sind optional.' },
        ...hiddenFields(deRoutes.thankYou),
      ],
      consentLabel: 'Ich stimme zu, dass meine Angaben zur Bearbeitung dieser geschäftlichen Anfrage verarbeitet werden.',
      submitLabel: 'Kostenpflichtige Analyse anfragen',
      successRedirect: deRoutes.thankYou,
    },
    submission: {
      title: 'Nach dem Absenden',
      body: ['Ich prüfe die Angaben fachlich und melde mich mit einer klaren Einschätzung.', 'Wenn der Umfang passt, erhalten Sie einen Vorschlag für den nächsten sinnvollen Schritt.'],
      guarantee: 'Der Einstieg kann bewusst klein gehalten werden.',
    },
    cta: {
      title: 'Bereit für den ersten Check?',
      body: 'Wenn Sie bereits konkrete Dateien oder Datenmuster haben, startet hier die fachliche Vorprüfung über das Formular auf dieser Website.',
      minimizationTitle: 'Anonymisierung',
      minimizationBody: 'Wenn die Daten sensibel sind, reicht für V1 ein anonymisierter Auszug oder eine beschreibende Zusammenfassung.',
      reviewSummary: 'Nach dem Absenden erhalten Sie eine klare Einordnung zu Umfang, Risiken und dem sinnvollsten nächsten Schritt für einen bezahlten Mini-Pilot.',
      backLabel: 'Zur Landing Page',
    },
  },
  en: {
    seo: {
      title: 'Review Sample Structure | AI Data Preparation',
      description: 'Paid mini pilot to assess whether your data foundation is suitable for AI, RAG or automation use cases.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Mini Pilot',
      title: 'Review Sample Structure',
      subtitle: 'With a paid, tightly scoped mini pilot, we validate whether your data or documents are realistic candidates for an AI project.',
    },
    commercial: {
      title: 'Mini pilot with deliberate B2B filtering',
      price: 'from €350',
      body: 'This is not a free lead magnet. It is a paid first step to assess structure, risks and realistic implementation potential.',
      note: 'The amount is fully credited if a follow-up project starts. No file upload in V1; the first step is scope clarification before any sensitive finance data is exchanged securely.',
    },
    pitch: {
      title: 'Why a mini pilot is the right starting point',
      body: ['Many AI and automation initiatives fail because of the data foundation, not because of the model.', 'A tightly scoped pilot creates early clarity on usability, risks, target structure and realistic output formats.'],
    },
    requirements: {
      title: 'What you receive in the mini pilot',
      bullets: ['a short business and technical assessment', 'notes on risks, data quality and structure', 'a realistic project recommendation', 'a sound basis for budget and scope', 'optionally based on anonymized examples first'],
    },
    form: {
      title: 'Inquiry form',
      intro: 'Please send only the information needed for the initial review. No upload of sensitive data in V1.',
      sendTitle: 'Please send',
      sendItems: [
        'specific document types or data sources',
        'the intended AI, RAG or automation use case',
        'a rough estimate of the volume',
      ],
      doNotSendTitle: 'Please do not send',
      doNotSendItems: [
        'unfiltered sensitive documents',
        'passwords, private keys or credentials',
        'large file attachments in V1',
      ],
      securityNote: 'If needed, you can start with anonymized data or a descriptive excerpt only.',
      footerNote: 'No file upload in V1. This request is used to clarify scope for a paid mini pilot before sensitive data is exchanged securely.',
      selectPlaceholder: 'Please select',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true, autocomplete: 'name' },
        { name: 'company', label: 'Company', type: 'text', required: true, autocomplete: 'organization' },
        { name: 'workEmail', label: 'Business Email', type: 'email', required: true, autocomplete: 'email' },
        { name: 'dataType', label: 'Data / document type', type: 'select', required: true, options: ['PDF / scanned documents', 'DOCX / policies / manuals', 'ERP export / accounting data', 'XRechnung / XML / structured business documents', 'Other'] },
        { name: 'targetUseCase', label: 'Target use case', type: 'select', required: true, options: ['RAG / knowledge base', 'Document AI', 'ERP & accounting cleanup', 'Compliance transformation', 'Still unclear'] },
        { name: 'estimatedVolume', label: 'Estimated volume', type: 'select', required: true, options: ['Single document / small sample dataset', 'Small package', 'Medium inventory', 'Larger inventory / still unclear'] },
        { name: 'notes', label: 'Additional context', type: 'textarea', placeholder: 'What matters for the initial review?', helpText: 'Please do not upload sensitive documents. Secure links are optional.' },
        ...hiddenFields(enRoutes.thankYou),
      ],
      consentLabel: 'I agree that my information may be processed to handle this business inquiry.',
      submitLabel: 'Request paid analysis',
      successRedirect: enRoutes.thankYou,
    },
    submission: {
      title: 'After submitting',
      body: ['I review the request and come back with a clear assessment.', 'If the scope fits, you receive a recommendation for the most sensible next step.'],
      guarantee: 'The initial scope can stay intentionally small.',
    },
    cta: {
      title: 'Ready for the first review?',
      body: 'If you already have a concrete sample dataset or document pattern, this is where the structured review starts.',
      minimizationTitle: 'Data minimization',
      minimizationBody: 'If the data is sensitive, an anonymized excerpt or descriptive summary is sufficient for V1.',
      reviewSummary: 'After submission, you receive a clear view on scope, risks and the most sensible next step for a paid mini pilot.',
      backLabel: 'Back to landing page',
    },
  },
  ro: {
    seo: {
      title: 'Revizuire Structură Eșantion | Pregătire Date AI',
      description: 'Mini pilot plătit pentru a evalua dacă baza ta de date este potrivită pentru AI, RAG sau automatizare.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Mini Pilot',
      title: 'Revizuire Structură Eșantion',
      subtitle: 'Printr-un mini pilot plătit și bine delimitat verificăm dacă datele sau documentele tale sunt candidați realiști pentru un proiect AI.',
    },
    commercial: {
      title: 'Mini pilot cu filtrare B2B reală',
      price: 'de la 350 €',
      body: 'Aceasta nu este o solicitare gratuită de captare, ci un prim pas plătit pentru a evalua structura, riscurile și fezabilitatea reală.',
      note: 'Suma se deduce integral dacă începe un proiect ulterior. Fără încărcare de fișiere în V1; primul pas este clarificarea anvergurii înainte de schimbul securizat de date sensibile.',
    },
    pitch: {
      title: 'De ce mini pilotul este punctul corect de plecare',
      body: ['Multe inițiative AI și de automatizare eșuează din cauza bazei de date, nu din cauza modelului.', 'Un pilot îngust oferă claritate timpurie despre utilizabilitate, riscuri, structură țintă și rezultate realiste.'],
    },
    requirements: {
      title: 'Ce primești în mini pilot',
      bullets: ['o evaluare scurtă de business și tehnică', 'observații despre riscuri, calitatea datelor și structură', 'o recomandare realistă de proiect', 'o bază solidă pentru buget și anvergură', 'la nevoie, pornind de la exemple anonimizate'],
    },
    form: {
      title: 'Formular de solicitare',
      intro: 'Trimite doar informațiile necesare pentru evaluarea inițială. Fără încărcare de date sensibile în V1.',
      sendTitle: 'Te rog să trimiți',
      sendItems: [
        'tipurile concrete de documente sau surse de date',
        'cazul de utilizare AI, RAG sau de automatizare vizat',
        'o estimare aproximativă a volumului',
      ],
      doNotSendTitle: 'Te rog să nu trimiți',
      doNotSendItems: [
        'documente sensibile nefiltrate',
        'parole, chei private sau credențiale',
        'atașamente mari în V1',
      ],
      securityNote: 'Dacă este nevoie, poți începe cu date anonimizate sau doar cu un extras descriptiv.',
      footerNote: 'Fără încărcare de fișiere în V1. Cererea servește clarificării anvergurii pentru un mini pilot plătit, înainte de schimbul securizat al datelor sensibile.',
      selectPlaceholder: 'Te rog selectează',
      fields: [
        { name: 'name', label: 'Nume', type: 'text', required: true, autocomplete: 'name' },
        { name: 'company', label: 'Companie', type: 'text', required: true, autocomplete: 'organization' },
        { name: 'workEmail', label: 'Email business', type: 'email', required: true, autocomplete: 'email' },
        { name: 'dataType', label: 'Tip de date / documente', type: 'select', required: true, options: ['PDF / documente scanate', 'DOCX / politici / manuale', 'Export ERP / date contabile', 'XRechnung / XML / documente business structurate', 'Altul'] },
        { name: 'targetUseCase', label: 'Caz de utilizare țintă', type: 'select', required: true, options: ['RAG / bază de cunoștințe', 'Document AI', 'ERP & accounting cleanup', 'Compliance transformation', 'Încă neclar'] },
        { name: 'estimatedVolume', label: 'Volum estimat', type: 'select', required: true, options: ['Document unic / eșantion mic', 'Pachet mic', 'Inventar mediu', 'Inventar mare / încă neclar'] },
        { name: 'notes', label: 'Context suplimentar', type: 'textarea', placeholder: 'Ce este important pentru evaluarea inițială?', helpText: 'Te rog nu încărca documente sensibile. Linkurile securizate sunt opționale.' },
        ...hiddenFields(roRoutes.thankYou),
      ],
      consentLabel: 'Sunt de acord ca informațiile mele să fie procesate pentru gestionarea acestei cereri de business.',
      submitLabel: 'Solicită analiză plătită',
      successRedirect: roRoutes.thankYou,
    },
    submission: {
      title: 'După trimitere',
      body: ['Analizez solicitarea și revin cu o evaluare clară.', 'Dacă anvergura se potrivește, primești o recomandare pentru următorul pas rezonabil.'],
      guarantee: 'Anvergura inițială poate rămâne intenționat mică.',
    },
    cta: {
      title: 'Pregătit pentru prima evaluare?',
      body: 'Dacă ai deja un eșantion concret de date sau documente, aici începe revizuirea structurii.',
      minimizationTitle: 'Minimizarea datelor',
      minimizationBody: 'Dacă datele sunt sensibile, pentru V1 este suficient un extras anonimizat sau un rezumat descriptiv.',
      reviewSummary: 'După trimitere, primești o imagine clară asupra anvergurii, riscurilor și următorului pas rezonabil pentru un mini pilot plătit.',
      backLabel: 'Înapoi la landing page',
    },
  },
};

export const thankYouPageContentByLocale: Record<DataPrepLocale, ThankYouPageContent> = {
  de: {
    seo: {
      title: 'Danke für den Sample Review | Datenaufbereitung für KI',
      description: 'Danke für Ihre Anfrage. Ich prüfe die Angaben und melde mich mit einer ersten Einschätzung.',
      ogImage: '/images/og-default.webp',
    },
    eyebrow: 'Strukturprüfung',
    title: 'Danke für Ihre Anfrage',
    body: 'Ihre Angaben sind eingegangen. Ich prüfe die Datenbasis und melde mich mit einer ersten Einschätzung.',
    nextStepTitle: 'Nächster Schritt',
    nextStepBody: 'Wenn der Mini-Pilot sinnvoll ist, erhalten Sie eine klare Einordnung zu Umfang, Risiken und sinnvoller Ausgangslage.',
    replyTitle: 'Direkte Rückmeldung per E-Mail',
    replyBody: 'Ich antworte auf dieselbe Business-E-Mail-Adresse, die Sie im Formular angegeben haben.',
    reviewTitle: 'Was ich jetzt prüfe',
    reviewItems: ['Struktur und Verwertbarkeit der angegebenen Datenbasis', 'Risiken, Sonderfälle und notwendige Vorarbeit', 'Ob ein Mini-Pilot oder ein direkter nächster Schritt sinnvoll ist'],
    reviewNote: 'Der Einstieg kann bewusst klein gehalten werden.',
    backLink: { label: 'Zur Landing Page', href: deRoutes.landing },
  },
  en: {
    seo: {
      title: 'Thanks for the Sample Review Request | AI Data Preparation',
      description: 'Thanks for your inquiry. I review the information and come back with an initial assessment.',
      ogImage: '/images/og-default.webp',
    },
    eyebrow: 'Sample review',
    title: 'Thanks for your request',
    body: 'Your information has been received. I am reviewing the data context and will come back with an initial assessment.',
    nextStepTitle: 'Next step',
    nextStepBody: 'If a mini pilot makes sense, you will receive a clear view on scope, risks and the right starting point.',
    replyTitle: 'Direct reply window',
    replyBody: 'I reply to the same business email address you submitted through the form.',
    reviewTitle: 'What I review now',
    reviewItems: ['Structure and usability of the data foundation you described', 'Risks, edge cases and required preparation work', 'Whether a mini pilot or another next step makes sense'],
    reviewNote: 'The initial entry point can stay intentionally small.',
    backLink: { label: 'Back to landing page', href: enRoutes.landing },
  },
  ro: {
    seo: {
      title: 'Mulțumesc pentru solicitare | Pregătire Date AI',
      description: 'Mulțumesc pentru solicitare. Analizez informațiile și revin cu o primă evaluare.',
      ogImage: '/images/og-default.webp',
    },
    eyebrow: 'Revizuire eșantion',
    title: 'Mulțumesc pentru solicitare',
    body: 'Informațiile au fost primite. Analizez contextul datelor și revin cu o primă evaluare.',
    nextStepTitle: 'Pasul următor',
    nextStepBody: 'Dacă mini pilotul are sens, vei primi o imagine clară asupra anvergurii, riscurilor și punctului corect de pornire.',
    replyTitle: 'Răspuns direct pe e-mail',
    replyBody: 'Răspund pe aceeași adresă de business pe care ai trimis-o prin formular.',
    reviewTitle: 'Ce verific acum',
    reviewItems: ['Structura și utilizabilitatea bazei de date descrise', 'Riscuri, cazuri speciale și pregătirea necesară', 'Dacă un mini pilot sau alt pas următor are sens'],
    reviewNote: 'Punctul de intrare poate rămâne intenționat mic.',
    backLink: { label: 'Înapoi la landing page', href: roRoutes.landing },
  },
};

export const dataPrepLandingContent = dataPrepLandingContentByLocale.de;
export const discoveryCallContent = discoveryCallContentByLocale.de;
export const sampleReviewContent = sampleReviewContentByLocale.de;
export const thankYouPageContent = {
  discovery: thankYouPageContentByLocale.de,
  sampleReview: thankYouPageContentByLocale.de,
};
