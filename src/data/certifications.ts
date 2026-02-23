/**
 * Certifications Data
 *
 * Professional certifications, work references, and language certificates
 * Extracted from legacy HTML files
 */

export interface Certification {
  id: string;
  title: {
    de: string;
    en: string;
    ro: string;
  };
  issuer: string;
  dateObtained?: string;
  validUntil?: string; // ISO date string or 'unlimited' for permanent certifications
  verificationUrl?: string; // URL to verify certificate authenticity (IHK registry, LinkedIn, etc.)
  image: string;
  imageWidth?: number;
  imageHeight?: number;
  pdfUrl?: string;
  description?: {
    de: string;
    en: string;
    ro: string;
  };
  category: 'professional' | 'language' | 'reference' | 'other';
}

export const certifications: Certification[] = [
  {
    id: 'ihk-fachkraft',
    title: {
      de: 'IHK - Fachkraft für Buchführung',
      en: 'IHK - Specialist for Bookkeeping',
      ro: 'IHK - Specialist Contabilitate'
    },
    issuer: 'IHK (Industrie- und Handelskammer)',
    dateObtained: '2023-07',
    validUntil: 'unlimited',
    verificationUrl: 'https://www.ihk.de',
    image: '/images/ihk1.png',
    imageWidth: 258,
    imageHeight: 372,
    pdfUrl: '/images/IHK - Fachkraft für Buchführung.pdf',
    description: {
      de: 'Zertifizierung als Fachkraft für Buchführung mit umfassenden Kenntnissen in Finanzbuchhaltung, Steuerrecht und DATEV-Software.',
      en: 'Certification as Specialist for Bookkeeping with comprehensive knowledge in financial accounting, tax law and DATEV software.',
      ro: 'Certificare ca Specialist Contabilitate cu cunoștințe cuprinzătoare în contabilitate financiară, drept fiscal și software DATEV.'
    },
    category: 'professional'
  },
  {
    id: 'ihk-finanzbuchhaltung',
    title: {
      de: 'IHK - Finanzbuchhaltung',
      en: 'IHK - Financial Accounting',
      ro: 'IHK - Contabilitate Financiară'
    },
    issuer: 'IHK (Industrie- und Handelskammer)',
    dateObtained: '2023',
    validUntil: 'unlimited',
    verificationUrl: 'https://www.ihk.de',
    image: '/images/ihk2.png',
    imageWidth: 262,
    imageHeight: 372,
    pdfUrl: '/images/IHK - Finanzbuchhaltung.pdf',
    description: {
      de: 'Spezialisierung in Finanzbuchhaltung mit Fokus auf Jahresabschlüsse und Bilanzierung.',
      en: 'Specialization in financial accounting with focus on annual financial statements and balance sheets.',
      ro: 'Specializare în contabilitate financiară cu accent pe situații financiare anuale și bilanțuri.'
    },
    category: 'professional'
  },
  {
    id: 'ihk-lohn-gehalt',
    title: {
      de: 'IHK - Lohn- und Gehaltsrechnung',
      en: 'IHK - Payroll Accounting',
      ro: 'IHK - Contabilitate Salarizare'
    },
    issuer: 'IHK (Industrie- und Handelskammer)',
    dateObtained: '2023',
    validUntil: 'unlimited',
    verificationUrl: 'https://www.ihk.de',
    image: '/images/ihk3.png',
    imageWidth: 262,
    imageHeight: 370,
    pdfUrl: '/images/IHK - Lohn- und Gehaltsrechnung.pdf',
    description: {
      de: 'Zertifizierung in Lohn- und Gehaltsabrechnung, Sozialversicherungsrecht und Lohnsteuer.',
      en: 'Certification in payroll accounting, social security law and payroll tax.',
      ro: 'Certificare în contabilitate salarizare, drept asigurări sociale și impozit pe salarii.'
    },
    category: 'professional'
  },
  {
    id: 'ihk-gleichwertigkeit',
    title: {
      de: 'Bescheid über Gleichwertigkeit - IHK',
      en: 'Certificate of Equivalence - IHK',
      ro: 'Certificat de Echivalență - IHK'
    },
    issuer: 'IHK FOSA',
    dateObtained: '2023',
    validUntil: 'unlimited',
    verificationUrl: 'https://www.ihk-fosa.de',
    image: '/images/ihkf.png',
    imageWidth: 261,
    imageHeight: 372,
    pdfUrl: '/images/Bescheid über Gleichwertigkeit - IHK.pdf',
    description: {
      de: 'Anerkennung der ausländischen Berufsqualifikation als gleichwertig mit dem deutschen Abschluss "Kaufmann im Einzelhandel".',
      en: 'Recognition of foreign professional qualification as equivalent to the German qualification "Retail Merchant".',
      ro: 'Recunoașterea calificării profesionale străine ca echivalentă cu calificarea germană "Comerciant cu Amănuntul".'
    },
    category: 'professional'
  },
  {
    id: 'arbeitszeugnis-quadriga',
    title: {
      de: 'Arbeitszeugnis Quadriga',
      en: 'Work Reference Quadriga',
      ro: 'Referință Muncă Quadriga'
    },
    issuer: 'Quadriga Steuerberatungsgesellschaft OHG',
    dateObtained: '2022-11',
    image: '/images/az_q.webp',
    imageWidth: 461,
    imageHeight: 652,
    pdfUrl: '/images/Zeugnis Mateescu_Quadriga.pdf',
    description: {
      de: 'Arbeitszeugnis für die Tätigkeit als Auszubildender Steuerfachangestellter.',
      en: 'Work reference for the activity as tax clerk trainee.',
      ro: 'Referință de muncă pentru activitatea ca stagiar specialist fiscal.'
    },
    category: 'reference'
  },
  {
    id: 'arbeitszeugnis-kesen',
    title: {
      de: 'Arbeitszeugnis Kesen',
      en: 'Work Reference Kesen',
      ro: 'Referință Muncă Kesen'
    },
    issuer: 'Kesen Steuerberatungsgesellschaft mbH',
    dateObtained: '2025-04',
    image: '/images/arbeitszeugnis-kesen-2025.webp',
    imageWidth: 823,
    imageHeight: 1200,
    pdfUrl: '/images/Arbeitszeugnis-Kesen-2025.pdf',
    description: {
      de: 'Arbeitszeugnis für die Tätigkeit als Finanzbuchhalter bei Kesen Steuerberatungsgesellschaft mbH.',
      en: 'Work reference for the activity as financial accountant at Kesen Steuerberatungsgesellschaft mbH.',
      ro: 'Referință de muncă pentru activitatea de contabil financiar la Kesen Steuerberatungsgesellschaft mbH.'
    },
    category: 'reference'
  },
  {
    id: 'arbeitszeugnis-smc',
    title: {
      de: 'Arbeitszeugnis SMC Rumänien',
      en: 'Work Reference SMC Romania',
      ro: 'Referință Muncă SMC România'
    },
    issuer: 'SMC Rumänien',
    dateObtained: '2018-08',
    image: '/images/az_s.webp',
    imageWidth: 458,
    imageHeight: 615,
    pdfUrl: '/images/Arbeitszeugnis Mateescu.pdf',
    description: {
      de: 'Arbeitszeugnis für die Tätigkeit als Gebietsverkaufsleiter.',
      en: 'Work reference for the activity as regional sales manager.',
      ro: 'Referință de muncă pentru activitatea ca manager vânzări regional.'
    },
    category: 'reference'
  },
  {
    id: 'telc-b2',
    title: {
      de: 'telc B2 Zertifikat',
      en: 'telc B2 Certificate',
      ro: 'Certificat telc B2'
    },
    issuer: 'telc GmbH',
    dateObtained: '2022',
    validUntil: 'unlimited',
    verificationUrl: 'https://www.telc.net',
    image: '/images/telc.png',
    imageWidth: 261,
    imageHeight: 369,
    pdfUrl: '/images/telc B2 Zertifikat Mateescu.pdf',
    description: {
      de: 'Deutschkenntnisse auf Niveau B2 (Selbstständige Sprachverwendung).',
      en: 'German language proficiency at level B2 (Independent language use).',
      ro: 'Competență limba germană nivel B2 (Utilizare independentă a limbii).'
    },
    category: 'language'
  },
  {
    id: 'lebenslauf',
    title: {
      de: 'Lebenslauf',
      en: 'Curriculum Vitae',
      ro: 'Curriculum Vitae'
    },
    issuer: 'Mihai Adrian Mateescu',
    dateObtained: '2024',
    image: '/images/cv.png',
    imageWidth: 275,
    imageHeight: 390,
    pdfUrl: '/images/Lebenslauf_Mateescu24_2.pdf',
    description: {
      de: 'Aktueller Lebenslauf mit vollständiger Berufs- und Ausbildungshistorie.',
      en: 'Current curriculum vitae with complete professional and educational history.',
      ro: 'Curriculum vitae actual cu istoricul complet profesional și educațional.'
    },
    category: 'other'
  }
];

// Helper functions
export const getCertificationsByCategory = (category: Certification['category']): Certification[] => {
  return certifications.filter(cert => cert.category === category);
};

export const getCertificationById = (id: string): Certification | undefined => {
  return certifications.find(cert => cert.id === id);
};
