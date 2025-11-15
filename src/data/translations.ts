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
    blog: string;
    contact: string;
  };
  // Homepage
  home: {
    title: string;
    subtitle: string;
    description: string;
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
  };
  // About Page
  about: {
    title: string;
    subtitle: string;
    intro: string;
    description: string;
    currentFocus: string;
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
    aboutTitle: string;
    aboutText: string;
    categories: {
      professional: string;
      language: string;
      reference: string;
      other: string;
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
  };
  // Contact Info
  contact: {
    address: string;
    phone: string;
    email: string;
    linkedin: string;
  };
}

export const translations: Record<Language, Translations> = {
  de: {
    nav: {
      home: 'Home',
      about: 'Über mich',
      experience: 'Berufserfahrung',
      education: 'Ausbildung',
      certifications: 'Zertifizierungen',
      blog: 'Blog',
      contact: 'Kontakt'
    },
    home: {
      title: 'Mihai Adrian Mateescu',
      subtitle: 'Finanzbuchhalter',
      description: 'Engagierter Finanzbuchhalter mit Erfahrung in der Buchhaltung und Finanzverwaltung, spezialisiert auf die detaillierte Analyse von Geschäftsvorfällen und die steuerliche Berichterstattung. Mit einer ausgeprägten Leidenschaft für Zahlen und einem scharfen Auge für Details suche ich stets nach Möglichkeiten, meine beruflichen Fähigkeiten weiterzuentwickeln. Meine vielseitige Erfahrung, die von der Buchhaltung bis hin zum Management von Teams reicht, empfiehlt mich als einen flexiblen Fachmann, der in jeder finanziellen Umgebung einen Mehrwert schafft.',
      skillsLabel: 'Kompetenzen:',
      heroSkills: ['DATEV', 'Finanzbuchhaltung', 'Umsatzsteuer', 'Jahresabschlüsse'],
      cta: {
        viewProjects: 'Projekte ansehen',
        readBlog: 'Blog lesen',
        contact: 'Kontakt aufnehmen'
      },
      quickLinks: {
        education: 'Weiterbildung zum Bilanzbuchhalter (IHK) und IHK-Zertifizierungen',
        experience: '21 Jahre Berufserfahrung in Buchhaltung, Vertrieb und Management',
        certifications: 'IHK-Zertifikate, Arbeitszeugnisse und Sprachzertifikate',
        hobbiesText: 'Fotografie, Technologie und mein E-Commerce-Projekt Profit Minds'
      },
      skills: {
        title: 'Fähigkeiten und Kenntnisse',
        items: [
          'Finanz- und Lohnbuchhaltung',
          'MS Office Kenntnisse',
          'DATEV / Agenda / Simba',
          'Schnelles Schreiben',
          'Gute Kommunikationsfähigkeiten',
          'Führungserfahrung: bis zu 9 Mitarbeiter/innen'
        ]
      },
      leadership: {
        title: 'Führungs-Kompetenzen',
        items: [
          'Kaufmännische Leitung mit Schwerpunkt auf betriebswirtschaftlicher Steuerung und operativer Umsetzung.',
          'Bis zu 2 Jahre Erfahrung in der Leitung und Koordination von Geschäftsprozessen.',
          'Verantwortlich für die Führung und Entwicklung von bis zu 9 Mitarbeiter/innen.'
        ]
      },
      hobbies: {
        title: 'Hobbies',
        learnMore: 'Mehr über meine Hobbies'
      }
    },
    about: {
      title: 'Über mich',
      subtitle: 'Finanzbuchhalter & Finanzexperte',
      intro: 'Willkommen auf meiner Portfolio-Seite',
      description: 'Finanzbuchhalter mit Interesse für Technologie, Fotografie und E-Commerce',
      currentFocus: 'Aktuell: Weiterbildung zum Bilanzbuchhalter (IHK)',
      skills: 'Kompetenzen',
      skillsSubtitle: 'Ehrliche Selbsteinschätzung meiner beruflichen und technischen Fähigkeiten',
      professionalIdentityText: 'Engagierter Finanzbuchhalter mit Erfahrung in der Buchhaltung und Finanzverwaltung, spezialisiert auf die detaillierte Analyse von Geschäftsvorfällen und die steuerliche Berichterstattung. Mit einer ausgeprägten Leidenschaft für Zahlen und einem scharfen Auge für Details suche ich stets nach Möglichkeiten, meine beruflichen Fähigkeiten weiterzuentwickeln.',
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
          note: 'Finanzbuchhalter seit 08/2023 (modal3, Kesen, Herrmann, Quadriga) • Bilanzbuchhalter (IHK) in Ausbildung, Prüfung 03/2026'
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
      description: 'Weiterbildung zum Bilanzbuchhalter (IHK) und berufliche Qualifikationen',
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
      aboutTitle: 'Über meine Zertifizierungen',
      aboutText: 'Die IHK-Zertifizierung als Fachkraft für Buchführung bestätigt meine fachlichen Kenntnisse und Kompetenzen im Bereich der Buchhaltung. Aktuell setze ich meine Weiterbildung zum Bilanzbuchhalter (IHK) fort, um meine Fähigkeiten zu erweitern und meine berufliche Qualifikation zu steigern.',
      categories: {
        professional: 'Berufliche Zertifikate',
        language: 'Sprachzertifikate',
        reference: 'Arbeitszeugnisse',
        other: 'Weitere Dokumente'
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
      description: 'Finanzbuchhalter mit Leidenschaft für Zahlen und kontinuierliches Lernen. Aktuell: Weiterbildung zum Bilanzbuchhalter (IHK). Hobby: Technologie-Exploration.',
      copyright: '© 2025 Mihai Adrian Mateescu',
      madeWith: 'Erstellt mit'
    },
    contact: {
      address: 'Adresse',
      phone: 'Telefon',
      email: 'E-Mail',
      linkedin: 'LinkedIn'
    }
  },
  en: {
    nav: {
      home: 'Home',
      about: 'About',
      experience: 'Experience',
      education: 'Education',
      certifications: 'Certifications',
      blog: 'Blog',
      contact: 'Contact'
    },
    home: {
      title: 'Mihai Adrian Mateescu',
      subtitle: 'Financial Accountant',
      description: 'Dedicated Financial Accountant with experience in accounting and financial management, specializing in detailed analysis of business transactions and tax reporting. With a strong passion for numbers and a keen eye for detail, I constantly seek opportunities to further develop my professional skills. My diverse experience, ranging from accounting to team management, positions me as a flexible professional who creates value in any financial environment.',
      skillsLabel: 'Skills:',
      heroSkills: ['DATEV', 'Financial Accounting', 'VAT', 'Annual Statements'],
      cta: {
        viewProjects: 'View Projects',
        readBlog: 'Read Blog',
        contact: 'Get in Touch'
      },
      quickLinks: {
        education: 'Training to become a certified accountant (IHK) and IHK certifications',
        experience: '21 years of professional experience in accounting, sales and management',
        certifications: 'IHK certificates, employment references and language certificates',
        hobbiesText: 'Photography, technology and my e-commerce project Profit Minds'
      },
      skills: {
        title: 'Skills and Expertise',
        items: [
          'Financial and Payroll Accounting',
          'MS Office Proficiency',
          'DATEV / Agenda / Simba',
          'Fast Typing',
          'Excellent Communication Skills',
          'Leadership Experience: up to 9 employees'
        ]
      },
      leadership: {
        title: 'Leadership Competencies',
        items: [
          'Commercial management with focus on business administration and operational implementation.',
          'Up to 2 years of experience in leading and coordinating business processes.',
          'Responsible for leading and developing up to 9 employees.'
        ]
      },
      hobbies: {
        title: 'Hobbies',
        learnMore: 'Learn more about my hobbies'
      }
    },
    about: {
      title: 'About Me',
      subtitle: 'Financial Accountant & Finance Expert',
      intro: 'Welcome to my portfolio',
      description: 'Financial Accountant with interests in technology, photography and e-commerce',
      currentFocus: 'Currently: Continuing education as Certified Accountant (IHK)',
      skills: 'Competencies',
      skillsSubtitle: 'Honest self-assessment of my professional and technical skills',
      professionalIdentityText: 'Dedicated Financial Accountant with experience in accounting and financial management, specialized in detailed analysis of business transactions and tax reporting. With a strong passion for numbers and a keen eye for detail, I constantly seek opportunities to further develop my professional skills.',
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
          note: 'Financial Accountant since 08/2023 (modal3, Kesen, Herrmann, Quadriga) • Certified Accountant (IHK) in training, exam 03/2026'
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
      description: 'Continuing education as Certified Accountant (IHK) and professional qualifications',
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
      aboutTitle: 'About My Certifications',
      aboutText: 'The IHK certification as Specialist for Bookkeeping confirms my professional knowledge and competencies in accounting. Currently, I am continuing my education as Certified Accountant (IHK) to expand my skills and enhance my professional qualifications.',
      categories: {
        professional: 'Professional Certificates',
        language: 'Language Certificates',
        reference: 'Employment References',
        other: 'Other Documents'
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
      description: 'Financial Accountant with a passion for numbers and continuous learning. Currently: Further training to become a certified accountant (IHK). Hobby: Technology exploration.',
      copyright: '© 2025 Mihai Adrian Mateescu',
      madeWith: 'Made with'
    },
    contact: {
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      linkedin: 'LinkedIn'
    }
  },
  ro: {
    nav: {
      home: 'Acasă',
      about: 'Despre mine',
      experience: 'Experiență',
      education: 'Educație',
      certifications: 'Certificări',
      blog: 'Blog',
      contact: 'Contact'
    },
    home: {
      title: 'Mihai Adrian Mateescu',
      subtitle: 'Contabil Financiar',
      description: 'Contabil Financiar dedicat cu experiență în contabilitate și management financiar, specializat în analiza detaliată a tranzacțiilor comerciale și raportarea fiscală. Cu o pasiune puternică pentru cifre și un ochi atent la detalii, caut constant oportunități de a-mi dezvolta abilitățile profesionale. Experiența mea diversă, care variază de la contabilitate la managementul echipelor, mă poziționează ca un profesionist flexibil care creează valoare în orice mediu financiar.',
      skillsLabel: 'Competențe:',
      heroSkills: ['DATEV', 'Contabilitate Financiară', 'TVA', 'Situații Anuale'],
      cta: {
        viewProjects: 'Vezi Proiecte',
        readBlog: 'Citește Blog',
        contact: 'Contactează-mă'
      },
      quickLinks: {
        education: 'Formare pentru a deveni contabil certificat (IHK) și certificări IHK',
        experience: '21 de ani de experiență profesională în contabilitate, vânzări și management',
        certifications: 'Certificate IHK, referințe de la angajatori și certificate de limbă',
        hobbiesText: 'Fotografie, tehnologie și proiectul meu de e-commerce Profit Minds'
      },
      skills: {
        title: 'Competențe și Cunoștințe',
        items: [
          'Contabilitate Financiară și Salarizare',
          'Cunoștințe MS Office',
          'DATEV / Agenda / Simba',
          'Tastare Rapidă',
          'Abilități Excelente de Comunicare',
          'Experiență Leadership: până la 9 angajați'
        ]
      },
      leadership: {
        title: 'Competențe de Leadership',
        items: [
          'Conducere comercială cu accent pe controlul administrației afacerii și implementarea operațională.',
          'Până la 2 ani de experiență în conducerea și coordonarea proceselor de afaceri.',
          'Responsabil pentru conducerea și dezvoltarea a până la 9 angajați.'
        ]
      },
      hobbies: {
        title: 'Hobby-uri',
        learnMore: 'Află mai multe despre hobby-urile mele'
      }
    },
    about: {
      title: 'Despre Mine',
      subtitle: 'Contabil Financiar & Expert Financiar',
      intro: 'Bun venit pe pagina mea de portofoliu',
      description: 'Contabil Financiar cu interese în tehnologie, fotografie și e-commerce',
      currentFocus: 'Actual: Educație continuă ca Contabil Certificat (IHK)',
      skills: 'Competențe',
      skillsSubtitle: 'Autoevaluare onestă a abilităților mele profesionale și tehnice',
      professionalIdentityText: 'Contabil Financiar dedicat cu experiență în contabilitate și management financiar, specializat în analiza detaliată a tranzacțiilor comerciale și raportarea fiscală. Cu o pasiune puternică pentru cifre și un ochi atent la detalii, caut constant oportunități de a-mi dezvolta abilitățile profesionale.',
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
          note: 'Contabil Financiar din 08/2023 (modal3, Kesen, Herrmann, Quadriga) • Contabil Certificat (IHK) în formare, examen 03/2026'
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
      description: 'Formare continuă ca Contabil Certificat (IHK) și calificări profesionale',
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
      aboutTitle: 'Despre Certificările Mele',
      aboutText: 'Certificarea IHK ca Specialist Contabilitate confirmă cunoștințele și competențele mele profesionale în contabilitate. În prezent, îmi continui educația ca Contabil Certificat (IHK) pentru a-mi extinde abilitățile și a-mi îmbunătăți calificările profesionale.',
      categories: {
        professional: 'Certificate Profesionale',
        language: 'Certificate de Limbă',
        reference: 'Referințe de Angajare',
        other: 'Alte Documente'
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
      description: 'Contabil Financiar cu pasiune pentru cifre și învățare continuă. În prezent: Formare pentru a deveni contabil certificat (IHK). Hobby: Explorare tehnologică.',
      copyright: '© 2025 Mihai Adrian Mateescu',
      madeWith: 'Creat cu'
    },
    contact: {
      address: 'Adresă',
      phone: 'Telefon',
      email: 'Email',
      linkedin: 'LinkedIn'
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
