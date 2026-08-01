/**
 * UI Translations
 *
 * All user interface strings for the portfolio site
 * Supports DE (German), EN (English), RO (Romanian)
 */

import type { Language } from '@utils/i18n';

export interface Translations {
  // Navigation
  nav: {
    home: string;
    about: string;
    experience: string;
    education: string;
    certifications: string;
    services: string;
    blog: string;
    contact: string;
  };
  // Homepage
  home: {
    title: string;
    subtitle: string;
    description: string;
    availabilityBadge: string;
    skillsLabel: string; // Hero skills section label
    heroSkills: string[]; // Short skills for Hero section
    cta: {
      viewProjects: string;
      readBlog: string;
      contact: string;
    };
    quickLinks: {
      education: string;
      experience: string;
      certifications: string;
      hobbiesText: string;
    };
    skills: {
      title: string;
      items: string[];
    };
    leadership: {
      title: string;
      items: string[];
    };
    hobbies: {
      title: string;
      learnMore: string;
    };
    dataPrepTeaser: {
      label: string;
      title: string;
      body: string;
      primaryLabel: string;
      secondaryLabel: string;
    };
  };
  // About Page
  about: {
    title: string;
    subtitle: string;
    intro: string;
    description: string;
    currentFocus: string;
    workingMethod: string;
    skills: string;
    skillsSubtitle: string;
    professionalIdentityText: string;
    visitButton: string; // "Visit" button text for external links
    hobbies: {
      photography: {
        title: string;
        description: string;
      };
      technology: {
        title: string;
        description: string;
        highlights: string[];
      };
      ecommerce: {
        title: string;
        description: string;
      };
    };
    skillCategories: {
      finance: {
        category: string;
        status: string;
        skills: string[];
        note: string;
      };
      ecommerce: {
        category: string;
        status: string;
        skills: string[];
      };
      aiml: {
        category: string;
        status: string;
        skills: string[];
        note: string;
      };
      development: {
        category: string;
        status: string;
        skills: string[];
        note: string;
      };
      languages: {
        category: string;
        skills: string[];
      };
      softSkills: {
        category: string;
        skills: string[];
      };
    };
    proficiencyLegend: {
      title: string;
      expert: string;
      advanced: string;
      intermediate: string;
    };
  };
  // Experience Page
  experience: {
    title: string;
    subtitle: string;
    positions: string;
    present: string;
    skillsTitle: string;
    practicalSkills: string[];
  };
  // Education Page
  education: {
    title: string;
    subtitle: string;
    description: string;
    ongoing: string;
    completed: string;
    incomplete: string;
  };
  // Certifications Page
  certifications: {
    title: string;
    subtitle: string;
    description: string;
    download: string;
    verify: string;
    issuer: string;
    obtained: string;
    from: string;
    credentialType: string;
    partnership: string;
    aboutTitle: string;
    aboutText: string;
    categories: {
      professional: string;
      language: string;
      reference: string;
      other: string;
      aiProfessionalDevelopment: string;
    };
    count: string;
  };
  // Common UI
  common: {
    backToHome: string;
    readMore: string;
    learnMore: string;
    downloadPdf: string;
    viewAll: string;
    loading: string;
    error: string;
    notFound: string;
  };
  // Footer
  footer: {
    description: string;
    copyright: string;
    madeWith: string;
    deployedOn: string;
    quickLinks: string;
    language: string;
    legal: string;
  };
  // Contact Info
  contact: {
    address: string;
    phone: string;
    email: string;
    linkedin: string;
    heading: string;
  };
}

export const translations: Record<Language, Translations> = {
  de: {
    nav: {
      home: 'Start',
      about: 'Über mich',
      experience: 'Berufserfahrung',
      education: 'Ausbildung',
      certifications: 'Zertifizierungen',
      services: 'Dienstleistungen',
      blog: 'Blog',
      contact: 'Kontakt'
    },
    home: {
      title: 'Mihai Adrian Mateescu',
      subtitle: 'Finanzbuchhalter · FinTech & Angewandte KI',
      description: 'Finanzbuchhalter mit Erfahrung in Buchhaltung, Umsatzsteuer und vorbereitenden Abschlussarbeiten. Daneben entwickle ich den offenen Fin-Tools Hub — praktische Finance-Tools für Gründer und Teams — und setze angewandte KI ein, um Finanzdaten aufzubereiten und Prozesse zu automatisieren. Architektur und Anforderungen definiere ich selbst; KI-Systeme unterstützen bei Umsetzung und Recherche, die Verantwortung liegt bei mir.',
      availabilityBadge: 'Für Beratungsprojekte verfügbar',
      skillsLabel: 'Kompetenzen:',
      heroSkills: ['DATEV', 'Finanzbuchhaltung', 'FinTech-Tools', 'Angewandte KI', 'Webentwicklung'],
      cta: {
        viewProjects: 'Berufserfahrung',
        readBlog: 'Blog lesen',
        contact: 'Kontakt aufnehmen'
      },
      quickLinks: {
        education: 'Endriss-Vorbereitungskurs abgeschlossen; eigenständige Vorbereitung auf die Prüfung zum Geprüften Bilanzbuchhalter (IHK) im September 2026',
        experience: '21 Jahre Berufserfahrung in Buchhaltung, Vertrieb und Management',
        certifications: 'IHK-Zertifikate, Arbeitszeugnisse und Sprachzertifikate',
        hobbiesText: 'Fotografie, Technologie und mein E-Commerce-Projekt Profit Minds'
      },
      skills: {
        title: 'Fähigkeiten und Kenntnisse',
        items: [
          'Finanzbuchhaltung (Debitoren, Kreditoren, Sachkonten)',
          'UStVA, BWA & vorbereitende Abschlussarbeiten',
          'Systeme: DATEV, Simba, SelectLine, ELO',
          'Digitalisierung & Prozessoptimierung',
          'IT: Excel (Advanced), XML (EN 16931), XRechnung',
          'Entwicklung webbasierter Finanztools (AI-gestützt)'
        ]
      },
      leadership: {
        title: 'Führungs-Kompetenzen',
        items: [
          'Gebietsverkaufsleiter: Führung & Koordination von Vertriebsteams',
          'Filialleiter: Kaufmännische Leitung inkl. Rechnungswesen & Lohnabrechnung',
          'Führung & Entwicklung von bis zu 9 Mitarbeiter/innen',
          'Strategische Steuerung operativer Geschäftsprozesse'
        ]
      },
      hobbies: {
        title: 'Hobbies',
        learnMore: 'Mehr über meine Hobbies'
      },
      dataPrepTeaser: {
        label: 'Strategisches Angebot',
        title: 'Neu: KI-Datenaufbereitung für Finance-Workflows',
        body: 'Eine eigenständige Landing Page für Teams, die PDFs, ERP-Exporte, XML und Compliance-Daten in saubere, strukturierte und KI-verwertbare Ergebnisse überführen müssen.',
        primaryLabel: 'Zur Landing Page',
        secondaryLabel: 'Discovery Call',
      },
    },
    about: {
      title: 'Über mich',
      subtitle: 'Finanzbuchhalter · FinTech & Angewandte KI',
      intro: 'Willkommen auf meiner Portfolio-Seite',
      description: 'Finanzbuchhalter und Entwickler des Fin-Tools Hub sowie angewandter KI-Systeme — mit Interesse für Fotografie und E-Commerce',
      currentFocus: 'Aktuell: Endriss-Vorbereitungskurs im Januar 2026 abgeschlossen; eigenständige Vorbereitung auf die Prüfung zum Geprüften Bilanzbuchhalter (IHK) im September 2026. Die Qualifikation als Geprüfter Bilanzbuchhalter (IHK) habe ich noch nicht erworben.',
      workingMethod: 'Arbeitsweise: Ich entwerfe Produktarchitektur und Domänenmodell selbst — die Implementierung erfolgt mit professionellen KI-Coding-Assistenten unter meiner Leitung und Verantwortung, mit vollständiger Validierung und ohne Abstriche bei Codequalität. Menschlich geführt, KI-beschleunigt.',
      skills: 'Kompetenzen',
      skillsSubtitle: 'Ehrliche Selbsteinschätzung meiner beruflichen und technischen Fähigkeiten',
      professionalIdentityText: 'Finanzbuchhalter mit Erfahrung in Buchhaltung, Umsatzsteuer und vorbereitenden Abschlussarbeiten. Auf dieser Grundlage entwickle ich praktische FinTech-Tools (den offenen Fin-Tools Hub) und wende KI-Systeme an, um Finanzdaten aufzubereiten und Workflows zu automatisieren — mit klar definierter Architektur, vollständiger Validierung und Verantwortung bei mir.',
      visitButton: 'Besuche',
      hobbies: {
        photography: {
          title: 'Fotografie',
          description: 'Ich fotografiere leidenschaftlich gerne Landschaften, Porträts und städtische Szenen. Mit Adobe Photoshop bearbeite ich meine Aufnahmen, um einzigartige visuelle Darstellungen zu schaffen.'
        },
        technology: {
          title: 'Technologie-Enthusiast',
          description: 'Als leidenschaftlicher Autodidakt erforsche ich neue Technologien durch persönliche Projekte und Online-Kurse. Ich lerne aktiv Programmiersprachen und experimentiere mit digitalen Tools, um meine Fähigkeiten kontinuierlich zu erweitern.',
          highlights: [
            'Self-Learning: Rust, Julia, Python durch Online-Kurse und Hobby-Projekte',
            'Testen neuer digitaler Tools für persönliche Finanzverwaltung',
            'Exploration von KI-Konzepten als Independent Researcher (Anfängerniveau)'
          ]
        },
        ecommerce: {
          title: 'E-Commerce: Profit Minds',
          description: 'Profit Minds ist meine eigene Marke für nachhaltige, personalisierte Kleidung und Accessoires. Dieses Projekt vereint meine Interessen an Design, E-Commerce und Marketing und ermöglicht mir, meine kreativen Ideen umzusetzen.'
        }
      },
      skillCategories: {
        finance: {
          category: 'Finanz- und Lohnbuchhaltung (DE)',
          status: 'Advanced — 2+ Jahre Berufserfahrung',
          skills: [
            'Finanzbuchhaltung: Debitoren, Kreditoren, Sachkonten',
            'Lohnbuchhaltung & Gehaltsabrechnung',
            'Umsatzsteuervoranmeldungen (monatlich/vierteljährlich)',
            'Monats- und Jahresabschlüsse (BWA, GuV, Bilanz)',
            'DATEV, Agenda, Simba (Steuerkanzlei-Software)',
            'SelectLine, Modality, ELO DMS (aktuell)'
          ],
          note: 'Finanzbuchhalter seit 08/2023 (modal3, Kesen, Herrmann, Quadriga) • Endriss-Kurs abgeschlossen; eigenständige Prüfungsvorbereitung für September 2026; Qualifikation als Geprüfter Bilanzbuchhalter (IHK) noch nicht erworben'
        },
        ecommerce: {
          category: 'E-Commerce Ops & Compliance (EU/DE)',
          status: 'Advanced practitioner',
          skills: [
            'Shopify & Amazon Seller (EU)',
            'LUCID/VerpackG, DSGVO & Google Consent Mode v2',
            'WEEE/ElektroG, GTIN & GTIN-exemption',
            'Printful/Spreadshirt/SPOD Logistik',
            'Google Merchant, Ads, Analytics'
          ]
        },
        aiml: {
          category: 'AI/ML Systems — Learning & Research',
          status: 'Learning / Research (non-expert)',
          skills: [
            'LLM/RAG Prototypen (Ollama, llama.cpp, Qdrant)',
            'PyTorch / TensorFlow & scikit-learn',
            'MLflow & Experiment Tracking',
            'CPU-first Performance Tuning (BLAS/AOCL)',
            'Semantisch gesteuerter Tokenizer (Projekt)',
            'LLM from Scratch: Gemma 3 270M Rekonstruktion (Rust/Julia)'
          ],
          note: 'Pair-programming: GPT-5 Thinking, Claude Code, Gemini Code Assist'
        },
        development: {
          category: 'Software & Web Development — Learning',
          status: 'Learning (AI-assisted co-creation)',
          skills: [
            'React / Next.js 15, Tailwind, i18n',
            'Flask / FastAPI; Rust (Axum) Basics',
            'Apache Arrow/Parquet, Polars',
            'Docker, GitHub Actions, Linux Basics'
          ],
          note: 'Code generiert/debugged zusammen mit AI; Design + Architektur + Research von mir'
        },
        languages: {
          category: 'Sprachen',
          skills: [
            'Rumänisch (Muttersprache)',
            'Deutsch (telc B2 Zertifikat)',
            'Englisch (Sehr gut)'
          ]
        },
        softSkills: {
          category: 'Soft Skills & Leadership',
          skills: [
            'Kommunikation & Kundenbetreuung',
            'Teamführung (bis zu 9 Mitarbeiter)',
            'Detailgenauigkeit & Qualitätskontrolle',
            'Zeitmanagement & Priorisierung',
            'Kaufmännische Leitung & BWL-Steuerung'
          ]
        }
      },
      proficiencyLegend: {
        title: 'Legende — Proficiency Levels',
        expert: 'Produktive Nutzung, wiederholter Nachweis in mehreren Projekten',
        advanced: 'Konstante Praxis, Autonomie bei typischen Aufgaben',
        intermediate: '50–200h geführte Praxis, Grundkenntnisse gefestigt'
      }
    },
    experience: {
      title: 'Berufserfahrung',
      subtitle: 'Mein beruflicher Werdegang',
      positions: 'Positionen',
      present: 'zurzeit',
      skillsTitle: 'Praxiserfahrung mit',
      practicalSkills: [
        'DATEV',
        'Umsatzsteuer',
        'Jahresabschlüsse',
        'Finanzbuchhaltung',
        'Lohnbuchhaltung',
        'MS Office'
      ]
    },
    education: {
      title: 'Ausbildung',
      subtitle: 'Akademischer und beruflicher Werdegang',
      description: 'Endriss-Vorbereitungskurs abgeschlossen; eigenständige Vorbereitung auf die Prüfung zum Geprüften Bilanzbuchhalter (IHK) im September 2026; Qualifikation als Geprüfter Bilanzbuchhalter (IHK) noch nicht erworben',
      ongoing: 'laufend',
      completed: 'abgeschlossen',
      incomplete: 'ohne Abschlusszeugnis'
    },
    certifications: {
      title: 'Zertifizierungen',
      subtitle: 'Berufliche Qualifikationen und Nachweise',
      description: 'IHK-Zertifikate, Arbeitszeugnisse und Sprachzertifikate',
      download: 'Zertifikat herunterladen',
      verify: 'Verifizieren',
      issuer: 'Aussteller',
      obtained: 'Erhalten',
      from: 'Von',
      credentialType: 'Art',
      partnership: 'Partnerschaft',
      aboutTitle: 'Über meine Zertifizierungen',
      aboutText: 'Die IHK-Zertifizierung als Fachkraft für Buchführung bestätigt meine fachlichen Kenntnisse und Kompetenzen im Bereich der Buchhaltung. Prüfungsvorbereitung Geprüfter Bilanzbuchhalter (IHK): Der Endriss-Vorbereitungskurs wurde im Januar 2026 abgeschlossen; derzeit bereite ich mich eigenständig auf die Prüfung im September 2026 vor. Die Qualifikation als Geprüfter Bilanzbuchhalter (IHK) habe ich noch nicht erworben.',
      categories: {
        professional: 'Berufliche Zertifikate',
        language: 'Sprachzertifikate',
        reference: 'Arbeitszeugnisse',
        other: 'Weitere Dokumente',
        aiProfessionalDevelopment: 'KI & Weiterbildung'
      },
      count: 'Zertifikate'
    },
    common: {
      backToHome: 'Zurück zur Startseite',
      readMore: 'Mehr lesen',
      learnMore: 'Mehr erfahren',
      downloadPdf: 'PDF herunterladen',
      viewAll: 'Alle anzeigen',
      loading: 'Lädt...',
      error: 'Fehler',
      notFound: 'Nicht gefunden'
    },
    footer: {
      description: 'Finanzbuchhalter, Entwickler des offenen Fin-Tools Hub und angewandter KI-Systeme. Endriss-Kurs abgeschlossen; eigenständige Prüfungsvorbereitung für September 2026; Qualifikation als Geprüfter Bilanzbuchhalter (IHK) noch nicht erworben.',
      copyright: 'Alle Rechte vorbehalten.',
      madeWith: 'Erstellt mit',
      deployedOn: 'bereitgestellt auf',
      quickLinks: 'Schnellzugriff',
      language: 'Sprache',
      legal: 'Rechtliches',
    },
    contact: {
      address: 'Adresse',
      phone: 'Telefon',
      email: 'E-Mail',
      linkedin: 'LinkedIn',
      heading: 'Kontakt',
    }
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      experience: 'Experience',
      education: 'Education',
      certifications: 'Certifications',
      services: 'Services',
      blog: 'Blog',
      contact: 'Contact'
    },
    home: {
      title: 'Mihai Adrian Mateescu',
      subtitle: 'Financial Accountant · FinTech & Applied AI',
      description: 'Financial Accountant with hands-on experience in bookkeeping, VAT filings and preparatory year-end work. I also build the open Fin-Tools Hub — practical finance tools for founders and teams — and apply AI to structure financial data and automate workflows. I define the architecture and requirements myself; AI systems support implementation and research, and the responsibility stays with me.',
      availabilityBadge: 'Available for consulting',
      skillsLabel: 'Skills:',
      heroSkills: ['DATEV', 'Financial Accounting', 'FinTech Tools', 'Applied AI', 'Web Development'],
      cta: {
        viewProjects: 'Experience',
        readBlog: 'Read Blog',
        contact: 'Get in Touch'
      },
      quickLinks: {
        education: 'Endriss preparation course completed; independently preparing for the Geprüfter Bilanzbuchhalter (IHK) examination in September 2026',
        experience: '21 years of professional experience in accounting, sales and management',
        certifications: 'IHK certificates, employment references and language certificates',
        hobbiesText: 'Photography, technology and my e-commerce project Profit Minds'
      },
      skills: {
        title: 'Skills and Expertise',
        items: [
          'Financial Accounting (AR, AP, GL)',
          'VAT Returns, P&L & Preparatory Closing Tasks',
          'Systems: DATEV, Simba, SelectLine, ELO',
          'Digitalization & Process Optimization',
          'IT: Excel (Advanced), XML (EN 16931), XRechnung',
          'Development of Web-based AI Finance Tools'
        ]
      },
      leadership: {
        title: 'Leadership Competencies',
        items: [
          'Regional Sales Manager: Leadership & coordination of sales teams',
          'Branch Manager: Commercial management including accounting & payroll',
          'Leadership & development of teams up to 9 employees',
          'Strategic steering of operational business processes'
        ]
      },
      hobbies: {
        title: 'Hobbies',
        learnMore: 'Learn more about my hobbies'
      },
      dataPrepTeaser: {
        label: 'Strategic Offer',
        title: 'New: AI Data Preparation for Finance Workflows',
        body: 'A dedicated landing page for teams needing to transform PDFs, ERP exports, XML, and compliance data into clean, structured, and AI-ready results.',
        primaryLabel: 'Open Landing Page',
        secondaryLabel: 'Discovery Call',
      },
    },
    about: {
      title: 'About Me',
      subtitle: 'Financial Accountant · FinTech & Applied AI',
      intro: 'Welcome to my portfolio',
      description: 'Financial Accountant, builder of the Fin-Tools Hub and applied AI systems — with interests in photography and e-commerce',
      currentFocus: 'Current focus: Endriss preparation course completed in January 2026; independently preparing for the Geprüfter Bilanzbuchhalter (IHK) examination in September 2026. Qualification not yet obtained.',
      workingMethod: 'Working method: I design the product architecture and domain model myself — implementation happens with professional AI coding assistants under my direction and responsibility, with full validation and no compromise on code quality. Human-led, AI-accelerated.',
      skills: 'Competencies',
      skillsSubtitle: 'Honest self-assessment of my professional and technical skills',
      professionalIdentityText: 'Financial Accountant with experience in bookkeeping, VAT filings and preparatory year-end work. On that foundation, I build practical FinTech tools (the open Fin-Tools Hub) and apply AI systems to structure financial data and automate workflows — with clearly defined architecture, full validation, and the responsibility resting with me.',
      visitButton: 'Visit',
      hobbies: {
        photography: {
          title: 'Photography',
          description: 'I passionately photograph landscapes, portraits and urban scenes. Using Adobe Photoshop, I edit my shots to create unique visual representations.'
        },
        technology: {
          title: 'Technology Enthusiast',
          description: 'As a passionate autodidact, I explore new technologies through personal projects and online courses. I actively learn programming languages and experiment with digital tools to continuously expand my skills.',
          highlights: [
            'Self-Learning: Rust, Julia, Python through online courses and hobby projects',
            'Testing new digital tools for personal finance management',
            'Exploring AI concepts as Independent Researcher (beginner level)'
          ]
        },
        ecommerce: {
          title: 'E-Commerce: Profit Minds',
          description: 'Profit Minds is my own brand for sustainable, personalized clothing and accessories. This project combines my interests in design, e-commerce and marketing, allowing me to implement my creative ideas.'
        }
      },
      skillCategories: {
        finance: {
          category: 'Financial & Payroll Accounting (DE)',
          status: 'Advanced — 2+ years professional experience',
          skills: [
            'Financial Accounting: Accounts Receivable, Payable, General Ledger',
            'Payroll Accounting & Salary Processing',
            'Sales Tax Advance Returns (monthly/quarterly)',
            'Monthly and Annual Financial Statements (BWA, P&L, Balance Sheet)',
            'DATEV, Agenda, Simba (tax office software)',
            'SelectLine, Modality, ELO DMS (current)'
          ],
          note: 'Financial Accountant since 08/2023 (modal3, Kesen, Herrmann, Quadriga) • Endriss course completed; independent examination preparation for September 2026; qualification not yet obtained'
        },
        ecommerce: {
          category: 'E-Commerce Ops & Compliance (EU/DE)',
          status: 'Advanced practitioner',
          skills: [
            'Shopify & Amazon Seller (EU)',
            'LUCID/VerpackG, GDPR & Google Consent Mode v2',
            'WEEE/ElektroG, GTIN & GTIN-exemption',
            'Printful/Spreadshirt/SPOD Logistics',
            'Google Merchant, Ads, Analytics'
          ]
        },
        aiml: {
          category: 'AI/ML Systems — Learning & Research',
          status: 'Learning / Research (non-expert)',
          skills: [
            'LLM/RAG Prototypes (Ollama, llama.cpp, Qdrant)',
            'PyTorch / TensorFlow & scikit-learn',
            'MLflow & Experiment Tracking',
            'CPU-first Performance Tuning (BLAS/AOCL)',
            'Semantically Driven Tokenizer (Project)',
            'LLM from Scratch: Gemma 3 270M Reconstruction (Rust/Julia)'
          ],
          note: 'Pair-programming: GPT-5 Thinking, Claude Code, Gemini Code Assist'
        },
        development: {
          category: 'Software & Web Development — Learning',
          status: 'Learning (AI-assisted co-creation)',
          skills: [
            'React / Next.js 15, Tailwind, i18n',
            'Flask / FastAPI; Rust (Axum) Basics',
            'Apache Arrow/Parquet, Polars',
            'Docker, GitHub Actions, Linux Basics'
          ],
          note: 'Code generated/debugged with AI; Design + Architecture + Research by me'
        },
        languages: {
          category: 'Languages',
          skills: [
            'Romanian (Native)',
            'German (telc B2 Certificate)',
            'English (Very good)'
          ]
        },
        softSkills: {
          category: 'Soft Skills & Leadership',
          skills: [
            'Communication & Customer Service',
            'Team Leadership (up to 9 employees)',
            'Attention to Detail & Quality Control',
            'Time Management & Prioritization',
            'Commercial Management & Business Administration'
          ]
        }
      },
      proficiencyLegend: {
        title: 'Legend — Proficiency Levels',
        expert: 'Productive use, repeated proof in multiple projects',
        advanced: 'Constant practice, autonomy in typical tasks',
        intermediate: '50–200h guided practice, basic knowledge consolidated'
      }
    },
    experience: {
      title: 'Professional Experience',
      subtitle: 'My Career Journey',
      positions: 'Positions',
      present: 'present',
      skillsTitle: 'Practical Experience with',
      practicalSkills: [
        'DATEV',
        'Sales Tax',
        'Annual Financial Statements',
        'Financial Accounting',
        'Payroll Accounting',
        'MS Office'
      ]
    },
    education: {
      title: 'Education',
      subtitle: 'Academic and Professional Background',
      description: 'Endriss preparation course completed; independent preparation for the Geprüfter Bilanzbuchhalter (IHK) examination in September 2026; qualification not yet obtained',
      ongoing: 'ongoing',
      completed: 'completed',
      incomplete: 'without graduation certificate'
    },
    certifications: {
      title: 'Certifications',
      subtitle: 'Professional Qualifications and Credentials',
      description: 'IHK certificates, employment references and language certificates',
      download: 'Download Certificate',
      verify: 'Verify',
      issuer: 'Issuer',
      obtained: 'Obtained',
      from: 'From',
      credentialType: 'Type',
      partnership: 'Partnership',
      aboutTitle: 'About My Certifications',
      aboutText: 'The IHK certification as Specialist for Bookkeeping confirms my professional knowledge and competencies in accounting. Examination preparation for Geprüfter Bilanzbuchhalter (IHK): I completed the Endriss preparation course in January 2026 and am currently preparing independently for the examination scheduled for September 2026. The qualification has not yet been obtained.',
      categories: {
        professional: 'Professional Certificates',
        language: 'Language Certificates',
        reference: 'Employment References',
        other: 'Other Documents',
        aiProfessionalDevelopment: 'AI & Professional Development'
      },
      count: 'Certificates'
    },
    common: {
      backToHome: 'Back to Home',
      readMore: 'Read More',
      learnMore: 'Learn More',
      downloadPdf: 'Download PDF',
      viewAll: 'View All',
      loading: 'Loading...',
      error: 'Error',
      notFound: 'Not Found'
    },
    footer: {
      description: 'Financial Accountant, builder of the open Fin-Tools Hub and applied AI systems. Endriss course completed; independent examination preparation for September 2026; qualification not yet obtained.',
      copyright: 'All rights reserved.',
      madeWith: 'Made with',
      deployedOn: 'deployed on',
      quickLinks: 'Quick Links',
      language: 'Language',
      legal: 'Legal',
    },
    contact: {
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      linkedin: 'LinkedIn',
      heading: 'Contact',
    }
  },
  ro: {
    nav: {
      home: 'Acasă',
      about: 'Despre mine',
      experience: 'Experiențe',
      education: 'Educație',
      certifications: 'Certificări',
      services: 'Servicii',
      blog: 'Blog',
      contact: 'Contact'
    },
    home: {
      title: 'Mihai Adrian Mateescu',
      subtitle: 'Contabil Financiar · FinTech & AI Aplicat',
      description: 'Contabil Financiar cu experiență practică în contabilitate, declarații TVA și lucrări pregătitoare de închidere. Dezvolt totodată Fin-Tools Hub — instrumente financiare practice pentru fondatori și echipe — și aplic AI pentru structurarea datelor financiare și automatizarea proceselor. Definesc singur arhitectura și cerințele; sistemele AI sprijină implementarea și cercetarea, responsabilitatea rămâne a mea.',
      availabilityBadge: 'Disponibil pentru proiecte de consultanță',
      skillsLabel: 'Competențe:',
      heroSkills: ['DATEV', 'Contabilitate Financiară', 'Instrumente FinTech', 'AI Aplicat', 'Dezvoltare Web'],
      cta: {
        viewProjects: 'Experiență',
        readBlog: 'Citește Blog',
        contact: 'Contactează-mă'
      },
      quickLinks: {
        education: 'Cursul Endriss finalizat; pregătire individuală pentru examenul Geprüfter Bilanzbuchhalter (IHK) din septembrie 2026',
        experience: '21 de ani de experiență profesională în contabilitate, vânzări și management',
        certifications: 'Certificate IHK, referințe de la angajatori și certificate de limbă',
        hobbiesText: 'Fotografie, tehnologie și proiectul meu de e-commerce Profit Minds'
      },
      skills: {
        title: 'Competențe și Cunoștințe',
        items: [
          'Contabilitate Financiară (Clienți, Furnizori, Registru Jurnal)',
          'Deconturi TVA, BWA și Lucrări de Închidere',
          'Sisteme: DATEV, Simba, SelectLine, ELO',
          'Digitalizare și Optimizare de Procese',
          'IT: Excel (Avansat), XML (EN 16931), XRechnung',
          'Dezvoltare de Instrumente Financiare bazate pe AI'
        ]
      },
      leadership: {
        title: 'Competențe de Leadership',
        items: [
          'Manager Regional de Vânzări: Conducerea și coordonarea echipelor de vânzări',
          'Manager de Filială: Management comercial, incluzând contabilitatea și salarizarea',
          'Conducerea și dezvoltarea unei echipe de până la 9 angajați',
          'Pilotarea strategică a proceselor operaționale de afaceri'
        ]
      },
      hobbies: {
        title: 'Hobby-uri',
        learnMore: 'Află mai multe despre hobby-urile mele'
      },
      dataPrepTeaser: {
        label: 'Ofertă strategică',
        title: 'Nou: Pregătire Date AI pentru procese financiare',
        body: 'O landing page dedicată echipelor care trebuie să transforme PDF-uri, exporturi ERP, XML și date de conformitate în rezultate curate, structurate și pregătite pentru AI.',
        primaryLabel: 'Deschide landing page-ul',
        secondaryLabel: 'Discovery Call',
      },
    },
    about: {
      title: 'Despre Mine',
      subtitle: 'Contabil Financiar · FinTech & AI Aplicat',
      intro: 'Bun venit pe pagina mea de portofoliu',
      description: 'Contabil Financiar, dezvoltator al Fin-Tools Hub și al sistemelor AI aplicate — cu interese în fotografie și e-commerce',
      currentFocus: 'În prezent: cursul Endriss s-a încheiat în ianuarie 2026; mă pregătesc individual pentru examenul Geprüfter Bilanzbuchhalter (IHK) din septembrie 2026. Calificarea nu a fost încă obținută.',
      workingMethod: 'Mod de lucru: proiectez singur arhitectura produsului și modelul de domeniu — implementarea se realizează cu asistenți AI profesioniști de programare sub conducerea și responsabilitatea mea, cu validare completă și fără compromisuri la calitatea codului. Condus de om, accelerat de AI.',
      skills: 'Competențe',
      skillsSubtitle: 'Autoevaluare onestă a abilităților mele profesionale și tehnice',
      professionalIdentityText: 'Contabil Financiar cu experiență în contabilitate, declarații TVA și lucrări pregătitoare de închidere. Pe această bază dezvolt instrumente FinTech practice (Fin-Tools Hub, deschis) și aplic sisteme AI pentru structurarea datelor financiare și automatizarea proceselor — cu arhitectură clar definită, validare completă și responsabilitatea la mine.',
      visitButton: 'Descoperă',
      hobbies: {
        photography: {
          title: 'Fotografie',
          description: 'Fotografiez cu pasiune peisaje, portrete și scene urbane. Folosind Adobe Photoshop, editez fotografiile mele pentru a crea reprezentări vizuale unice.'
        },
        technology: {
          title: 'Entuziast Tehnologie',
          description: 'Ca autodidact pasionat, explorez tehnologii noi prin proiecte personale și cursuri online. Învăț activ limbaje de programare și experimentez cu instrumente digitale pentru a-mi extinde continuu abilitățile.',
          highlights: [
            'Self-Learning: Rust, Julia, Python prin cursuri online și proiecte hobby',
            'Testarea de noi instrumente digitale pentru gestiunea finanțelor personale',
            'Explorarea conceptelor de AI ca Cercetător Independent (nivel începător)'
          ]
        },
        ecommerce: {
          title: 'E-Commerce: Profit Minds',
          description: 'Profit Minds este propria mea marcă de îmbrăcăminte și accesorii personalizate și durabile. Acest proiect combină interesele mele în design, e-commerce și marketing, permițându-mi să-mi implementez ideile creative.'
        }
      },
      skillCategories: {
        finance: {
          category: 'Contabilitate Financiară & Salarizare (DE)',
          status: 'Avansat — 2+ ani experiență profesională',
          skills: [
            'Contabilitate Financiară: Creanțe, Datorii, Conturi Generale',
            'Contabilitate Salarizare & Procesare Salarii',
            'Declarații TVA Anticipate (lunar/trimestrial)',
            'Situații Financiare Lunare și Anuale (BWA, P&L, Bilanț)',
            'DATEV, Agenda, Simba (software birou fiscal)',
            'SelectLine, Modality, ELO DMS (actual)'
          ],
          note: 'Contabil Financiar din 08/2023 (modal3, Kesen, Herrmann, Quadriga) • Cursul Endriss finalizat; pregătire individuală pentru examenul din septembrie 2026; calificarea nu a fost încă obținută'
        },
        ecommerce: {
          category: 'E-Commerce Ops & Conformitate (EU/DE)',
          status: 'Practician avansat',
          skills: [
            'Shopify & Amazon Seller (EU)',
            'LUCID/VerpackG, GDPR & Google Consent Mode v2',
            'WEEE/ElektroG, GTIN & GTIN-exemption',
            'Printful/Spreadshirt/SPOD Logistică',
            'Google Merchant, Ads, Analytics'
          ]
        },
        aiml: {
          category: 'Sisteme AI/ML — Învățare & Cercetare',
          status: 'Învățare / Cercetare (non-expert)',
          skills: [
            'Prototipuri LLM/RAG (Ollama, llama.cpp, Qdrant)',
            'PyTorch / TensorFlow & scikit-learn',
            'MLflow & Urmărire Experimente',
            'Optimizare Performanță CPU-first (BLAS/AOCL)',
            'Tokenizer Controlat Semantic (Proiect)',
            'LLM from Scratch: Reconstrucție Gemma 3 270M (Rust/Julia)'
          ],
          note: 'Pair-programming: GPT-5 Thinking, Claude Code, Gemini Code Assist'
        },
        development: {
          category: 'Software & Web Development — Învățare',
          status: 'Învățare (co-creare asistată AI)',
          skills: [
            'React / Next.js 15, Tailwind, i18n',
            'Flask / FastAPI; Rust (Axum) Basics',
            'Apache Arrow/Parquet, Polars',
            'Docker, GitHub Actions, Linux Basics'
          ],
          note: 'Cod generat/debugat cu AI; Design + Arhitectură + Cercetare de mine'
        },
        languages: {
          category: 'Limbi',
          skills: [
            'Română (Nativ)',
            'Germană (Certificat telc B2)',
            'Engleză (Foarte bine)'
          ]
        },
        softSkills: {
          category: 'Soft Skills & Leadership',
          skills: [
            'Comunicare & Servicii Clienți',
            'Leadership Echipă (până la 9 angajați)',
            'Atenție la Detalii & Control Calitate',
            'Management Timp & Prioritizare',
            'Management Comercial & Administrare Afaceri'
          ]
        }
      },
      proficiencyLegend: {
        title: 'Legendă — Nivele de Competență',
        expert: 'Utilizare productivă, dovadă repetată în multiple proiecte',
        advanced: 'Practică constantă, autonomie în sarcini tipice',
        intermediate: '50–200h practică ghidată, cunoștințe de bază consolidate'
      }
    },
    experience: {
      title: 'Experiență Profesională',
      subtitle: 'Parcursul Meu Profesional',
      positions: 'Poziții',
      present: 'prezent',
      skillsTitle: 'Experiență Practică cu',
      practicalSkills: [
        'DATEV',
        'TVA',
        'Situații Financiare Anuale',
        'Contabilitate Financiară',
        'Contabilitate Salarizare',
        'MS Office'
      ]
    },
    education: {
      title: 'Educație',
      subtitle: 'Parcurs Academic și Profesional',
      description: 'Cursul Endriss finalizat; pregătire individuală pentru examenul Geprüfter Bilanzbuchhalter (IHK) din septembrie 2026; calificarea nu a fost încă obținută',
      ongoing: 'în curs',
      completed: 'finalizat',
      incomplete: 'fără diplomă de absolvire'
    },
    certifications: {
      title: 'Certificări',
      subtitle: 'Calificări și Credențiale Profesionale',
      description: 'Certificate IHK, referințe de la angajatori și certificate de limbă',
      download: 'Descarcă Certificat',
      verify: 'Verifică',
      issuer: 'Emitent',
      obtained: 'Obținut',
      from: 'De la',
      credentialType: 'Tip',
      partnership: 'Parteneriat',
      aboutTitle: 'Despre Certificările Mele',
      aboutText: 'Certificarea IHK ca Specialist Contabilitate confirmă cunoștințele și competențele mele profesionale în contabilitate. Pregătire pentru examenul Geprüfter Bilanzbuchhalter (IHK): Am finalizat cursul Endriss în ianuarie 2026 și în prezent mă pregătesc individual pentru examenul programat în septembrie 2026. Calificarea nu a fost încă obținută.',
      categories: {
        professional: 'Certificate Profesionale',
        language: 'Certificate de Limbă',
        reference: 'Referințe de Angajare',
        other: 'Alte Documente',
        aiProfessionalDevelopment: 'AI și dezvoltare profesională'
      },
      count: 'Certificate'
    },
    common: {
      backToHome: 'Înapoi la Pagina Principală',
      readMore: 'Citește Mai Mult',
      learnMore: 'Află Mai Mult',
      downloadPdf: 'Descarcă PDF',
      viewAll: 'Vezi Toate',
      loading: 'Se încarcă...',
      error: 'Eroare',
      notFound: 'Nu a fost găsit'
    },
    footer: {
      description: 'Contabil Financiar, dezvoltator al Fin-Tools Hub deschis și al sistemelor AI aplicate. Cursul Endriss finalizat; pregătire individuală pentru examenul din septembrie 2026; calificarea nu a fost încă obținută.',
      copyright: 'Toate drepturile rezervate.',
      madeWith: 'Realizat cu',
      deployedOn: 'găzduit pe',
      quickLinks: 'Linkuri rapide',
      language: 'Limbă',
      legal: 'Legal',
    },
    contact: {
      address: 'Adresă',
      phone: 'Telefon',
      email: 'Email',
      linkedin: 'LinkedIn',
      heading: 'Contact',
    }
  }
};

// Helper function to get translation
export const t = (lang: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[lang];

  for (const k of keys) {
    value = value?.[k];
  }

  return value ?? key;
};
