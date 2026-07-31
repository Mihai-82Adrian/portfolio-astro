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

export interface ComparisonItem {
  title: string;
  description: string;
}

export interface CollaborationCard {
  title: string;
  body: string;
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
    trustStrip: string[];
    primaryCta: CtaLink;
    secondaryCta: CtaLink;
    flowLabel: string;
    flowStages: [string, string, string];
    outputFocusTitle: string;
    outputFocusBody: string;
  };
  collaboration: {
    title: string;
    intro: string;
    cards: CollaborationCard[];
  };
  problem: {
    title: string;
    intro: string;
    bridgeSentence: string;
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
    intro: string;
    proofTitle: string;
    bullets: string[];
    proof: string[];
  };
  whatItIs: {
    title: string;
    intro: string;
    isTitle: string;
    is: ComparisonItem[];
    isNotTitle: string;
    isNot: ComparisonItem[];
  };
  bridgeFit: {
    title: string;
    intro: string;
    bullets: string[];
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
    asideLabel: string;
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
    unavailableMessage: string;
    validationMessage: string;
    genericErrorMessage: string;
    disabledNotice: string;
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
        { title: 'Expertengeführte Aufbereitung mit Blick auf Buchhaltung, Rechnungswesen und Prozesslogik' },
        { title: 'Saubere Ergebnisse für RAG, Analyse, Document AI und nachgelagerte Umsetzung' },
        { title: 'Nachvollziehbare, datenschutzbewusste und compliance-orientierte Lieferung' },
      ],
      trustStrip: [
        'Begrenzter Validierungsumfang zum Einstieg',
        'Auf Wunsch mit anonymisierten Beispielen oder in Ihrer Umgebung',
        'Nachvollziehbare, finanznahe Ergebnisse statt Black-Box-Versprechen',
      ],
      primaryCta: { label: 'Discovery Call', href: deRoutes.discovery },
      secondaryCta: { label: 'Sample Review besprechen', href: deRoutes.sampleReview },
      flowLabel: 'Input -> Struktur -> Ergebnis',
      flowStages: ['Input', 'Struktur', 'Ergebnis'],
      outputFocusTitle: 'Ergebnisfokus',
      outputFocusBody:
        'Saubere Strukturen, nachvollziehbare Felder und verwertbare Ergebnisse für finanznahe Dokumenten-, Compliance- und AI-Workflows.',
    },
    collaboration: {
      title: 'Wie die Zusammenarbeit starten kann',
      intro:
        'Ein sinnvoller Einstieg erfordert nicht zwingend den sofortigen Austausch sensibler Rohdaten. Je nach Umfeld kann die Zusammenarbeit bewusst risikoarm beginnen.',
      cards: [
        {
          title: 'Anonymisierter Auszug',
          body: 'Für viele Vorprüfungen reicht ein anonymisierter Beispieldatensatz oder ein bereinigter Dokumentauszug, um Struktur, Feldlogik und Risiken belastbar einzuordnen.',
        },
        {
          title: 'Repräsentative oder synthetische Struktur',
          body: 'Wenn echte Daten noch nicht geteilt werden sollen, kann eine repräsentative Struktur oder ein synthetisches Beispiel genügen, um Zielbild, Mapping und Validierungslogik abzustimmen.',
        },
        {
          title: 'Zusammenarbeit in Ihrer Umgebung',
          body: 'Wenn Governance oder Datenschutz es erfordern, kann die Arbeit auch in Ihrer Umgebung oder in einem eng definierten sicheren Rahmen erfolgen.',
        },
      ],
    },
    problem: {
      title: 'Warum AI-Projekte an unstrukturierten Daten scheitern',
      intro: 'Viele AI-Initiativen starten mit Modell- und Toolfragen und verlieren die Datenrealität aus dem Blick.',
      bridgeSentence:
        'Das ist oft weder nur ein Modellproblem noch nur ein Engineering-Thema, sondern eine Vorbereitungs- und Validierungsaufgabe zwischen Fachlogik und technischer Umsetzung.',
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
      intro:
        'Die Leistung ist bewusst fokussiert: expertengeführte Aufbereitung und Validierung für dokumentenlastige, finanznahe Workflows, damit nachgelagerte AI- und Implementierungsarbeit belastbar wird.',
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
      intro:
        'Kein abstraktes AI-Consulting und kein Black-Box-Service, sondern nachvollziehbare, operativ nutzbare Arbeitsergebnisse.',
      resultsTitle: 'Ergebnisse im Fokus',
      suitableForTitle: 'Geeignet für',
      bullets: [
        'Bereinigte Rohdaten oder Dokumentinhalte mit klarer Zielstruktur',
        'Strukturierte Datensätze in JSONL, CSV oder Parquet',
        'Optional validierte XML-Ergebnisse im Compliance-Kontext',
        'Dokumentierte Feldentscheidungen und Mapping-Klärungen, wo relevant',
        'Nachvollziehbar dokumentierte Aufbereitung für sensible oder regulierte Datenkontexte, wo diese Sorgfalt relevant ist',
        'Validierungshinweise, Qualitätschecks und Auffälligkeiten',
        'Chunking-Struktur für RAG- oder Search-Implementierungen',
        'Handover-fähige Ergebnisse für interne Teams oder Implementierungspartner',
        'Keine abstrakten Versprechen, sondern konkrete und prüfbare Ergebnisse',
      ],
      suitableFor: ['RAG / Knowledge Bases', 'Document AI', 'interne Suchsysteme', 'Datenmigration', 'Workflow-Automatisierung', 'Analyse- und Forecasting-Vorbereitung'],
    },
    process: {
      title: 'So läuft ein Projekt ab',
      intro:
        'Klein anfangen ist ausdrücklich möglich. Viele Projekte starten als begrenzte Validierungsleistung mit engem Umfang, um Strukturqualität, Feldkonsistenz und nachgelagerte Nutzbarkeit sauber zu prüfen.',
      stepLabel: 'Schritt',
      steps: [
        { title: 'Intake & Zielbild', description: 'Datenlage verstehen, Quellen und Zielsysteme erfassen, Risiken und Ausschlusskriterien identifizieren.' },
        { title: 'Analyse & Strukturdesign', description: 'Muster, Inkonsistenzen und Sonderfälle prüfen, Zielstruktur, Felder und Validierungslogik definieren.' },
        { title: 'Aufbereitung & Validierung', description: 'Bereinigung, Mapping, Deduplizierung und Segmentierung durchführen, Metadaten ergänzen, Qualitätschecks anwenden.' },
        { title: 'Übergabe & nächste Schritte', description: 'Finales Ergebnispaket bereitstellen, Dokumentation und Empfehlungen übergeben, optional RAG- oder Automatisierungs-Setup vorbereiten.' },
      ],
      microcopy:
        'Ein Scoped Sample Review oder eine begrenzte Validierungsleistung ist oft der sinnvollste Weg, um Risiken früh sichtbar zu machen, ohne den Umfang künstlich aufzublähen.',
    },
    trust: {
      title: 'Typische Ausgangslagen und Projektrealität',
      intro:
        'Die Stärke dieser Leistung liegt genau zwischen fachlicher Präzision und technischer Umsetzbarkeit. Dort entsteht in finance- und compliance-nahen Projekten oft der eigentliche Hebel.',
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
    whatItIs: {
      title: 'Was diese Leistung ist – und was nicht',
      intro:
        'Die Positionierung ist bewusst klar: keine generische Data-Labeling-Leistung, sondern strukturierte Vorarbeit und Validierung für anspruchsvolle Business- und Dokumentenkontexte.',
      isTitle: 'Was diese Leistung ist',
      is: [
        {
          title: 'Expertengeführte Aufbereitung und Validierung',
          description: 'Kein anonymer Bulk-Prozess, sondern fachlich geführte Strukturarbeit mit Blick auf Risiken, Felder und Nutzbarkeit.',
        },
        {
          title: 'Finanznahe Dokument- und Datenstrukturierung',
          description: 'Geeignet für Buchhaltungs-, Reporting-, Compliance- und andere dokumentenlastige Geschäftsumfelder.',
        },
        {
          title: 'Nachvollziehbare Ergebnisse für nachgelagerte Teams',
          description: 'Saubere Outputs, klare Mapping-Entscheidungen und verwertbare Ergebnisse für interne Teams oder Implementierungspartner.',
        },
        {
          title: 'Passend für sensible Umgebungen',
          description: 'Der Einstieg kann über anonymisierte Beispiele, repräsentative Strukturen oder sichere Zusammenarbeit in Ihrer Umgebung erfolgen.',
        },
      ],
      isNotTitle: 'Was diese Leistung nicht ist',
      isNot: [
        {
          title: 'Kein generisches Bulk-Labeling',
          description: 'Die Arbeit ist nicht auf mengengetriebenes Tagging ohne fachliche Struktur- und Qualitätsprüfung ausgelegt.',
        },
        {
          title: 'Kein Black-Box-AI-Service',
          description: 'Sie erhalten keine schwer nachvollziehbaren Ergebnisse ohne Sicht auf Feldlogik, Validierung und Grenzen.',
        },
        {
          title: 'Kein blindes Automatisierungsversprechen',
          description: 'Die Leistung überspringt keine Datenrealität und verkauft keine technische Abkürzung an der Qualitätsprüfung vorbei.',
        },
        {
          title: 'Kein Ersatz für interne Review-Verantwortung',
          description: 'Gerade in finance- und compliance-nahen Kontexten bleiben fachliche Freigaben und Kontrollschritte entscheidend.',
        },
      ],
    },
    bridgeFit: {
      title: 'Warum diese Arbeit zu meinem Profil passt',
      intro:
        'Ich arbeite an genau der Schnittstelle, an der viele Projekte unklar werden: zwischen kaufmännischer Präzision, Dokumentrealität und technischer Umsetzung.',
      bullets: [
        'Finance-adjacent Hintergrund mit Fokus auf Buchhaltung, Reporting und Prozessqualität',
        'Praxisverständnis für strukturierte und unstrukturierte Geschäftsdokumente',
        'Arbeitsweise mit Nachvollziehbarkeit statt Black-Box-Versprechen',
        'Brücke zwischen Business-Logik, Datenstruktur und technischer Implementierung',
      ],
    },
    faq: {
      title: 'Häufige Fragen',
      items: [
        { question: 'Brauchen Sie sofort Zugriff auf echte Finanzdaten?', answer: 'Nicht zwingend. Für viele erste Einschätzungen reichen anonymisierte Beispiele, repräsentative Strukturen oder eine Zusammenarbeit in Ihrer Umgebung aus.' },
        { question: 'Ist das eine generische Data-Labeling- oder Automatisierungsleistung?', answer: 'Nein. Die Leistung ist bewusst expertengeführt, finanznah und auf Strukturierung, Validierung und belastbare Ergebnisse ausgerichtet.' },
        { question: 'Was passiert nach einem Scoped Sample Review?', answer: 'Sie erhalten eine klare Einschätzung zu Strukturqualität, Risiken, Nutzbarkeit und zum sinnvollsten nächsten Schritt für interne Teams oder Implementierungspartner.' },
        { question: 'Wie kann die Zusammenarbeit in sensiblen Umgebungen starten?', answer: 'Je nach Umfeld mit anonymisierten Auszügen, synthetischen Strukturen oder direkt in einem definierten sicheren Arbeitsrahmen auf Ihrer Seite.' },
        { question: 'Hilft diese Leistung bei EU AI Act Readiness?', answer: 'Wo Pflichten aus dem EU AI Act relevant werden, vor allem in höher riskanten AI-Kontexten, unterstützt diese Arbeit die Art von Daten-Governance, Nachvollziehbarkeit und Dokumentationsdisziplin, die rund um Aufbereitung und Validierung erwartet wird. Sie ist jedoch kein Ersatz für Rechts- oder Compliance-Beratung und zertifiziert keine organisatorische Konformität.' },
        { question: 'Ist das nur für große AI-Projekte relevant?', answer: 'Nein. Gerade kleine Pilotprojekte profitieren stark von sauberer Datenstruktur, bevor größere Investitionen erfolgen.' },
        { question: 'Welche Formate können verarbeitet werden?', answer: 'Typisch sind PDF, DOCX, Tabellenexporte, CSV, ERP-Listen und strukturierte Formate wie XML.' },
        { question: 'Ersetzen Sie ein komplettes Data-Engineering-Team?', answer: 'Nein. Die Leistung ist bewusst fokussiert: Aufbereitung, Validierung und belastbare Ergebnisse zwischen Fachlogik und technischer Implementierung.' },
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
        { name: 'Begrenzte Strukturvalidierung', price: 'ab 350 €', description: 'Für Unternehmen, die mit geringem Risiko prüfen möchten, ob Dokumente oder Datenbestände für AI, RAG oder nachgelagerte Umsetzung tragfähig vorbereitet werden können.', scope: ['1 anonymisierter Auszug, repräsentative Struktur oder kleines Dokumentenpaket', 'Erste Analyse von Struktur, Qualität und Risiken', 'Einschätzung zu Feldlogik, Mapping und Verwendbarkeit', 'Kurze Empfehlung für den sinnvollsten nächsten Schritt'], duration: '0,5 bis 2 Arbeitstage', note: 'Wird bei Folgeprojekt vollständig angerechnet.' },
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
      body:
        'Wenn bereits dokumenten- oder datenlastige Prozesse für AI, RAG oder Analyse vorbereitet werden sollen, beginnt der belastbare Teil der Arbeit meist vor dem Modell.',
      primaryCta: { label: 'Discovery Call', href: deRoutes.discovery },
      secondaryCta: { label: 'Sample Review besprechen', href: deRoutes.sampleReview },
      asideLabel: 'Nächster Schritt',
      microcopy:
        'Auf Wunsch zunächst mit anonymisiertem Auszug, repräsentativer Struktur oder klar begrenzter Validierungsleistung.',
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
        { title: 'Expert-led preparation informed by accounting, reporting and process logic' },
        { title: 'Reliable outputs for RAG, analytics, Document AI and downstream implementation' },
        { title: 'Traceable, privacy-aware and compliance-minded delivery' },
      ],
      trustStrip: [
        'Low-risk validation scope',
        'Anonymized samples or in-environment collaboration',
        'Traceable, finance-aware delivery',
      ],
      primaryCta: { label: 'Discovery Call', href: enRoutes.discovery },
      secondaryCta: { label: 'Discuss Sample Review', href: enRoutes.sampleReview },
      flowLabel: 'Input -> Structure -> Output',
      flowStages: ['Input', 'Structure', 'Output'],
      outputFocusTitle: 'Output focus',
      outputFocusBody:
        'Clean structures, traceable fields and AI-ready outputs for finance, compliance and document-heavy workflows.',
    },
    collaboration: {
      title: 'How collaboration can start',
      intro:
        'A sensible first step does not always require immediate access to raw sensitive finance data. The initial collaboration mode can be chosen to fit the environment.',
      cards: [
        {
          title: 'Anonymized sample',
          body: 'For many first assessments, an anonymized sample or reduced document excerpt is enough to evaluate structure, field logic and likely risks.',
        },
        {
          title: 'Representative or synthetic structure',
          body: 'If real data cannot be shared yet, a representative structure or synthetic example can still be enough to align on target format, mapping and validation logic.',
        },
        {
          title: 'In-environment collaboration',
          body: 'Where governance or confidentiality requires it, the work can start within your environment or a tightly controlled secure setup.',
        },
      ],
    },
    problem: {
      title: 'Why AI projects fail on unstructured data',
      intro: 'Many AI initiatives start with model questions and underestimate the reality of the source data.',
      bridgeSentence:
        'This is often not only a model problem and not only an engineering problem, but a preparation and validation problem between business logic and technical implementation.',
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
      intro:
        'The offer is deliberately narrow: expert-led preparation and validation for finance-adjacent, document-heavy workflows so downstream AI and implementation work becomes more reliable.',
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
      intro:
        'Not abstract AI consulting and not a black-box service, but concrete deliverables that internal teams or implementation partners can actually use.',
      resultsTitle: 'Deliverables in focus',
      suitableForTitle: 'Suitable for',
      bullets: [
        'Cleaned raw data or document content with a clear target structure',
        'Structured datasets in JSONL, CSV or Parquet',
        'Optional validated XML outputs in compliance contexts',
        'Documented field decisions and mapping clarifications where relevant',
        'Traceable, well-documented preparation where sensitive or regulated workflows require that extra discipline',
        'Validation notes, quality checks and important caveats',
        'Chunking structures for RAG or search implementations',
        'Handover-ready results for internal teams or implementation partners',
        'Concrete deliverables instead of generic automation promises',
      ],
      suitableFor: ['RAG / knowledge bases', 'Document AI', 'internal search systems', 'data migration', 'workflow automation', 'analytics and forecasting preparation'],
    },
    process: {
      title: 'How a project works',
      intro:
        'Starting small is explicitly possible. Many engagements begin as a limited-scope validation engagement to test structure quality, field consistency and downstream usability before more is built.',
      stepLabel: 'Step',
      steps: [
        { title: 'Intake & target picture', description: 'Understand the data landscape, source systems and targets, and identify risks and exclusions.' },
        { title: 'Analysis & structure design', description: 'Review patterns, inconsistencies and edge cases, then define target structure, fields and validation logic.' },
        { title: 'Preparation & validation', description: 'Clean, map, deduplicate and segment the data, enrich metadata and apply quality checks.' },
        { title: 'Handover & next steps', description: 'Deliver the final output package, documentation and recommendations, with optional support for the next implementation step.' },
      ],
      microcopy:
        'A scoped sample review is often the fastest way to de-risk later AI or implementation work without inflating the scope too early.',
    },
    trust: {
      title: 'Typical starting points and project reality',
      intro:
        'The value of this work sits at the point where business precision and technical implementation need to meet. That is exactly where many finance-heavy AI projects become fragile.',
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
    whatItIs: {
      title: 'What this is – and what it is not',
      intro:
        'The positioning is intentionally precise: not a generic outsourcing service, but expert-led preparation and validation for sensitive document and data contexts.',
      isTitle: 'What this is',
      is: [
        {
          title: 'Expert-led preparation and validation',
          description: 'The work is guided by structure quality, field consistency and downstream usability, not by volume alone.',
        },
        {
          title: 'Finance-aware document and data structuring',
          description: 'Suitable for accounting-adjacent, compliance-heavy and document-heavy business environments.',
        },
        {
          title: 'Traceable outputs for downstream use',
          description: 'Internal teams or implementation partners receive structured outputs, mapping clarity and documented validation context.',
        },
        {
          title: 'A low-risk way to start',
          description: 'Collaboration can begin with anonymized samples, representative structures or tightly controlled in-environment work.',
        },
      ],
      isNotTitle: 'What this is not',
      isNot: [
        {
          title: 'Not generic bulk labeling',
          description: 'The service is not designed as volume-only tagging without business-aware structure review.',
        },
        {
          title: 'Not a black-box AI service',
          description: 'You do not receive opaque outputs without field logic, validation context or reviewability.',
        },
        {
          title: 'Not a blind automation promise',
          description: 'The work does not pretend that poor structure can be skipped over with tooling alone.',
        },
        {
          title: 'Not a shortcut around review',
          description: 'In finance and compliance contexts, validation and internal review remain part of the serious path forward.',
        },
      ],
    },
    bridgeFit: {
      title: 'Why this work fits my profile',
      intro:
        'I work in the layer where business logic, document reality and technical implementation need to align. That bridge is where this kind of work becomes useful.',
      bullets: [
        'Finance-adjacent background with a focus on accounting and process quality',
        'Hands-on understanding of structured and unstructured business documents',
        'Traceability over black-box promises',
        'A practical bridge between business precision and technical implementation',
      ],
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        { question: 'Do you need access to real finance data immediately?', answer: 'Not necessarily. Many first assessments can begin with anonymized samples, representative structures or work performed inside your environment.' },
        { question: 'Is this a generic labeling or automation service?', answer: 'No. The service is intentionally expert-led, finance-aware and focused on preparation, validation and downstream reliability.' },
        { question: 'What happens after the pilot or sample review?', answer: 'You receive a clear assessment of structure quality, risks, downstream usability and the most sensible next step for internal teams or implementation partners.' },
        { question: 'How can collaboration start in sensitive environments?', answer: 'Depending on the setup, with anonymized excerpts, synthetic structures or tightly controlled in-environment collaboration.' },
        { question: 'Does this help with EU AI Act readiness?', answer: 'Where EU AI Act obligations are relevant, especially in higher-risk AI contexts, this work supports the kind of data governance, traceability and documentation discipline expected around data preparation and validation. It does not replace legal or compliance advice and does not by itself certify organisational compliance.' },
        { question: 'Is this only relevant for large AI projects?', answer: 'No. Smaller pilots often benefit the most from proper structure before larger investments are made.' },
        { question: 'What formats can be processed?', answer: 'Typical inputs include PDF, DOCX, spreadsheet exports, CSV, ERP lists and structured formats such as XML.' },
        { question: 'Do you replace a full data engineering team?', answer: 'No. The service is intentionally focused on preparation, validation and reliable handover between business precision and technical implementation.' },
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
        { name: 'Scoped Sample Review', price: 'from €350', description: 'For teams that want a low-risk first step to validate whether their documents or datasets can support AI, RAG or downstream implementation work.', scope: ['1 anonymized sample, representative structure or small document package', 'Initial assessment of structure, quality and risks', 'Review of field logic, mapping clarity and usability', 'Short recommendation for the next sensible step'], duration: '0.5 to 2 work days', note: 'Fully credited if a follow-up project starts.' },
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
      body:
        'If you already have document-heavy or finance-adjacent data that should become usable for AI, RAG or analytics, the reliable work usually starts before the model does.',
      primaryCta: { label: 'Discovery Call', href: enRoutes.discovery },
      secondaryCta: { label: 'Discuss Sample Review', href: enRoutes.sampleReview },
      asideLabel: 'Next step',
      microcopy:
        'If needed, start with an anonymized sample, representative structure or a tightly scoped validation engagement.',
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
        { title: 'Pregătire expert-led, cu înțelegere practică a logicii contabile și de proces' },
        { title: 'Rezultate fiabile pentru RAG, analiză, Document AI și pașii tehnici următori' },
        { title: 'Livrare trasabilă, atentă la confidențialitate și conformitate' },
      ],
      trustStrip: [
        'Scope limitat pentru validare',
        'Exemple anonimizate sau colaborare în mediul tău',
        'Livrare trasabilă, atentă la contextul financiar',
      ],
      primaryCta: { label: 'Discovery Call', href: roRoutes.discovery },
      secondaryCta: { label: 'Discută Sample Review', href: roRoutes.sampleReview },
      flowLabel: 'Input -> Structură -> Rezultat',
      flowStages: ['Input', 'Structură', 'Rezultat'],
      outputFocusTitle: 'Focus pe rezultat',
      outputFocusBody:
        'Structuri curate, câmpuri trasabile și rezultate pregătite pentru AI în fluxuri financiare, de conformitate și cu volum mare de documente.',
    },
    collaboration: {
      title: 'Cum poate începe colaborarea',
      intro:
        'Un început solid nu cere automat schimbul imediat de date financiare sensibile. Modul de colaborare poate fi ales în funcție de constrângerile reale ale mediului tău.',
      cards: [
        {
          title: 'Eșantion anonimizat',
          body: 'Pentru multe evaluări inițiale este suficient un eșantion anonimizat sau un extras redus, ca să verificăm structura, logica de câmpuri și riscurile probabile.',
        },
        {
          title: 'Structură reprezentativă sau sintetică',
          body: 'Dacă datele reale nu pot fi împărtășite încă, o structură reprezentativă sau un exemplu sintetic poate fi suficient pentru alinierea asupra formatului țintă și a regulilor de validare.',
        },
        {
          title: 'Colaborare în mediul tău',
          body: 'Când guvernanța sau confidențialitatea o cer, lucrul poate începe direct în mediul tău sau într-un cadru securizat strict controlat.',
        },
      ],
    },
    problem: {
      title: 'De ce proiectele AI eșuează din cauza datelor nestructurate',
      intro: 'Multe inițiative AI pornesc de la întrebări despre model și subestimează realitatea datelor sursă.',
      bridgeSentence:
        'De multe ori nu este doar o problemă de model și nici doar o problemă de engineering, ci o problemă de pregătire și validare între logica de business și implementarea tehnică.',
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
      intro:
        'Oferta rămâne clar delimitată: pregătire și validare expert-led pentru fluxuri document-heavy și contexte apropiate de procesele financiare, astfel încât pașii tehnici și AI care urmează să devină mai fiabili.',
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
      intro:
        'Nu consultanță AI abstractă și nici un serviciu opac de tip black-box, ci livrabile clare, verificabile și utilizabile operațional.',
      resultsTitle: 'Livrabile în prim-plan',
      suitableForTitle: 'Potrivit pentru',
      bullets: [
        'Date brute sau conținut de documente curățate, cu structură țintă clară',
        'Seturi de date structurate în JSONL, CSV sau Parquet',
        'Opțional rezultate XML validate în contexte de conformitate',
        'Decizii documentate de câmpuri și clarificări de mapping, unde este relevant',
        'Pregătire trasabilă și bine documentată acolo unde fluxurile sensibile sau reglementate cer acest nivel de rigoare',
        'Note de validare, controale de calitate și observații importante',
        'Structură de chunking pentru implementări RAG sau search',
        'Rezultate pregătite de handover pentru echipe interne sau parteneri de implementare',
        'Livrabile concrete, nu promisiuni generice de automatizare',
      ],
      suitableFor: ['RAG / baze de cunoștințe', 'Document AI', 'sisteme interne de căutare', 'migrare de date', 'automatizare de fluxuri', 'pregătire pentru analiză și prognoză'],
    },
    process: {
      title: 'Cum decurge un proiect',
      intro:
        'Un start mic este perfect legitim. Multe colaborări încep ca o validare cu scope limitat, pentru a testa calitatea structurii, consistența câmpurilor și utilitatea downstream înainte de o anvergură mai mare.',
      stepLabel: 'Pas',
      steps: [
        { title: 'Clarificare & imagine-țintă', description: 'Înțeleg sursele de date, sistemele țintă și identific riscurile și excluderile.' },
        { title: 'Analiză & design de structură', description: 'Verific tipare, inconsistențe și cazuri speciale și definesc structura țintă, câmpurile și logica de validare.' },
        { title: 'Pregătire & validare', description: 'Curăț, mapez, deduplic și segmentez datele, completez metadatele și aplic verificări de calitate.' },
        { title: 'Predare & pașii următori', description: 'Livrez pachetul final, documentația și recomandările și pot pregăti și pasul următor de implementare.' },
      ],
      microcopy:
        'Un Scoped Sample Review este adesea cea mai rapidă cale de a reduce riscul înainte ca o inițiativă AI sau de implementare să devină mai mare.',
    },
    trust: {
      title: 'Situații tipice de pornire și realitatea proiectului',
      intro:
        'Valoarea reală a acestui serviciu apare exact acolo unde precizia de business și implementarea tehnică trebuie să se întâlnească. Acolo devin multe proiecte fragile.',
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
    whatItIs: {
      title: 'Ce este acest serviciu – și ce nu este',
      intro:
        'Poziționarea este intenționat clară: nu un serviciu generic de outsourcing, ci pregătire și validare ghidată de expertiză pentru contexte sensibile, document-heavy și atente la realitatea financiară.',
      isTitle: 'Ce este',
      is: [
        {
          title: 'Pregătire și validare expert-led',
          description: 'Munca este ghidată de calitatea structurii, consistența câmpurilor și utilitatea downstream, nu doar de volum.',
        },
        {
          title: 'Structurare a datelor și documentelor cu sensibilitate financiară',
          description: 'Potrivit pentru medii apropiate de contabilitate, reporting, conformitate și documente de business.',
        },
        {
          title: 'Rezultate trasabile pentru pașii următori',
          description: 'Echipele interne sau partenerii de implementare primesc output-uri structurate, claritate de mapping și context de validare.',
        },
        {
          title: 'Un mod cu risc redus de a începe',
          description: 'Colaborarea poate porni cu eșantioane anonimizate, structuri reprezentative sau lucru în mediul tău.',
        },
      ],
      isNotTitle: 'Ce nu este',
      isNot: [
        {
          title: 'Nu este bulk labeling generic',
          description: 'Serviciul nu este gândit ca tagging orientat doar pe volum, fără review de structură și logică de business.',
        },
        {
          title: 'Nu este un serviciu AI black-box',
          description: 'Nu primești output-uri opace, fără logică de câmpuri, context de validare sau posibilitate de review.',
        },
        {
          title: 'Nu este o promisiune oarbă de automatizare',
          description: 'Serviciul nu pretinde că instrumentele pot ocoli realitatea structurii și a calității datelor.',
        },
        {
          title: 'Nu este o scurtătură peste review',
          description: 'În contexte financiare și de conformitate, validarea și aprobările interne rămân parte din traseul serios.',
        },
      ],
    },
    bridgeFit: {
      title: 'De ce această muncă se potrivește profilului meu',
      intro:
        'Lucrez exact în stratul în care trebuie să se alinieze logica de business, realitatea documentelor și implementarea tehnică. Acolo devine util acest tip de serviciu.',
      bullets: [
        'Background apropiat de zona financiară, cu accent pe contabilitate și calitatea proceselor',
        'Înțelegere practică a documentelor business structurate și nestructurate',
        'Trasabilitate în loc de promisiuni opace de tip black-box',
        'Punte reală între precizia business și implementarea tehnică',
      ],
    },
    faq: {
      title: 'Întrebări frecvente',
      items: [
        { question: 'Ai nevoie imediat de date financiare reale?', answer: 'Nu neapărat. Multe evaluări inițiale pot începe cu eșantioane anonimizate, structuri reprezentative sau lucru direct în mediul tău.' },
        { question: 'Este acesta un serviciu generic de labeling sau automatizare?', answer: 'Nu. Serviciul este intenționat ghidat de expertiză, atent la realitatea financiară și concentrat pe pregătire, validare și fiabilitate în pașii următori.' },
        { question: 'Ce se întâmplă după pilot sau Sample Review?', answer: 'Primești o evaluare clară despre calitatea structurii, riscuri, utilizabilitatea downstream și următorul pas rezonabil pentru echipe interne sau parteneri de implementare.' },
        { question: 'Cum poate începe colaborarea în medii sensibile?', answer: 'În funcție de context, cu extrase anonimizate, structuri sintetice sau colaborare controlată direct în mediul tău.' },
        { question: 'Ajută acest serviciu la pregătirea pentru EU AI Act?', answer: 'Acolo unde obligațiile din EU AI Act devin relevante, mai ales în contexte AI cu risc mai ridicat, acest tip de muncă sprijină disciplina de guvernanță a datelor, trasabilitate și documentare așteptată în jurul pregătirii și validării datelor. Nu înlocuiește consultanța juridică sau de conformitate și nu certifică, prin sine, conformitatea organizațională.' },
        { question: 'Este relevant doar pentru proiecte AI mari?', answer: 'Nu. Tocmai proiectele pilot mai mici beneficiază de structură bună înainte de investiții mai mari.' },
        { question: 'Ce formate poți procesa?', answer: 'Tipic: PDF, DOCX, exporturi tabelare, CSV, liste ERP și formate structurate precum XML.' },
        { question: 'Înlocuiești o echipă completă de data engineering?', answer: 'Nu. Serviciul este intenționat focalizat pe pregătire, validare și handover fiabil între precizia de business și implementarea tehnică.' },
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
        { name: 'Scoped Sample Review', price: 'de la 350 €', description: 'Pentru echipe care vor un prim pas cu risc redus, ca să valideze dacă documentele sau datele lor pot susține AI, RAG sau implementarea ulterioară.', scope: ['1 eșantion anonimizat, structură reprezentativă sau pachet mic de documente', 'Evaluare inițială a structurii, calității și riscurilor', 'Review al logicii de câmpuri, mapping-ului și utilizabilității', 'Recomandare scurtă pentru următorul pas rezonabil'], duration: '0,5 până la 2 zile de lucru', note: 'Se deduce integral dacă pornește un proiect ulterior.' },
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
      body:
        'Dacă ai deja documente sau date finance-adjacent care trebuie să devină utilizabile pentru AI, RAG sau analiză, partea fiabilă a muncii începe de obicei înainte de model.',
      primaryCta: { label: 'Discovery Call', href: roRoutes.discovery },
      secondaryCta: { label: 'Discută Sample Review', href: roRoutes.sampleReview },
      asideLabel: 'Pasul următor',
      microcopy:
        'La nevoie, poți începe cu un eșantion anonimizat, o structură reprezentativă sau o validare cu scope limitat.',
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
      title: 'Problem und Startpunkt fachlich klären',
      subtitle: 'Der Call ist für Entscheider gedacht, die klären möchten, ob Dokumente oder Finanzdaten mit einem risikoarmen, expertengeführten Einstieg sinnvoll bewertet werden können.',
    },
    fit: { title: 'Für wen der Call sinnvoll ist', bullets: ['CFOs, Leiter Rechnungswesen und Finance Ops', 'ERP-/DMS-nahe Verantwortliche mit heterogenen Datenbeständen', 'Interne Teams oder Beratungen, die zwischen Fachlogik und technischer Umsetzung Klarheit brauchen'] },
    agenda: { title: 'Was wir im Call klären', bullets: ['Datenquellen, Formate und sensible Rahmenbedingungen', 'Ob anonymisierte Samples, repräsentative Strukturen oder Arbeit in Ihrer Umgebung sinnvoll sind', 'Welche Ergebnisse realistisch und nachgelagert nutzbar sind', 'Ob ein Scoped Sample Review oder direkt ein größerer Umfang der richtige nächste Schritt ist'] },
    expectations: { title: 'Was der Call nicht ist', bullets: ['kein allgemeines AI-Strategiegespräch ohne Datenbezug', 'kein Sales-Pitch mit Buzzwords', 'keine technische Deep-Dive-Session ohne Vorabkontext'] },
    cta: { title: 'Termin buchen', body: 'Wenn der Fit klar ist, führen Sie den Call direkt über Cal.com fort.', button: { label: 'Discovery Call auf Cal.com', href: dataPrepCalUrl, external: true }, microcopy: 'Wenn Sie zuerst den sensiblen Rahmen und die Datenbasis validieren möchten, starten Sie stattdessen mit einem Scoped Sample Review.', backLabel: 'Zur Landing Page', quickCheckTitle: 'Schnellprüfung', quickCheckItems: ['Konkrete Datenquellen, Zielsysteme und sensible Rahmenbedingungen', 'Realistischer Ergebnisumfang und downstream Nutzbarkeit', 'Risiken, Sonderfälle und Eignung für einen risikoarmen Einstieg'] },
  },
  en: {
    seo: {
      title: 'Discovery Call for AI Data Preparation | Mihai Adrian Mateescu',
      description: 'Book a discovery call to clarify data sources, target systems, output formats and the most sensible starting point for a pilot.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Discovery Call',
      title: 'Clarify the problem before building',
      subtitle: 'This call is for decision-makers who want to understand whether their documents or finance data are suitable for a low-risk, expert-led starting scope.',
    },
    fit: { title: 'Who this call is for', bullets: ['CFOs, heads of accounting and finance operations', 'ERP- or DMS-adjacent owners of heterogeneous datasets', 'Internal teams or consultancies that need clarity between business logic and technical implementation'] },
    agenda: { title: 'What we clarify in the call', bullets: ['Data sources, formats and sensitive-environment constraints', 'Whether anonymized samples, representative structures or in-environment work make sense', 'What outputs are realistic and usable downstream', 'Whether a scoped sample review or a broader engagement is the right next step'] },
    expectations: { title: 'What the call is not', bullets: ['not a generic AI strategy chat without data context', 'not a buzzword-heavy sales pitch', 'not a technical deep dive without upfront context'] },
    cta: { title: 'Book the call', body: 'If the fit looks clear, continue directly through Cal.com.', button: { label: 'Book on Cal.com', href: dataPrepCalUrl, external: true }, microcopy: 'If the scope still needs validation, start with a scoped sample review instead.', backLabel: 'Back to landing page', quickCheckTitle: 'Quick check', quickCheckItems: ['Concrete data sources, target systems and sensitive-environment constraints', 'Realistic deliverable scope and downstream usability', 'Risks, edge cases and fit for a low-risk starting engagement'] },
  },
  ro: {
    seo: {
      title: 'Discovery Call pentru Pregătire Date AI | Mihai Adrian Mateescu',
      description: 'Programează un discovery call pentru a clarifica sursele de date, sistemele țintă, formatele de rezultat și cel mai potrivit punct de plecare pentru un pilot.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Discovery Call',
      title: 'Clarifică problema înainte să construim',
      subtitle: 'Această discuție este pentru decidenți care vor să înțeleagă dacă documentele sau datele lor financiare se potrivesc unui start cu risc redus și ghidare expert-led.',
    },
    fit: { title: 'Pentru cine este util acest call', bullets: ['CFO, responsabili de contabilitate sau finance operations', 'Responsabili ERP / DMS cu seturi de date eterogene', 'Echipe interne sau consultanțe care au nevoie de claritate între logica de business și implementarea tehnică'] },
    agenda: { title: 'Ce clarificăm în call', bullets: ['Surse de date, formate și constrângeri din medii sensibile', 'Dacă au sens eșantioane anonimizate, structuri reprezentative sau lucru în mediul tău', 'Ce rezultate sunt realist posibile și utile downstream', 'Dacă următorul pas corect este un Scoped Sample Review sau o colaborare mai amplă'] },
    expectations: { title: 'Ce nu este acest call', bullets: ['nu este o discuție generică de strategie AI fără context de date', 'nu este o prezentare de vânzare plină de buzzwords', 'nu este o analiză tehnică în profunzime fără context prealabil'] },
    cta: { title: 'Programează discuția', body: 'Dacă potrivirea este clară, continuă direct prin Cal.com.', button: { label: 'Programează pe Cal.com', href: dataPrepCalUrl, external: true }, microcopy: 'Dacă scope-ul trebuie validat mai întâi, începe cu un Scoped Sample Review.', backLabel: 'Înapoi la landing page', quickCheckTitle: 'Verificare rapidă', quickCheckItems: ['Surse concrete de date, sisteme țintă și constrângeri din medii sensibile', 'Volum realist al rezultatelor și utilitatea downstream', 'Riscuri, cazuri speciale și potrivirea pentru un început cu risc redus'] },
  },
};

export const sampleReviewContentByLocale: Record<DataPrepLocale, SampleReviewContent> = {
  de: {
    seo: {
      title: 'Sample-Struktur prüfen | Datenaufbereitung für KI',
      description: 'Begrenzte, kostenpflichtige Validierungsleistung zur fachlichen Vorprüfung Ihrer Datenbasis für AI, RAG oder nachgelagerte Umsetzung.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Scoped Sample Review',
      title: 'Sample-Struktur prüfen',
      subtitle: 'Mit einer kostenpflichtigen, klar abgegrenzten Validierungsleistung prüfen wir, ob Ihre Daten oder Dokumente für einen realistischen AI-Einstieg tragfähig sind.',
    },
    commercial: {
      title: 'Begrenzte Validierungsleistung mit echter B2B-Selektion',
      price: 'ab 350 €',
      body: 'Die Strukturprüfung des Samples ist keine kostenlose Anfrageform, sondern ein bezahlter Einstieg zur Vorprüfung von Struktur, Risiken, Feldkonsistenz und realistischer Umsetzbarkeit.',
      note: 'Der Betrag wird bei Beauftragung eines Folgeprojekts vollständig angerechnet. Kein Datei-Upload in V1; der erste Schritt dient einer risikoarmen Umfangsklärung, bevor sensible Finanzdaten sicher ausgetauscht werden.',
    },
    pitch: {
      title: 'Warum ein Scoped Sample Review sinnvoll ist',
      body: ['Viele AI- und Automatisierungsprojekte scheitern nicht am Modell, sondern an der Datenrealität.', 'Eine kleine, klar abgegrenzte Validierungsleistung schafft früh Klarheit über Nutzbarkeit, Risiken, Zielstruktur und passende Ergebnisformate.'],
    },
    requirements: {
      title: 'Was Sie im Scoped Sample Review erhalten',
      bullets: ['eine kurze fachliche und technische Einschätzung', 'Hinweise zu Risiken, Datenqualität, Feldkonsistenz und Struktur', 'einen realistischen Projektvorschlag', 'eine belastbare Grundlage für Budget und Umfang', 'auf Wunsch zunächst mit anonymisiertem Beispieldatensatz'],
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
      footerNote: 'Kein Datei-Upload in V1. Die Anfrage dient der Umfangsklärung für eine kostenpflichtige Validierungsleistung, bevor sensible Daten sicher ausgetauscht werden.',
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
      submitLabel: 'Scoped Sample Review anfragen',
      successRedirect: deRoutes.thankYou,
      unavailableMessage: 'Diese Funktion ist derzeit nicht verfügbar. Bitte kontaktieren Sie uns direkt per E-Mail — Ihre Angaben bleiben erhalten.',
      validationMessage: 'Bitte überprüfen Sie Ihre Angaben und versuchen Sie es erneut.',
      genericErrorMessage: 'Die Anfrage konnte nicht gesendet werden. Bitte versuchen Sie es später erneut.',
      disabledNotice: 'Der Scoped Sample Review ist derzeit noch nicht verfügbar. Kontaktieren Sie uns gerne direkt per E-Mail, um einen Einstieg zu besprechen.',
    },
    submission: {
      title: 'Nach dem Absenden',
      body: ['Ich prüfe die Angaben fachlich und melde mich mit einer klaren Einschätzung.', 'Wenn der Umfang passt, erhalten Sie einen Vorschlag für den nächsten sinnvollen Schritt und den passenden Arbeitsmodus.'],
      guarantee: 'Der Einstieg kann bewusst klein gehalten werden.',
    },
    cta: {
      title: 'Bereit für den ersten Check?',
      body: 'Wenn Sie bereits konkrete Datenmuster, Dokumenttypen oder Strukturfragen haben, startet hier die fachliche Vorprüfung über das Formular auf dieser Website.',
      minimizationTitle: 'Anonymisierung',
      minimizationBody: 'Wenn die Daten sensibel sind, reicht für V1 ein anonymisierter Auszug oder eine beschreibende Zusammenfassung.',
      reviewSummary: 'Nach dem Absenden erhalten Sie eine klare Einordnung zu Umfang, Risiken und dem sinnvollsten nächsten Schritt für eine begrenzte Validierungsleistung.',
      backLabel: 'Zur Landing Page',
    },
  },
  en: {
    seo: {
      title: 'Review Sample Structure | AI Data Preparation',
      description: 'A paid, limited-scope validation engagement to assess whether your data foundation is suitable for AI, RAG or downstream implementation.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Scoped Sample Review',
      title: 'Review Sample Structure',
      subtitle: 'With a paid, tightly scoped validation engagement, we assess whether your data or documents are realistic candidates for an AI initiative.',
    },
    commercial: {
      title: 'Limited-scope validation with deliberate B2B filtering',
      price: 'from €350',
      body: 'This is not a free lead magnet. It is a paid first step to assess structure, risks, field consistency and realistic implementation potential.',
      note: 'The amount is fully credited if a follow-up project starts. No file upload in V1; the first step is a low-risk scope clarification before any sensitive finance data is exchanged securely.',
    },
    pitch: {
      title: 'Why a scoped sample review is the right starting point',
      body: ['Many AI and automation initiatives fail because of the data foundation, not because of the model.', 'A tightly scoped validation engagement creates early clarity on usability, risks, target structure and realistic output formats.'],
    },
    requirements: {
      title: 'What you receive in the scoped sample review',
      bullets: ['a short business and technical assessment', 'notes on risks, data quality, field consistency and structure', 'a realistic project recommendation', 'a sound basis for budget and scope', 'optionally based on anonymized examples first'],
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
      footerNote: 'No file upload in V1. This request is used to clarify scope for a paid validation engagement before sensitive data is exchanged securely.',
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
      submitLabel: 'Request scoped sample review',
      successRedirect: enRoutes.thankYou,
      unavailableMessage: 'This feature is temporarily unavailable. Please contact us directly by email — your input has been kept.',
      validationMessage: 'Please check your input and try again.',
      genericErrorMessage: 'The request could not be sent. Please try again later.',
      disabledNotice: 'Scoped Sample Review is not yet available. Feel free to contact us directly by email to discuss a starting point.',
    },
    submission: {
      title: 'After submitting',
      body: ['I review the request and come back with a clear assessment.', 'If the scope fits, you receive a recommendation for the most sensible next step and collaboration mode.'],
      guarantee: 'The initial scope can stay intentionally small.',
    },
    cta: {
      title: 'Ready for the first review?',
      body: 'If you already have a concrete sample dataset or document pattern, this is where the structured review starts.',
      minimizationTitle: 'Data minimization',
      minimizationBody: 'If the data is sensitive, an anonymized excerpt or descriptive summary is sufficient for V1.',
      reviewSummary: 'After submission, you receive a clear view on scope, risks and the most sensible next step for a limited-scope validation engagement.',
      backLabel: 'Back to landing page',
    },
  },
  ro: {
    seo: {
      title: 'Revizuire Structură Eșantion | Pregătire Date AI',
      description: 'O validare plătită, cu scope limitat, pentru a evalua dacă baza ta de date este potrivită pentru AI, RAG sau implementarea ulterioară.',
      ogImage: '/images/og-default.webp',
    },
    hero: {
      eyebrow: 'Scoped Sample Review',
      title: 'Revizuire Structură Eșantion',
      subtitle: 'Printr-o validare plătită și bine delimitată verificăm dacă datele sau documentele tale sunt candidați realiști pentru o inițiativă AI.',
    },
    commercial: {
      title: 'Validare cu scope limitat și filtrare B2B reală',
      price: 'de la 350 €',
      body: 'Aceasta nu este o solicitare gratuită de captare, ci un prim pas plătit pentru a evalua structura, riscurile, consistența câmpurilor și fezabilitatea reală.',
      note: 'Suma se deduce integral dacă începe un proiect ulterior. Fără încărcare de fișiere în V1; primul pas este o clarificare cu risc redus înainte de schimbul securizat de date sensibile.',
    },
    pitch: {
      title: 'De ce un Scoped Sample Review este punctul corect de plecare',
      body: ['Multe inițiative AI și de automatizare eșuează din cauza bazei de date, nu din cauza modelului.', 'O validare îngustă și bine delimitată oferă claritate timpurie despre utilizabilitate, riscuri, structură țintă și rezultate realiste.'],
    },
    requirements: {
      title: 'Ce primești în acest Scoped Sample Review',
      bullets: ['o evaluare scurtă de business și tehnică', 'observații despre riscuri, calitatea datelor, consistența câmpurilor și structură', 'o recomandare realistă de proiect', 'o bază solidă pentru buget și anvergură', 'la nevoie, pornind de la exemple anonimizate'],
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
      footerNote: 'Fără încărcare de fișiere în V1. Cererea servește clarificării anvergurii pentru o validare plătită, înainte de schimbul securizat al datelor sensibile.',
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
      submitLabel: 'Solicită Scoped Sample Review',
      successRedirect: roRoutes.thankYou,
      unavailableMessage: 'Această funcție nu este disponibilă momentan. Te rugăm să ne contactezi direct prin email — datele introduse rămân păstrate.',
      validationMessage: 'Te rugăm să verifici datele introduse și să încerci din nou.',
      genericErrorMessage: 'Solicitarea nu a putut fi trimisă. Te rugăm să încerci din nou mai târziu.',
      disabledNotice: 'Scoped Sample Review nu este încă disponibil. Ne poți contacta direct prin email pentru a discuta un punct de plecare.',
    },
    submission: {
      title: 'După trimitere',
      body: ['Analizez solicitarea și revin cu o evaluare clară.', 'Dacă anvergura se potrivește, primești o recomandare pentru următorul pas rezonabil și modul de colaborare potrivit.'],
      guarantee: 'Anvergura inițială poate rămâne intenționat mică.',
    },
    cta: {
      title: 'Pregătit pentru prima evaluare?',
      body: 'Dacă ai deja un eșantion concret de date sau documente, aici începe revizuirea structurii.',
      minimizationTitle: 'Minimizarea datelor',
      minimizationBody: 'Dacă datele sunt sensibile, pentru V1 este suficient un extras anonimizat sau un rezumat descriptiv.',
      reviewSummary: 'După trimitere, primești o imagine clară asupra anvergurii, riscurilor și următorului pas rezonabil pentru o validare cu scope limitat.',
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
    nextStepBody: 'Wenn eine begrenzte Validierungsleistung sinnvoll ist, erhalten Sie eine klare Einordnung zu Umfang, Risiken und sinnvoller Ausgangslage.',
    replyTitle: 'Direkte Rückmeldung per E-Mail',
    replyBody: 'Ich antworte auf dieselbe Business-E-Mail-Adresse, die Sie im Formular angegeben haben.',
    reviewTitle: 'Was ich jetzt prüfe',
    reviewItems: ['Struktur und Verwertbarkeit der angegebenen Datenbasis', 'Risiken, Sonderfälle und notwendige Vorarbeit', 'Ob ein Scoped Sample Review oder ein direkter nächster Schritt sinnvoll ist'],
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
    nextStepBody: 'If a limited-scope validation engagement makes sense, you will receive a clear view on scope, risks and the right starting point.',
    replyTitle: 'Direct reply window',
    replyBody: 'I reply to the same business email address you submitted through the form.',
    reviewTitle: 'What I review now',
    reviewItems: ['Structure and usability of the data foundation you described', 'Risks, edge cases and required preparation work', 'Whether a scoped sample review or another next step makes sense'],
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
    nextStepBody: 'Dacă o validare cu scope limitat are sens, vei primi o imagine clară asupra anvergurii, riscurilor și punctului corect de pornire.',
    replyTitle: 'Răspuns direct pe e-mail',
    replyBody: 'Răspund pe aceeași adresă de business pe care ai trimis-o prin formular.',
    reviewTitle: 'Ce verific acum',
    reviewItems: ['Structura și utilizabilitatea bazei de date descrise', 'Riscuri, cazuri speciale și pregătirea necesară', 'Dacă un Scoped Sample Review sau alt pas următor are sens'],
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
