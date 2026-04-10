export const dataPrepCalUrl = 'https://cal.eu/mihai-adrian.mateescu';

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
  };
  problem: {
    title: string;
    intro: string;
    body: string[];
    missingElements: string[];
    consequences: string[];
  };
  services: {
    title: string;
    intro: string;
    rows: ServiceRow[];
    details: BulletItem[];
  };
  outputs: {
    title: string;
    intro: string;
    bullets: string[];
    suitableFor: string[];
  };
  process: {
    title: string;
    intro: string;
    steps: ProcessStep[];
    microcopy: string;
  };
  trust: {
    title: string;
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
  };
}

export interface SampleReviewContent {
  seo: PageSeo;
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
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
    fields: FormField[];
    consentLabel: string;
    submitLabel: string;
    honeypotName: string;
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
  };
}

export interface ThankYouPageContent {
  seo: PageSeo;
  title: string;
  body: string;
  nextStepTitle: string;
  nextStepBody: string;
  backLink: CtaLink;
}

export const dataPrepLandingContent: LandingPageContent = {
  seo: {
    title: 'Datenaufbereitung für KI im Finanzkontext | Mihai Adrian Mateescu',
    description:
      'Datenaufbereitung für KI im Finanzkontext: Ich transformiere unstrukturierte Dokumente, ERP-Exporte und Compliance-Daten in saubere, strukturierte und AI-ready Outputs für RAG, Document AI und Finanzprozesse.',
    ogImage: '/images/og-default.webp',
  },
  hero: {
    eyebrow: 'Finance-first Data Prep',
    title: 'Datenaufbereitung für KI im Finanzkontext',
    subtitle:
      'Ich transformiere unstrukturierte Dokumente, ERP-Exporte und Compliance-Daten in saubere, strukturierte und AI-ready Datensätze - für RAG, Document AI und automatisierte Finanzprozesse.',
    bullets: [
      {
        title: 'Finanznahes Prozessverständnis aus Buchhaltung und Rechnungswesen',
      },
      {
        title: 'Strukturierte Outputs für RAG, Automatisierung und Weiterverarbeitung',
      },
      {
        title: 'Datenschutzbewusste, nachvollziehbare und compliance-orientierte Vorgehensweise',
      },
    ],
    primaryCta: {
      label: 'Discovery Call',
      href: '/discovery-call',
      description: 'Termin zur Vorqualifizierung und Einordnung des Vorhabens',
    },
    secondaryCta: {
      label: 'Sample-Struktur prüfen',
      href: '/sample-struktur-pruefen',
      description: 'Mini-Pilot mit first-party Formular anfragen',
    },
    flowLabel: 'Input -> Struktur -> Output',
    flowStages: ['Input', 'Struktur', 'Output'],
  },
  problem: {
    title: 'Warum AI-Projekte an unstrukturierten Daten scheitern:',
    intro:
      'Viele AI-Initiativen starten mit der Modellfrage - und scheitern später an der Datenrealität.',
    body: [
      'PDFs, Scan-Dokumente, ERP-Exporte und uneinheitliche Tabellen sind für Menschen oft noch lesbar, für AI-Systeme jedoch selten direkt verwertbar.',
      'Es fehlen Struktur, konsistente Felder, belastbare Metadaten und eine saubere Grundlage für Retrieval, Validierung oder Automatisierung.',
    ],
    missingElements: [
      'bereinigter Text',
      'sinnvolle Segmentierung',
      'stabile Feldlogik',
      'nachvollziehbare Metadaten',
      'verwertbare Output-Formate',
    ],
    consequences: [
      'unpräzise Antworten',
      'instabile RAG-Setups',
      'hoher manueller Nachbearbeitungsaufwand',
      'wenig Vertrauen in das System',
    ],
  },
  services: {
    title: 'Drei typische Einsatzfelder:',
    intro:
      'Die Landing Page soll klar zeigen, welche Arten von Datenaufbereitung ich in einem finance-nahen Kontext abdecke.',
    rows: [
      {
        direction: 'RAG Corpus Ingestion',
        problem: 'PDF, DOCX, Policies, Handbücher, OCR-lastige Dokumente',
        process: 'Text-Extraktion, Cleanup, Segmentierung, Metadaten',
        output: 'JSONL, Chunk-Sets, Retrieval-ready Corpus',
      },
      {
        direction: 'ERP & FiBu Cleanup',
        problem: 'ERP-Export, Buchungsdaten, OPOS-Listen, Reporting-Dateien',
        process: 'Normalisierung, Mapping, Deduplizierung, Feldprüfung',
        output: 'CSV, Parquet, validiertes Analyse-Set',
      },
      {
        direction: 'Compliance Transformation',
        problem: 'XRechnung, XML, strukturierte Business-Dokumente',
        process: 'Feldmapping, Validierung, Formatprüfung, Transformationslogik',
        output: 'XML, Prüfdateien, strukturierte Weiterverarbeitung',
      },
    ],
    details: [
      {
        title: 'RAG Corpus Ingestion',
        description:
          'Für interne Wissensdatenbanken, Richtlinien, Verfahrensdokumentationen oder gemischte Dokumentbestände.',
      },
      {
        title: 'ERP & FiBu Cleanup',
        description:
          'Für exportierte Finanzdaten, die vor Analyse, Forecasting, Matching oder AI-Nutzung erst vereinheitlicht und geprüft werden müssen.',
      },
      {
        title: 'Compliance Transformation',
        description:
          'Für strukturierte Geschäftsdokumente, bei denen Feldlogik, Validierung und Standardkonformität entscheidend sind.',
      },
    ],
  },
  outputs: {
    title: 'Was Sie konkret erhalten:',
    intro: 'Kein abstraktes AI-Consulting, sondern nachvollziehbare, nutzbare Arbeitsergebnisse.',
    bullets: [
      'Bereinigte Rohdaten oder Dokumentinhalte',
      'Strukturierte Datensätze in JSONL, CSV oder Parquet',
      'Optional validierte XML-Outputs im Compliance-Kontext',
      'Chunking-Struktur für RAG- oder Search-Implementierungen',
      'Felddefinitionen und Mapping-Logik',
      'Metadaten-Konzept für Dokumente und Datensätze',
      'Validierungsregeln und Qualitätschecks',
      'Übergabedokumentation für interne Teams oder Implementierungspartner',
    ],
    suitableFor: [
      'RAG / Knowledge Bases',
      'Document AI',
      'interne Suchsysteme',
      'Datenmigration',
      'Workflow-Automatisierung',
      'Analyse- und Forecasting-Vorbereitung',
    ],
  },
  process: {
    title: 'So läuft ein Projekt ab:',
    intro:
      'Klein anfangen ist ausdrücklich möglich. Viele Projekte starten mit einem begrenzten Beispieldatensatz oder einem eng umrissenen Pilot.',
    steps: [
      {
        title: 'Intake & Zielbild',
        description:
          'Datenlage verstehen, Quellen und Zielsysteme erfassen, Risiken und Ausschlusskriterien identifizieren.',
      },
      {
        title: 'Analyse & Strukturdesign',
        description:
          'Muster, Inkonsistenzen und Sonderfälle prüfen, Zielstruktur, Felder und Validierungslogik definieren.',
      },
      {
        title: 'Aufbereitung & Validierung',
        description:
          'Bereinigung, Mapping, Deduplizierung und Segmentierung durchführen, Metadaten ergänzen, Qualitätschecks anwenden.',
      },
      {
        title: 'Übergabe & nächste Schritte',
        description:
          'Finales Output-Paket bereitstellen, Dokumentation und Empfehlungen übergeben, optional RAG- oder Automatisierungs-Setup vorbereiten.',
      },
    ],
    microcopy:
      'Klein anfangen ist ausdrücklich möglich. Viele Projekte starten mit einem begrenzten Beispieldatensatz oder einem eng umrissenen Pilot.',
  },
  trust: {
    title: 'Warum diese Arbeit bei mir gut aufgehoben ist:',
    bullets: [
      'Finanznaher Hintergrund mit Fokus auf Rechnungswesen und Prozessqualität',
      'Praxisverständnis für strukturierte und unstrukturierte Geschäftsdokumente',
      'Starker Fokus auf Nachvollziehbarkeit statt Black-Box-Versprechen',
      'Gute Passung für Finance-, Compliance- und dokumentenlastige Umgebungen',
      'Brücke zwischen kaufmännischer Präzision und technischer Umsetzbarkeit',
    ],
    proof: [
      'uneinheitliche ERP-Exporte',
      'heterogene PDF-/DOCX-Bestände',
      'fehlende Metadaten',
      'manuelle Vorarbeit vor AI-Projekten',
      'XRechnung-/XML-nahe Validierungsanforderungen',
    ],
  },
  faq: {
    title: 'Häufige Fragen:',
    items: [
      {
        question: 'Arbeiten Sie auch mit sensiblen Finanzdaten?',
        answer:
          'Ja. Der Fokus liegt auf datenschutzbewusster, nachvollziehbarer Verarbeitung. Für Pilotphasen bevorzuge ich anonymisierte oder reduzierte Beispieldaten.',
      },
      {
        question: 'Ist das nur für große AI-Projekte relevant?',
        answer:
          'Nein. Gerade kleine Pilotprojekte profitieren stark von sauberer Datenstruktur, bevor größere Investitionen erfolgen.',
      },
      {
        question: 'Welche Formate können verarbeitet werden?',
        answer:
          'Typisch sind PDF, DOCX, Tabellenexporte, CSV, ERP-Listen und strukturierte Dokumentformate wie XML.',
      },
      {
        question: 'Ersetzen Sie ein komplettes Data-Engineering-Team?',
        answer:
          'Nein. Die Leistung ist bewusst fokussiert: Daten- und Dokumentaufbereitung für AI-, RAG- und Automatisierungsanwendungen.',
      },
      {
        question: 'Arbeiten Sie nur im Finanzkontext?',
        answer:
          'Der stärkste Fit liegt im Finanz-, Rechnungswesen- und Compliance-Umfeld. Dokumentenlastige Prozesse außerhalb dieses Kontexts sind ebenfalls möglich.',
      },
      {
        question: 'Was passiert im Discovery Call?',
        answer:
          'Wir klären Datenquellen, Zielsystem, gewünschte Outputs, Risiken und den sinnvollsten Startpunkt für ein Pilotprojekt.',
      },
    ],
  },
  pricing: {
    title: 'Preise & Einstieg',
    intro:
      'Klare Pilotprojekte statt vager AI-Versprechen. Die meisten Projekte starten mit einem klar abgegrenzten Scope.',
    tiers: [
      {
        name: 'Mini-Pilot / Sample Review',
        price: 'ab 350 €',
        description:
          'Für Unternehmen, die vorab prüfen möchten, ob ihre Dokumente oder Datenbestände für AI, RAG oder Automatisierung geeignet sind.',
        scope: [
          '1 Beispieldatensatz oder kleines Dokumentenpaket',
          'Erste Analyse von Struktur, Qualität und Risiken',
          'Einschätzung zu Format, Feldlogik und Verwendbarkeit',
          'Kurze Empfehlung für den sinnvollsten nächsten Schritt',
        ],
        duration: '0,5 bis 2 Arbeitstage',
        note: 'Der Betrag wird bei Beauftragung eines Folgeprojekts vollständig angerechnet.',
      },
      {
        name: 'RAG Corpus Ingestion',
        price: 'ab 1.800 €',
        description:
          'Für PDF-, DOCX- oder gemischte Dokumentbestände, die für RAG, interne Wissensdatenbanken oder AI-gestützte Suche vorbereitet werden sollen.',
        scope: [
          'Text-Extraktion und Bereinigung',
          'Sinnvolle Dokumentsegmentierung',
          'Metadaten-Struktur',
          'AI-ready Output für Retrieval und Weiterverarbeitung',
        ],
        duration: '4 bis 8 Arbeitstage',
      },
      {
        name: 'ERP & FiBu Cleanup',
        price: 'ab 2.500 €',
        description:
          'Für ERP-Exporte, Buchhaltungsdaten, OPOS-Listen oder Reporting-Dateien, die vor Analyse, Forecasting oder AI-Nutzung strukturiert und geprüft werden müssen.',
        scope: [
          'Normalisierung und Feldzuordnung',
          'Deduplizierung und Plausibilitätsprüfung',
          'Saubere Zielstruktur für Analyse oder Weiterverarbeitung',
          'Dokumentierte Validierungslogik',
        ],
        duration: '5 bis 10 Arbeitstage',
      },
      {
        name: 'Compliance Transformation',
        price: 'ab 3.500 €',
        description:
          'Für strukturierte Geschäftsdokumente mit erhöhtem Anspruch an Nachvollziehbarkeit, Feldlogik und Standardkonformität, z. B. im XML-/XRechnungs-Kontext.',
        scope: [
          'Struktur- und Feldmapping',
          'Validierungslogik',
          'Transformationsregeln',
          'Technisch sauberer Output zur automatisierten Weiterverarbeitung',
        ],
        duration: '7 bis 15 Arbeitstage',
      },
    ],
    notes: [
      'Der genaue Preis hängt von Datenqualität, Formatvielfalt, Umfang, Validierungstiefe und Anzahl der Sonderfälle ab.',
      'Für klar definierte Pilotprojekte arbeite ich bevorzugt mit Fixpreisen.',
      'Für komplexe, uneinheitliche oder iterative Datenlagen erfolgt die Umsetzung nach Aufwand.',
      'Umsetzung / Delivery: 95-115 EUR / Stunde',
      'Discovery, Strukturdesign, Validierung, QA: 120-140 EUR / Stunde',
    ],
    premiumRationale: [
      'Datenaufbereitung im Finanz- und Rechnungswesen-Kontext',
      'Saubere Strukturen statt bloßer Skripte',
      'Nachvollziehbarkeit statt Black-Box-Lösungen',
      'Weniger Rückfragen, weniger Nacharbeit, weniger Fehlzuordnungen',
    ],
  },
  finalCta: {
    title: 'Der nächste sinnvolle Schritt:',
    body:
      'Wenn Sie bereits Dokumente oder Datenbestände haben, die später für AI, RAG oder Automatisierung genutzt werden sollen, beginnt die eigentliche Arbeit meist vor dem Modell.',
    primaryCta: {
      label: 'Discovery Call',
      href: '/discovery-call',
      description: 'Termin zur Vorqualifizierung und Einordnung des Vorhabens',
    },
    secondaryCta: {
      label: 'Sample-Struktur prüfen',
      href: '/sample-struktur-pruefen',
      description: 'Mini-Pilot mit first-party Formular anfragen',
    },
    microcopy:
      'Auf Wunsch zunächst mit anonymisiertem Beispieldatensatz oder klar abgegrenztem Mini-Pilot.',
  },
};

export const discoveryCallContent: DiscoveryCallContent = {
  seo: {
    title: 'Discovery Call für Datenaufbereitung für KI | Mihai Adrian Mateescu',
    description:
      'Buchen Sie einen Discovery Call für Datenaufbereitung für KI: Wir klären Datenquellen, Zielsystem, Output-Formate und den sinnvollsten Startpunkt für einen Pilot.',
    ogImage: '/images/og-default.webp',
  },
  hero: {
    eyebrow: 'Discovery Call',
    title: 'Vorqualifizieren, bevor wir bauen',
    subtitle:
      'Der Call ist für Entscheider gedacht, die klären möchten, ob ihre Dokumente oder Finanzdaten genug Struktur für einen AI-, RAG- oder Automatisierungs-Pilot haben.',
  },
  fit: {
    title: 'Für wen der Call sinnvoll ist',
    bullets: [
      'CFOs, Leiter Rechnungswesen und Finance Ops, die Datenqualität vor Modellentscheidung prüfen wollen',
      'ERP-/DMS-nahe Verantwortliche mit heterogenen Daten- oder Dokumentenbeständen',
      'Beratungen und interne Teams mit RAG-, Document-AI- oder Automatisierungsprojekten',
    ],
  },
  agenda: {
    title: 'Was wir im Call klären',
    bullets: [
      'Datenquellen, Formate und Zielsysteme',
      'Risiken, Sonderfälle und Ausschlusskriterien',
      'Welche Outputs realistisch sind',
      'Ob ein Mini-Pilot oder direkt ein größeres Projekt sinnvoll ist',
    ],
  },
  expectations: {
    title: 'Was der Call nicht ist',
    bullets: [
      'kein allgemeines AI-Strategiegespräch ohne konkreten Datenbezug',
      'kein Sales-Pitch mit Buzzwords',
      'keine technische Deep-Dive-Session ohne Vorabkontext',
    ],
  },
  cta: {
    title: 'Termin buchen',
    body:
      'Wenn der Fit klar ist, führen Sie den Call direkt über Cal.com fort. So bleibt der Prozess einfach und transparent.',
    button: {
      label: 'Discovery Call auf Cal.com',
      href: dataPrepCalUrl,
      external: true,
      description: 'Externer Terminlink zu Cal.com',
    },
    microcopy:
      'Wenn Sie noch unsicher sind, starten Sie stattdessen mit einem Sample Review.',
  },
};

export const sampleReviewContent: SampleReviewContent = {
  seo: {
    title: 'Sample-Struktur prüfen | Datenaufbereitung für KI',
    description:
      'Prüfen Sie Ihre Datenbasis mit einem first-party Sample Review: Ich bewerte Struktur, Qualität und die Eignung für AI-, RAG- oder Automatisierungs-Piloten.',
    ogImage: '/images/og-default.webp',
  },
  hero: {
    eyebrow: 'Mini-Pilot',
    title: 'Sample-Struktur prüfen',
    subtitle:
      'Mit einem kleinen, klar abgegrenzten Einstieg prüfen wir, ob Ihre Daten oder Dokumente für einen realistischen AI-Pilot geeignet sind.',
  },
  pitch: {
    title: 'Warum der Einstieg als Mini-Pilot sinnvoll ist',
    body: [
      'Viele AI- und Automatisierungsprojekte scheitern nicht am Modell, sondern an der Datenrealität.',
      'Ein kleiner, klar abgegrenzter Mini-Pilot schafft früh Klarheit über Nutzbarkeit, Risiken, Zielstruktur und passende Output-Formate.',
    ],
  },
  requirements: {
    title: 'Was Sie im Mini-Pilot erhalten',
    bullets: [
      'eine kurze fachliche und technische Einschätzung',
      'Hinweise zu Risiken, Datenqualität und Struktur',
      'einen realistischen Projektvorschlag',
      'eine belastbare Grundlage für Budget und Umfang',
      'auf Wunsch zunächst mit anonymisiertem Beispieldatensatz',
    ],
  },
  form: {
    title: 'Anfrageformular',
    intro:
      'Bitte senden Sie nur die Angaben, die für die fachliche Vorprüfung nötig sind. Kein Upload von sensiblen Daten in V1.',
    fields: [
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
        autocomplete: 'name',
      },
      {
        name: 'company',
        label: 'Unternehmen',
        type: 'text',
        required: true,
        autocomplete: 'organization',
      },
      {
        name: 'workEmail',
        label: 'Business E-Mail',
        type: 'email',
        required: true,
        autocomplete: 'email',
      },
      {
        name: 'dataType',
        label: 'Daten-/Dokumenttyp',
        type: 'select',
        required: true,
        options: [
          'PDF / Scan-Dokumente',
          'DOCX / Policies / Handbücher',
          'ERP-Export / FiBu-Daten',
          'XRechnung / XML / strukturierte Business-Dokumente',
          'Andere',
        ],
      },
      {
        name: 'targetUseCase',
        label: 'Ziel-Use-Case',
        type: 'select',
        required: true,
        options: [
          'RAG / Knowledge Base',
          'Document AI',
          'ERP & FiBu Cleanup',
          'Compliance Transformation',
          'Noch unklar',
        ],
      },
      {
        name: 'estimatedVolume',
        label: 'Umfang',
        type: 'select',
        required: true,
        options: [
          'Einzelnes Dokument / kleiner Beispieldatensatz',
          'Kleines Paket',
          'Mittlerer Bestand',
          'Größerer Bestand / noch unklar',
        ],
      },
      {
        name: 'notes',
        label: 'Zusätzliche Hinweise',
        type: 'textarea',
        required: false,
        placeholder: 'Was ist für die Vorprüfung wichtig?',
        helpText:
          'Bitte keine sensiblen Dokumente hochladen. Links zu gesicherten Quellen sind optional.',
      },
      {
        name: 'website',
        label: 'Website',
        type: 'hidden',
      },
      {
        name: 'submittedAt',
        label: 'submittedAt',
        type: 'hidden',
      },
    ],
    consentLabel:
      'Ich stimme zu, dass meine Angaben zur Bearbeitung der Anfrage verarbeitet werden.',
    submitLabel: 'Sample-Struktur prüfen',
    honeypotName: 'website',
    successRedirect: '/sample-struktur-pruefen/danke',
  },
  submission: {
    title: 'Nach dem Submit',
    body: [
      'Ich prüfe die Angaben fachlich und melde mich mit einer klaren Einschätzung.',
      'Wenn der Scope passt, erhalten Sie einen Vorschlag für den nächsten sinnvollen Schritt.',
    ],
    guarantee: 'Der Einstieg kann bewusst klein gehalten werden.',
  },
  cta: {
    title: 'Bereit für den ersten Check?',
    body:
      'Wenn Sie bereits konkrete Dateien oder Datenmuster haben, startet hier die fachliche Vorprüfung mit first-party Formular.',
  },
};

export const thankYouPageContent: Record<'discovery' | 'sampleReview', ThankYouPageContent> = {
  discovery: {
    seo: {
      title: 'Danke für Ihre Anfrage | Datenaufbereitung für KI',
      description:
        'Danke für Ihre Anfrage. Die nächsten Schritte für den Discovery Call werden nun vorbereitet.',
      ogImage: '/images/og-default.webp',
    },
    title: 'Danke',
    body: 'Ihre Anfrage ist eingegangen. Ich prüfe den Kontext und melde mich mit dem nächsten sinnvollen Schritt.',
    nextStepTitle: 'Wie es weitergeht',
    nextStepBody:
      'Wenn der Fit passt, erhalten Sie den Cal.com-Link oder einen direkt passenden Vorschlag für das weitere Vorgehen.',
    backLink: {
      label: 'Zurück zur Landing Page',
      href: '/services/datenaufbereitung-fuer-ki',
    },
  },
  sampleReview: {
    seo: {
      title: 'Danke für den Sample Review | Datenaufbereitung für KI',
      description:
        'Danke für Ihren Sample Review. Ich prüfe die Angaben und melde mich mit einer ersten Einschätzung.',
      ogImage: '/images/og-default.webp',
    },
    title: 'Danke für Ihre Anfrage',
    body: 'Ihre Angaben sind eingegangen. Ich prüfe die Datenbasis und melde mich mit einer ersten Einschätzung.',
    nextStepTitle: 'Nächster Schritt',
    nextStepBody:
      'Wenn der Mini-Pilot sinnvoll ist, erhalten Sie eine klare Einordnung zu Scope, Risiken und sinnvoller Ausgangslage.',
    backLink: {
      label: 'Zur Landing Page',
      href: '/services/datenaufbereitung-fuer-ki',
    },
  },
};
