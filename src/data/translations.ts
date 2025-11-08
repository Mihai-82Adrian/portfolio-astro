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
    cta: {
      viewProjects: string;
      readBlog: string;
      contact: string;
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
    currentFocus: string;
    skills: string;
  };
  // Experience Page
  experience: {
    title: string;
    subtitle: string;
    positions: string;
    present: string;
    skillsTitle: string;
  };
  // Education Page
  education: {
    title: string;
    subtitle: string;
    ongoing: string;
    completed: string;
    incomplete: string;
  };
  // Certifications Page
  certifications: {
    title: string;
    subtitle: string;
    download: string;
    verify: string;
    aboutTitle: string;
    aboutText: string;
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
      cta: {
        viewProjects: 'Projekte ansehen',
        readBlog: 'Blog lesen',
        contact: 'Kontakt aufnehmen'
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
      currentFocus: 'Aktuell: Weiterbildung zum Bilanzbuchhalter (IHK)',
      skills: 'Kompetenzen'
    },
    experience: {
      title: 'Berufserfahrung',
      subtitle: 'Mein beruflicher Werdegang',
      positions: 'Positionen',
      present: 'zurzeit',
      skillsTitle: 'Praxiserfahrung mit'
    },
    education: {
      title: 'Ausbildung',
      subtitle: 'Akademischer und beruflicher Werdegang',
      ongoing: 'laufend',
      completed: 'abgeschlossen',
      incomplete: 'ohne Abschlusszeugnis'
    },
    certifications: {
      title: 'Zertifizierungen',
      subtitle: 'Berufliche Qualifikationen und Nachweise',
      download: 'Zertifikat herunterladen',
      verify: 'Verifizieren',
      aboutTitle: 'Über meine Zertifizierungen',
      aboutText: 'Die IHK-Zertifizierung als Fachkraft für Buchführung bestätigt meine fachlichen Kenntnisse und Kompetenzen im Bereich der Buchhaltung. Aktuell setze ich meine Weiterbildung zum Bilanzbuchhalter (IHK) fort, um meine Fähigkeiten zu erweitern und meine berufliche Qualifikation zu steigern.'
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
      cta: {
        viewProjects: 'View Projects',
        readBlog: 'Read Blog',
        contact: 'Get in Touch'
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
      currentFocus: 'Currently: Continuing education as Certified Accountant (IHK)',
      skills: 'Competencies'
    },
    experience: {
      title: 'Professional Experience',
      subtitle: 'My Career Journey',
      positions: 'Positions',
      present: 'present',
      skillsTitle: 'Practical Experience with'
    },
    education: {
      title: 'Education',
      subtitle: 'Academic and Professional Background',
      ongoing: 'ongoing',
      completed: 'completed',
      incomplete: 'without graduation certificate'
    },
    certifications: {
      title: 'Certifications',
      subtitle: 'Professional Qualifications and Credentials',
      download: 'Download Certificate',
      verify: 'Verify',
      aboutTitle: 'About My Certifications',
      aboutText: 'The IHK certification as Specialist for Bookkeeping confirms my professional knowledge and competencies in accounting. Currently, I am continuing my education as Certified Accountant (IHK) to expand my skills and enhance my professional qualifications.'
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
      cta: {
        viewProjects: 'Vezi Proiecte',
        readBlog: 'Citește Blog',
        contact: 'Contactează-mă'
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
      currentFocus: 'Actual: Educație continuă ca Contabil Certificat (IHK)',
      skills: 'Competențe'
    },
    experience: {
      title: 'Experiență Profesională',
      subtitle: 'Parcursul Meu Profesional',
      positions: 'Poziții',
      present: 'prezent',
      skillsTitle: 'Experiență Practică cu'
    },
    education: {
      title: 'Educație',
      subtitle: 'Parcurs Academic și Profesional',
      ongoing: 'în curs',
      completed: 'finalizat',
      incomplete: 'fără diplomă de absolvire'
    },
    certifications: {
      title: 'Certificări',
      subtitle: 'Calificări și Credențiale Profesionale',
      download: 'Descarcă Certificat',
      verify: 'Verifică',
      aboutTitle: 'Despre Certificările Mele',
      aboutText: 'Certificarea IHK ca Specialist Contabilitate confirmă cunoștințele și competențele mele profesionale în contabilitate. În prezent, îmi continui educația ca Contabil Certificat (IHK) pentru a-mi extinde abilitățile și a-mi îmbunătăți calificările profesionale.'
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
