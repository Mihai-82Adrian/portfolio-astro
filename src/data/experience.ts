/**
 * Career Experience Data
 *
 * Structured data for all professional positions (2003-present)
 * Extracted from legacy HTML files and organized chronologically
 */

export interface Position {
  id: string;
  company: string;
  role: {
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
  technologies?: string[];
}

export const careerPositions: Position[] = [
  {
    id: '14',
    company: 'modal3 Logistik GmbH',
    role: {
      de: 'Finanzbuchhalter',
      en: 'Financial Accountant',
      ro: 'Contabil Financiar'
    },
    location: 'Hamburg, Germany (Hybrid)',
    startDate: '2025-05',
    endDate: 'present',
    description: {
      de: [
        'Vollständige Bearbeitung der laufenden Finanzbuchhaltung (Debitoren, Kreditoren, Sachkonten).',
        'Prüfung, Kontierung und Buchung von Eingangs- und Ausgangsrechnungen.',
        'Abstimmung und Pflege von Konten sowie Überwachung offener Posten.',
        'Erstellung von Umsatzsteuervoranmeldungen und Unterstützung bei Monats- und Jahresabschlüssen.',
        'Unterstützung der Geschäftsführung durch betriebswirtschaftliche Auswertungen (BWA) und Reports.',
        'Mitwirkung an der Digitalisierung von Rechnungs- und Buchhaltungsprozessen.'
      ],
      en: [
        'Complete processing of ongoing financial accounting (accounts receivable, accounts payable, general ledger).',
        'Review, account assignment and posting of incoming and outgoing invoices.',
        'Reconciliation and maintenance of accounts as well as monitoring of open items.',
        'Preparation of VAT advance returns and support for monthly and annual financial statements.',
        'Support for management through business evaluations (BWA) and reports.',
        'Participation in the digitalization of invoice and accounting processes.'
      ],
      ro: [
        'Procesare completă a contabilității financiare curente (conturi de încasat, conturi de plătit, registru general).',
        'Verificare, contabilizare și înregistrare a facturilor primite și emise.',
        'Reconcilierea și întreținerea conturilor precum și monitorizarea posturilor deschise.',
        'Pregătirea declarațiilor de TVA și sprijin pentru situațiile financiare lunare și anuale.',
        'Sprijin pentru management prin evaluări economice (BWA) și rapoarte.',
        'Participare la digitalizarea proceselor de facturare și contabilitate.'
      ]
    },
    logo: '/images/modal3.png',
    technologies: ['SelectLine', 'Modality', 'ELO', 'Finanzbuchhaltung', 'BWA', 'Umsatzsteuer']
  },
  {
    id: '13',
    company: 'Kesen Steuerberatungsgesellschaft mbH',
    role: {
      de: 'Finanzbuchhalter',
      en: 'Financial Accountant',
      ro: 'Contabil Financiar'
    },
    location: 'Hamburg, Germany',
    startDate: '2024-02',
    endDate: '2025-04',
    description: {
      de: [
        'Prüfung und Verbuchung von Geschäftsvorfällen: Sorgfältige Prüfung, Kontierung und Buchung laufender Geschäftsvorfälle unter Einhaltung der geltenden Buchführungsstandards und -richtlinien.',
        'Steuerliche Meldungen: Verantwortlich für die Vorbereitung und elektronische Übermittlung der monatlichen oder vierteljährlichen Umsatzsteuervoranmeldungen, individuell abgestimmt auf die Bedürfnisse der Mandanten.'
      ],
      en: [
        'Review and posting of business transactions: Careful review, account assignment and posting of ongoing business transactions in compliance with applicable accounting standards and guidelines.',
        'Tax reporting: Responsible for the preparation and electronic submission of monthly or quarterly VAT advance returns, individually tailored to clients\' needs.'
      ],
      ro: [
        'Verificarea și înregistrarea tranzacțiilor comerciale: Verificare atentă, contabilizare și înregistrare a tranzacțiilor comerciale curente în conformitate cu standardele și directivele contabile aplicabile.',
        'Raportări fiscale: Responsabil pentru pregătirea și transmiterea electronică a declarațiilor de TVA lunare sau trimestriale, adaptate individual nevoilor clienților.'
      ]
    },
    logo: '/images/kesen.png',
    technologies: ['Simba', 'Umsatzsteuer', 'Finanzbuchhaltung']
  },
  {
    id: '12',
    company: 'Dipl.oec. Gerolf Herrmann',
    role: {
      de: 'Finanzbuchhalter',
      en: 'Financial Accountant',
      ro: 'Contabil Financiar'
    },
    location: 'Hamburg, Germany',
    startDate: '2023-08',
    endDate: '2023-12',
    description: {
      de: [
        'Kontierung und Buchung: Fachgerechte Prüfung und Verbuchung von Geschäftsvorfällen zur Sicherstellung einer korrekten Buchführung und Vorbereitung für den Jahresabschluss.',
        'Umsatzsteuerliche Verpflichtungen: Effiziente Vorbereitung und fristgerechte elektronische Einreichung der Umsatzsteuervoranmeldungen, angepasst an die Anforderungen der Mandanten.'
      ],
      en: [
        'Account assignment and posting: Professional review and posting of business transactions to ensure correct bookkeeping and preparation for annual financial statements.',
        'VAT obligations: Efficient preparation and timely electronic submission of VAT advance returns, adapted to clients\' requirements.'
      ],
      ro: [
        'Contabilizare și înregistrare: Verificare profesională și înregistrare a tranzacțiilor comerciale pentru asigurarea unei contabilități corecte și pregătirea pentru bilanțul anual.',
        'Obligații TVA: Pregătire eficientă și depunere electronică la timp a declarațiilor de TVA, adaptate cerințelor clienților.'
      ]
    },
    logo: '/images/herrmann.png',
    technologies: ['Agenda', 'Jahresabschluss', 'Umsatzsteuer']
  },
  {
    id: '11',
    company: 'Quadriga Steuerberatungsgesellschaft OHG',
    role: {
      de: 'Auszubildender Steuerfachangestellter',
      en: 'Tax Clerk Trainee',
      ro: 'Stagiar Specialist Fiscal'
    },
    location: 'Buchholz i. d. N., Germany',
    startDate: '2022-08',
    endDate: '2022-11',
    description: {
      de: [
        'Unterstützung in der Steuerberatung und Buchführung: Durchführung grundlegender Aufgaben in der Steuerberatung und Buchhaltung, einschließlich der Vorbereitung von Steuererklärungen und der Bearbeitung von Buchungsvorgängen unter Anleitung erfahrener Fachleute.'
      ],
      en: [
        'Support in tax consulting and bookkeeping: Performing basic tasks in tax consulting and accounting, including preparation of tax returns and processing of accounting transactions under the guidance of experienced professionals.'
      ],
      ro: [
        'Suport în consultanță fiscală și contabilitate: Efectuarea sarcinilor de bază în consultanță fiscală și contabilitate, inclusiv pregătirea declarațiilor fiscale și procesarea tranzacțiilor contabile sub îndrumarea profesioniștilor experți.'
      ]
    },
    logo: '/images/quadriga.png',
    technologies: ['Steuerberatung', 'Buchführung']
  },
  {
    id: '10',
    company: 'Amazon Logistik Winsen GmbH',
    role: {
      de: 'Versandmitarbeiter',
      en: 'Shipping Associate',
      ro: 'Asociat Expediție'
    },
    location: 'Winsen Luhe, Germany',
    startDate: '2020-10',
    endDate: '2020-12',
    description: {
      de: [
        'Auftragsabwicklung und Verpackung: Verantwortlich für das sorgfältige Abholen und Verpacken von Bestellungen, um eine effiziente und fehlerfreie Abwicklung der Kundenaufträge zu gewährleisten.'
      ],
      en: [
        'Order processing and packaging: Responsible for careful picking and packing of orders to ensure efficient and error-free processing of customer orders.'
      ],
      ro: [
        'Procesare comenzi și ambalare: Responsabil pentru ridicarea și ambalarea atentă a comenzilor pentru a asigura procesarea eficientă și fără erori a comenzilor clienților.'
      ]
    },
    logo: '/images/amazon.png'
  },
  {
    id: '9',
    company: 'ToBusch Fußbodenheizung',
    role: {
      de: 'Anlagenmechaniker SHK',
      en: 'HVAC Technician',
      ro: 'Tehnician HVAC'
    },
    location: 'Rosengarten, Germany',
    startDate: '2018-08',
    endDate: '2020-09',
    description: {
      de: [
        'Installation von Fußbodenheizungssystemen: Fachgerechte Verlegung und Installation von Fußbodenheizungssystemen unter Einhaltung der technischen Standards und Sicherheitsvorschriften.'
      ],
      en: [
        'Installation of underfloor heating systems: Professional laying and installation of underfloor heating systems in compliance with technical standards and safety regulations.'
      ],
      ro: [
        'Instalare sisteme de încălzire în pardoseală: Instalare profesională a sistemelor de încălzire în pardoseală în conformitate cu standardele tehnice și reglementările de siguranță.'
      ]
    },
    logo: '/images/tobusch.png'
  },
  {
    id: '8',
    company: 'SMC Rumänien',
    role: {
      de: 'Gebietsverkaufsleiter',
      en: 'Regional Sales Manager',
      ro: 'Manager Vânzări Regional'
    },
    location: 'Bucharest, Romania',
    startDate: '2017-01',
    endDate: '2018-08',
    description: {
      de: [
        'Aufbau und Pflege von Kundenbeziehungen: Diente als zentrale Anlaufstelle zwischen Technik und Kunden, um effektive Kommunikationswege sicherzustellen und technische Lösungen kundengerecht zu präsentieren.',
        'Führung und Motivation des Verkaufsteams: Leitete ein Team von drei Handelsvertretern, um Verkaufsziele zu erreichen und die Leistung des Teams kontinuierlich zu steigern.',
        'Strategische Zusammenarbeit mit dem Country Manager: Verantwortlich für die enge Zusammenarbeit mit dem Country Manager, einschließlich der Teilnahme an strategischen Verkaufsbesprechungen zur Optimierung der Vertriebsergebnisse.'
      ],
      en: [
        'Building and maintaining customer relationships: Served as central point of contact between technical department and customers to ensure effective communication channels and present technical solutions in a customer-oriented manner.',
        'Leadership and motivation of sales team: Led a team of three sales representatives to achieve sales targets and continuously improve team performance.',
        'Strategic collaboration with Country Manager: Responsible for close cooperation with the Country Manager, including participation in strategic sales meetings to optimize sales results.'
      ],
      ro: [
        'Construirea și menținerea relațiilor cu clienții: A servit ca punct central de contact între departamentul tehnic și clienți pentru a asigura canale de comunicare eficiente și prezentarea soluțiilor tehnice orientate către client.',
        'Conducerea și motivarea echipei de vânzări: A condus o echipă de trei reprezentanți de vânzări pentru a atinge obiectivele de vânzări și a îmbunătăți continuu performanța echipei.',
        'Colaborare strategică cu Country Manager: Responsabil pentru cooperarea strânsă cu Country Manager, inclusiv participarea la întâlniri strategice de vânzări pentru optimizarea rezultatelor de vânzări.'
      ]
    },
    logo: '/images/smc.png',
    technologies: ['Team Leadership', 'Sales Management', 'Customer Relations']
  },
  {
    id: '7',
    company: 'SMC Rumänien',
    role: {
      de: 'Handelsvertreter - Industrieller Vertrieb',
      en: 'Sales Representative - Industrial Sales',
      ro: 'Reprezentant Vânzări - Vânzări Industriale'
    },
    location: 'Bucharest, Romania',
    startDate: '2013-02',
    endDate: '2016-12',
    description: {
      de: [
        'Kundendialog und technische Beratung: Sicherstellung einer nahtlosen Kommunikation zwischen Technik und Kunden sowie aktive Teilnahme an Branchenmessen und Ausstellungen zur Förderung der Produktbekanntheit.'
      ],
      en: [
        'Customer dialogue and technical consulting: Ensuring seamless communication between technical department and customers, as well as active participation in industry trade fairs and exhibitions to promote product awareness.'
      ],
      ro: [
        'Dialog cu clienții și consultanță tehnică: Asigurarea comunicării perfecte între departamentul tehnic și clienți, precum și participarea activă la târguri și expoziții industriale pentru promovarea produselor.'
      ]
    },
    logo: '/images/smc.png'
  },
  {
    id: '6',
    company: 'GUESS Rumänien',
    role: {
      de: 'Kassierer (Handel)',
      en: 'Cashier (Retail)',
      ro: 'Casier (Retail)'
    },
    location: 'Bucharest, Romania',
    startDate: '2011-05',
    endDate: '2013-02',
    description: {
      de: [
        'Kundenservice und Zahlungsabwicklung: Kompetente Beratung der Kunden in Modefragen, Abwicklung von Zahlungen und Erstellung von Rechnungen.',
        'Berichtswesen: Erstellung und Analyse täglicher Verkaufsberichte zur Unterstützung des Managements bei der Entscheidungsfindung.'
      ],
      en: [
        'Customer service and payment processing: Competent advice to customers on fashion matters, processing payments and creating invoices.',
        'Reporting: Creation and analysis of daily sales reports to support management decision-making.'
      ],
      ro: [
        'Servicii clienți și procesare plăți: Consiliere competentă a clienților în probleme de modă, procesarea plăților și crearea facturilor.',
        'Raportare: Crearea și analiza rapoartelor de vânzări zilnice pentru sprijinirea deciziilor de management.'
      ]
    },
    logo: '/images/guess.png'
  },
  {
    id: '5',
    company: 'ZARA Rumänien',
    role: {
      de: 'Verkaufsberater',
      en: 'Sales Consultant',
      ro: 'Consultant Vânzări'
    },
    location: 'Bucharest, Romania',
    startDate: '2010-02',
    endDate: '2011-04',
    description: {
      de: [
        'Kundenberatung und Produktempfehlung: Kompetente Beratung der Kunden bei der Produktauswahl und Sicherstellung einer ansprechenden Präsentation der Waren im Geschäft.',
        'Mitarbeiter des Monats: Anerkennung als „Mitarbeiter des Monats" im Juni und Juli 2010 für herausragende Leistungen im Kundenservice.'
      ],
      en: [
        'Customer consulting and product recommendation: Competent advice to customers on product selection and ensuring attractive presentation of goods in the store.',
        'Employee of the Month: Recognition as "Employee of the Month" in June and July 2010 for outstanding customer service performance.'
      ],
      ro: [
        'Consultanță clienți și recomandări produse: Consiliere competentă a clienților în selecția produselor și asigurarea prezentării atractive a mărfurilor în magazin.',
        'Angajatul lunii: Recunoaștere ca „Angajatul lunii" în iunie și iulie 2010 pentru performanțe remarcabile în serviciul clienți.'
      ]
    },
    logo: '/images/zara.png'
  },
  {
    id: '4',
    company: 'Germanos Telekom Rumänien',
    role: {
      de: 'Verkaufsberater',
      en: 'Sales Consultant',
      ro: 'Consultant Vânzări'
    },
    location: 'Bucharest, Romania',
    startDate: '2008-09',
    endDate: '2010-01',
    description: {
      de: [
        'Kundenberatung und Transaktionsabwicklung: Fachkundige Beratung der Kunden und zuverlässige Abwicklung von Zahlungen und Warenannahme.'
      ],
      en: [
        'Customer consulting and transaction processing: Expert advice to customers and reliable processing of payments and goods receipt.'
      ],
      ro: [
        'Consultanță clienți și procesare tranzacții: Consiliere expertă a clienților și procesare fiabilă a plăților și recepției mărfurilor.'
      ]
    },
    logo: '/images/germanos.png'
  },
  {
    id: '3',
    company: 'Azali Trading',
    role: {
      de: 'Verkaufsberater',
      en: 'Sales Consultant',
      ro: 'Consultant Vânzări'
    },
    location: 'Bucharest, Romania',
    startDate: '2008-04',
    endDate: '2008-09',
    description: {
      de: [
        'Kundenbetreuung und Kassiertätigkeiten: Beratung der Kunden und verantwortungsvolle Bearbeitung von Zahlungen und Warenannahmen.'
      ],
      en: [
        'Customer service and cashier duties: Customer advice and responsible processing of payments and goods receipt.'
      ],
      ro: [
        'Servicii clienți și funcții de casier: Consiliere clienți și procesare responsabilă a plăților și recepției mărfurilor.'
      ]
    },
    logo: '/images/azali.png'
  },
  {
    id: '2',
    company: 'Exclusiv Fashion Design',
    role: {
      de: 'Filialleiter (eigenes Geschäft - Bekleidungsgeschäft)',
      en: 'Branch Manager (Own Clothing Store)',
      ro: 'Manager Filială (Magazin Propriu de Îmbrăcăminte)'
    },
    location: 'Bucharest, Romania',
    startDate: '2006-03',
    endDate: '2008-04',
    description: {
      de: [
        'Geschäftsführung und Finanzmanagement: Leitung des Bekleidungsgeschäfts, Pflege der Beziehungen zu Banken, Kunden und Lieferanten sowie Sicherstellung einer effizienten Filialversorgung.',
        'Buchhaltung und Gehaltsabrechnung: Verantwortlich für das Rechnungswesen, einschließlich der Erstellung der Gehaltsabrechnungen und Durchführung der Wareninventur.'
      ],
      en: [
        'Business management and financial management: Management of clothing store, maintenance of relationships with banks, customers and suppliers, and ensuring efficient branch supply.',
        'Accounting and payroll: Responsible for accounting, including preparation of payroll and conducting inventory.'
      ],
      ro: [
        'Management afacere și management financiar: Gestionarea magazinului de îmbrăcăminte, menținerea relațiilor cu băncile, clienții și furnizorii și asigurarea aprovizionării eficiente a filialei.',
        'Contabilitate și salarizare: Responsabil pentru contabilitate, inclusiv pregătirea salarizării și efectuarea inventarului.'
      ]
    },
    logo: '/images/exclusiv.png',
    technologies: ['Business Management', 'Accounting', 'Payroll']
  },
  {
    id: '1',
    company: 'SC Onsat IT',
    role: {
      de: 'Buchhalter',
      en: 'Accountant',
      ro: 'Contabil'
    },
    location: 'Bucharest, Romania',
    startDate: '2003-11',
    endDate: '2006-03',
    description: {
      de: [
        'Finanzbuchhaltung: Durchführung der Buchhaltung und Erstellung von Gehaltsabrechnungen für die Mitarbeiter des Unternehmens.',
        'Kunden- und Lieferantenmanagement: Pflege der Geschäftsbeziehungen zu Banken, Kunden und Lieferanten sowie Erstellung von Verkaufs- und Buchhaltungsberichten zur Unterstützung der Geschäftsführung.'
      ],
      en: [
        'Financial accounting: Performing accounting and preparation of payroll for company employees.',
        'Customer and supplier management: Maintaining business relationships with banks, customers and suppliers, as well as creating sales and accounting reports to support management.'
      ],
      ro: [
        'Contabilitate financiară: Efectuarea contabilității și pregătirea salarizării pentru angajații companiei.',
        'Management clienți și furnizori: Menținerea relațiilor comerciale cu băncile, clienții și furnizorii, precum și crearea rapoartelor de vânzări și contabilitate pentru sprijinirea managementului.'
      ]
    },
    logo: '/images/onsat.png',
    technologies: ['Accounting', 'Payroll', 'Financial Reporting']
  }
];

// Helper function to get position by ID
export const getPositionById = (id: string): Position | undefined => {
  return careerPositions.find(pos => pos.id === id);
};

// Helper function to get positions by date range
export const getPositionsByDateRange = (startYear: number, endYear?: number): Position[] => {
  return careerPositions.filter(pos => {
    const posStartYear = parseInt(pos.startDate.split('-')[0]);
    const posEndYear = pos.endDate === 'present' ? new Date().getFullYear() : parseInt(pos.endDate.split('-')[0]);

    if (endYear) {
      return posStartYear <= endYear && posEndYear >= startYear;
    }
    return posStartYear >= startYear;
  });
};
