/**
 * Education Data
 *
 * Academic background, professional training, and continuing education
 * Extracted from legacy HTML files
 */

export interface Education {
  id: string;
  institution: string;
  degree: {
    de: string;
    en: string;
    ro: string;
  };
  field: {
    de: string;
    en: string;
    ro: string;
  };
  location: string;
  startDate: string;
  endDate: string | 'present';
  description: {
    de: string[];
    en: string[];
    ro: string[];
  };
  logo: string;
  status?: 'completed' | 'ongoing' | 'incomplete';
}

export const education: Education[] = [
  {
    id: 'bilanzbuchhalter',
    institution: 'Steuer-Fachschule Dr. Endriss GmbH & Co.KG',
    degree: {
      de: 'Weiterbildung: Bilanzbuchhalter (IHK)',
      en: 'Continuing Education: Certified Accountant (IHK)',
      ro: 'Educație Continuă: Contabil Certificat (IHK)'
    },
    field: {
      de: 'Bilanzbuchhaltung, Steuerrecht, Controlling',
      en: 'Balance Sheet Accounting, Tax Law, Controlling',
      ro: 'Contabilitate Bilanț, Drept Fiscal, Controlling'
    },
    location: 'Hamburg, Germany',
    startDate: '2024-10',
    endDate: '2026-03',
    description: {
      de: [
        'Finanzmanagement',
        'Kosten- und Leistungsrechnung',
        'Rechtliche Grundlagen',
        'Buchführung & Buchhaltungsorganisation',
        'Kommunikation, Führung und Zusammenarbeit',
        'Abgabenordnung',
        'Jahresabschluss nach Handels- und Steuerrecht',
        'Umsatzsteuer',
        'Lohnsteuer',
        'Internes Kontrollsystem',
        'Einkommensteuer',
        'Körperschaftsteuer',
        'Internationale Rechnungslegung',
        'Gewerbesteuer',
        'Internationales Steuerrecht'
      ],
      en: [
        'Financial Management',
        'Cost and Performance Accounting',
        'Legal Foundations',
        'Bookkeeping & Accounting Organization',
        'Communication, Leadership and Collaboration',
        'Tax Code',
        'Annual Financial Statements according to Commercial and Tax Law',
        'VAT',
        'Payroll Tax',
        'Internal Control System',
        'Income Tax',
        'Corporate Tax',
        'International Accounting',
        'Trade Tax',
        'International Tax Law'
      ],
      ro: [
        'Management Financiar',
        'Contabilitate Costuri și Performanță',
        'Fundamente Juridice',
        'Organizare Contabilitate',
        'Comunicare, Leadership și Colaborare',
        'Cod Fiscal',
        'Situații Financiare Anuale conform Dreptului Comercial și Fiscal',
        'TVA',
        'Impozit pe Salarii',
        'Sistem de Control Intern',
        'Impozit pe Venit',
        'Impozit pe Corporații',
        'Contabilitate Internațională',
        'Impozit pe Comerț',
        'Drept Fiscal Internațional'
      ]
    },
    logo: '/images/Endriss.png',
    status: 'ongoing'
  },
  {
    id: 'ihk-fachkraft',
    institution: 'Grone Wirtschaftsakademie GmbH',
    degree: {
      de: 'Fortbildung: IHK - Fachkraft für Buchführung',
      en: 'Professional Training: IHK - Specialist for Bookkeeping',
      ro: 'Formare Profesională: IHK - Specialist Contabilitate'
    },
    field: {
      de: 'Buchführung, Finanzbuchhaltung, Lohn- und Gehaltsrechnung',
      en: 'Bookkeeping, Financial Accounting, Payroll Accounting',
      ro: 'Contabilitate, Contabilitate Financiară, Salarizare'
    },
    location: 'Hamburg, Germany',
    startDate: '2023-02',
    endDate: '2023-07',
    description: {
      de: [
        'Buchführung/Finanzbuchhaltung am PC mit DATEV',
        'Lohn- und Gehaltsrechnung'
      ],
      en: [
        'Bookkeeping/Financial Accounting on PC with DATEV',
        'Payroll Accounting'
      ],
      ro: [
        'Contabilitate/Contabilitate Financiară pe PC cu DATEV',
        'Contabilitate Salarizare'
      ]
    },
    logo: '/images/ihk.png',
    status: 'completed'
  },
  {
    id: 'ihk-anerkennung',
    institution: 'A.D. Xenopol Wirtschaftsgymnasium',
    degree: {
      de: 'Ausbildungsanerkennung: IHK FOSA - Kaufmann im Einzelhandel',
      en: 'Recognition of Training: IHK FOSA - Retail Merchant',
      ro: 'Recunoaștere Formare: IHK FOSA - Comerciant cu Amănuntul'
    },
    field: {
      de: 'Finanz- und Handelstätigkeiten',
      en: 'Finance and Trade Activities',
      ro: 'Activități Financiare și Comerciale'
    },
    location: 'Bucharest, Romania',
    startDate: '1998',
    endDate: '2001',
    description: {
      de: [
        'Die Ausbildung als Fachmann für Finanz und Handelstätigkeiten wurde in Rumänien im Jahr 2001, nach 4 Jahren Ausbildungszeit, abgeschlossen.'
      ],
      en: [
        'The training as specialist for finance and trade activities was completed in Romania in 2001, after 4 years of training.'
      ],
      ro: [
        'Formarea ca specialist pentru activități financiare și comerciale a fost finalizată în România în 2001, după 4 ani de pregătire.'
      ]
    },
    logo: '/images/ihk2.png',
    status: 'completed'
  },
  {
    id: 'spiru-haret',
    institution: 'Spiru Haret Universität',
    degree: {
      de: 'Universitätsstudium: Finanzmanagement – Buchhaltung',
      en: 'University Studies: Financial Management - Accounting',
      ro: 'Studii Universitare: Management Financiar - Contabilitate'
    },
    field: {
      de: 'Buchhaltung und Finanzmanagement',
      en: 'Accounting and Financial Management',
      ro: 'Contabilitate și Management Financiar'
    },
    location: 'Bucharest, Romania',
    startDate: '2001',
    endDate: '2004',
    description: {
      de: [
        'Buchhaltung und Finanzmanagement',
        'ohne Abschlusszeugnis'
      ],
      en: [
        'Accounting and Financial Management',
        'without graduation certificate'
      ],
      ro: [
        'Contabilitate și Management Financiar',
        'fără diplomă de absolvire'
      ]
    },
    logo: '/images/haret.png',
    status: 'incomplete'
  }
];

// Helper functions
export const getEducationByStatus = (status: Education['status']): Education[] => {
  return education.filter(edu => edu.status === status);
};

export const getEducationById = (id: string): Education | undefined => {
  return education.find(edu => edu.id === id);
};

export const getCurrentEducation = (): Education[] => {
  return education.filter(edu => edu.endDate === 'present' || edu.status === 'ongoing');
};
