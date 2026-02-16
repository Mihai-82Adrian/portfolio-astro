# Research Perplexity - Planificare servicii

## 1. Limite legale StBerG – ce este permis și ce este interzis

### 1.1. Baza legală relevantă

- § 1 StBerG definește „Hilfeleistung in Steuersachen” ca fiind, între altele, asistența la conducerea registrelor și întocmirea situațiilor care sunt relevante pentru impozitare.[^2]
- § 3, 3a și 4 StBerG stabilesc cine are dreptul nelimitat sau limitat să acorde astfel de servicii (Steuerberater, RA, WP etc.).[^2]
- § 5 StBerG conține interdicția generală pentru toate celelalte persoane de a acorda, în mod profesional, ajutor sau consultanță în materie fiscală.[^3][^2]
- § 6 Nr. 3 și 4 StBerG prevăd însă excepții importante („Buchführungsprivileg”), inclusiv pentru „Durchführung mechanischer Arbeitsgänge” și „Buchen laufender Geschäftsvorfälle, laufende Lohnabrechnung și Lohnsteuer‑Anmeldungen” pentru persoane cu calificare comercială și experiență de cel puțin 3 ani în Buchhaltung (≥16h/săptămână).[^7][^1][^3]

Camera de Comerț (ex. IHK Chemnitz) explică explicit că activitățile de la Nr. 3 sunt permise oricui (operațiuni mecanice), iar cele de la Nr. 4 doar persoanelor calificate menționate, dar toate rămân strict delimitate de Steuerberatung.[^8]

### 1.2. Servicii permise ca freelancer Finanzbuchhalter (§ 6 Nr. 3 și 4 StBerG)

Pe baza textului § 6 și a interpretărilor IHK / profesioniști bucătari de contabilitate, lista de activități pe care le poți oferi ca serviciu independent este, în esență, următoarea:[^1][^3][^8][^2]

**A. Activități tehnico‑contabile / „mechanische Arbeitsgänge” (Nr. 3)**
(permise tuturor, inclusiv fără calificare formală)

- Preluarea mecanică a documentelor: scanare, sortare, indexare, digitizare, upload în sisteme DMS / cloud accounting.[^3][^1]
- Introducerea mecanică a datelor pe baza documentelor deja contate (verbuchen kontierter Belege) – nu decizi tu contarea, ci doar implementezi instrucțiunile.[^1][^3]
- Generarea de liste standard din sistem (jurnale, registre, exporturi CSV/DATEV) fără interpretare fiscală.[^3][^1]

**B. „Buchen laufender Geschäftsvorfälle” (Nr. 4) – cu calificarea ta este explicit permis**

Conform § 6 Nr. 4 StBerG, persoanele cu examen comercial + min. 3 ani practică în Buchhaltung (≥16h/săptămână) pot, în mod profesional:[^7][^1][^3]

- Contarea și înregistrarea curentă a tranzacțiilor (Fibu laufend): vânzări, achiziții, plăți, mișcări bancare, casă, inclusiv emiterea de instrucțiuni de contabilizare (Buchungsanweisungen).[^7][^1][^3]
- Întreținerea registrelor auxiliare: evidența clienților și furnizorilor (Offene‑Posten‑Listen), reconcilierea cu extrasele bancare.[^1][^3]
- Pregătirea și actualizarea fișelor de imobilizări (în măsura în care nu faci tu decizii de amortizare fiscală, ci implementezi parametrii dați de Steuerberater sau de client).[^8]

**C. Lohnbuchhaltung curentă (Nr. 4)**

Tot § 6 Nr. 4 îți permite explicit:[^3][^1]

- Calculul și procesarea lunară a salariilor și onorariilor (laufende Lohn- und Gehaltsabrechnung), inclusiv exporturi SEPA, fișiere bancare etc.
- Pregătirea și transmiterea Lohnsteuer‑Anmeldungen (în practică prin software certificat / interfață ELSTER), atâta timp cât rămâi la aplicația tehnică a regulilor și nu dai consultanță fiscală individualizată.[^1][^3]
- Gestionarea curentă a datelor de personal relevante pentru salarizare (intrări/ieșiri, modificări de salariu, clase de asigurări, dar fără a „sfătui” ce este „optim fiscal” pentru angajat sau angajator).[^8]

**D. Consultanță pur economică (nu intră sub StBerG)**

Textele explicative subliniază că „reine betriebswirtschaftliche Organisationsberatung”, precum alegerea sistemului de contabilitate sau organizarea fluxului de documente, nu intră sub StBerG.[^8][^1]
Aici se încadrează o mare parte din poziționarea ta „CFO meets CTO”, atâta timp cât delimitezi clar sfera fiscală:

- Consultanță de organizare pentru procesele contabile și de payroll: alegerea software‑ului (DATEV‑Schnittstellen, Lexoffice, sevdesk, HR/Payroll SaaS), design de workflow „scan → OCR → booking → reporting”.[^8][^1]
- Digitalizare și automatizare: implementare de integrații API, RPA/AI pentru captură de facturi, arhivare GoBD‑ready (fără a promite „Steuerberatung durch KI”).[^9][^1]
- Controlling și business planning:
    - bugete și forecast P\&L / cashflow,
    - runway calc pentru startup‑uri,
    - KPI dashboards (MRR, Churn, CAC, LTV), rapoarte lunare către fondatori/investitori,
atâta timp cât nu ești tu cel care determină tratamentul fiscal sau calculezi explicit impozite.[^8]
- „CFO‑as‑a‑Service” în sens de suport managerial: board packs, scenarii de finanțare, pregătire dataroom pentru investitori, structurare de rapoarte – nu redactarea sau semnarea de Steuererklärungen.

În practică, multe birouri de „Buchhaltung gem. § 6 StBerG” formulează serviciile exact astfel: „Buchen lfd. Geschäftsvorfälle \& lfd. Lohn- und Gehaltsabrechnungen – keine Steuer- und/oder Rechtsberatung”.[^2][^3]

### 1.3. Servicii strict interzise (rezervate Steuerberaterilor)

Conform § 5 StBerG (interdicția generală) și interpretărilor profesionale, următoarele activități sunt rezervate exclusiv Steuerberaterilor / RA / WP etc. și NU le poți oferi ca freelancer independent:[^2][^3][^8]

- **Înființarea sistemului de contabilitate în sens fiscal**:
    - proiectarea și aprobarea planului de conturi (Kontenplan) pentru scopuri fiscale,
    - definirea schemelor de amortizare și a tratamentului fiscal pentru active.[^3]
- **Întocmirea Jahresabschluss / EÜR pentru scopuri fiscale**:
    - bilanț, cont de profit și pierdere, Anhang, Lagebericht,
    - EÜR oficială pentru Finanzamt, inclusiv semnătura / responsabilitatea pentru conținut.[^2][^3]
- **Toate tipurile de Steuererklärungen pentru client**:
    - Einkommensteuer, Körperschaftsteuer, Gewerbesteuer, Umsatzsteuer (Voranmeldung + Jahreserklärung), Lohnsteuerjahresausgleich etc.[^2]
- **Consultanță fiscală individualizată / optimizare fiscală**:
    - alegerea formei juridice „optim fiscală” (Einzelunternehmen vs. GmbH vs. UG etc.),
    - recomandări privind distribuirea dividendelor vs. salariu,
    - sfaturi privind tratamentul fiscal al beneficiilor salariale, al mașinii de serviciu, al stock‑options etc.[^2][^8]
- **Reprezentarea clientului în fața autorităților fiscale**:
    - depunerea și argumentarea Einsprüchen,
    - corespondență juridică cu Finanzamt în numele clientului.[^2]
- **Servicii de natură juridică (Rechtsdienstleistungen)** care depășesc caracterul accesoriu față de consultanța economică.[^2]
- **Folosirea termenilor protejați** în marketing („Steuerberater”, „Steuerberatung”, „Steuerkanzlei” etc.) sau promisiuni de tip „vollumfängliche steuerliche Betreuung”.[^3][^2]

Este de asemenea riscant să oferi: „Beratung bei der Gestaltung von Verträgen mit steuerlicher Relevanz”, „Begleitung bei Betriebsprüfungen” sau „individuelle Gestaltung von Lohnsteueroptimierungsmodellen”; acestea intră rapid în zona de Steuerberatung interzisă.[^8][^2]

### 1.4. Recomandări concrete de formulări pe site (secțiunea „Services”)

Pe pagina ta de servicii în germană, structura legal‑safe ar trebui să conțină:

- Un **„Tätigkeitshinweis”** clar, inspirat de formulările folosite de birouri conforme StBerG:[^3][^2]
    - „Unsere Dienstleistung im Bereich Buchhaltung/Finanzbuchführung umfasst gemäß § 6 Nr. 3 und Nr. 4 StBerG ausschließlich das Buchen laufender Geschäftsvorfälle sowie die laufende Lohn- und Gehaltsabrechnung. Es erfolgt ausdrücklich keine Steuer- und/oder Rechtsberatung.”
- O separare vizuală clară între:
    - „Buchhaltung \& Lohn gem. § 6 StBerG” (servicii reglementate), și
    - „Betriebswirtschaftliche Beratung, Controlling \& Digitalisierungsberatung” (clar marcate ca „keine Steuerberatung”).[^1][^8]
- Fără mențiuni de „Steueroptimierung”, „Steuerstrategie”, „tax planning” în descrierile serviciilor tale – folosește în schimb „Liquiditätsplanung”, „Budgetierung”, „KPI‑Controlling” etc.

***

## 2. Pachete \& prețuri pentru servicii financiare (Startups / KMU)

### 2.1. Context de piață – unde te poziționezi

Datele agregate pentru freelanceri în Germania arată:

- Freelanceri în „Beratung \& Management” facturează, în medie, circa 118 €/oră (interval tipic 95–142 €/h), conform ultimului Freelancer‑Kompass citat de Norman Finance.[^6]
- Freelanceri în „Entwicklung / Tech / Daten” sunt în jur de 100 €/oră (interval 80–120 €/h).[^6]
- Exemple concrete de proiecte de Bilanzbuchhalter cu DATEV 100% remote se plătesc în jur de 60 €/oră pentru activități de Einbuchungen / Jahresabschluss‑Support.[^5]
- Ghidurile de calcul al tarifului orar pentru freelanceri (ex. Lambert Schuster) ajung, chiar pentru un profil generic de servicii, la ≈ 78 €/h net ca nivel minim sănătos, fără a include premium‑ul pentru expertiză de nișă.[^4]

Având profil „CFO meets CTO” cu specializare contabilitate germană, payroll, HR Tech și AI/edge‑architecture, poziționarea firească este în jumătatea superioară a acestor intervale, cu un echivalent orar ţintă de **≈ 100–140 €/h** pentru pachetele consultative și **≈ 70–100 €/h** efectiv pentru munca de Fibu/Lohn recurentă, vândută însă ca pachet, nu ca „Stundensatz”.[^5][^4][^6]

### 2.2. Propunere de pachete financiare premium

#### Tabel – Pachete servicii financiare (orientativ, EUR, orientate pe Germania)

| Pachet | Țintă principală | Conținut cheie | Frecvență | Tarif orientativ (net) |
| :-- | :-- | :-- | :-- | :-- |
| Startup Financial Setup | Startup pre‑seed / seed (0–15 FTE) | Setup procese digitale de Fibu \& Lohn, selecție și configurare tool‑uri, modele de planificare | One‑off (2–4 săpt.) | 2.000–3.500 € |
| Digital Accounting Optimization | KMU / scale‑up (15–100 FTE) | Audit procese, optimizare flux documente, KPI dashboards, training echipă | One‑off + opțional retainer | 3.000–6.000 € |
| CFO‑as‑a‑Service (Remote) | Startup VC‑backed / scale‑up | Board pack lunar, runway \& scenarii, suport fundraising, coordonare cu Steuerberater | Retainer lunar (min. 3–6 luni) | 2.500–4.000 €/lună |

*(intervalele țin cont de piața germană, remote din Berlin, poziționat premium față de birouri clasice de Buchhaltung)*.[^4][^5][^6]

#### A. „Startup Financial Setup” (2–4 săptămâni)

Scop: să aduci un startup haotic (Excel + Dropbox) într-un setup „investor‑ready” și „GoBD‑ready”, fără să intri în Steuerberatung.[^1][^8]

Conținut tipic:

- Alegerea platformei contabile și de payroll, împreună cu fondatorul și Steuerberaterul acestuia (dacă există):
    - ex. lexoffice/Sevdesk + interfață DATEV Unternehmen Online, HR software pentru Lohn.[^3][^8]
- Design de flux:
    - inbound facturi (scanner/OCR → inbox → contare → booking),
    - carduri corporate, note de cheltuieli, aprobări,
    - arhivare respectând GoBD (fără a face tu interpretare juridică, ci implementând cerințele tehnice).[^10][^1]
- Modele standard:
    - template buget anual + runway,
    - șabloane pentru rapoarte lunare (P\&L simplificat, cashflow, KPIs),
    - documentație pentru echipă („how‑to send invoices/receipts”).

Recomandare de preț: **2.000–3.500 €** per proiect, în funcție de complexitate (număr de entități, monede, tool‑uri).[^6][^4]

#### B. „Digital Accounting Process Optimization” (3–6 săptămâni)

Țintă: KMU sau scale‑up cu procese deja existente, dar fragmentate (DATEV + Excel + e‑mail).[^8][^3]

Conținut:

- Analiză end‑to‑end a fluxurilor Fibu \& Lohn: timp de procesare, erori, latență raportare.
- Propuneri și implementare:
    - automatizări (bank feeds, importuri automate, OCR),
    - standardizare de coduri cost/centre,
    - introducere de dashboards (Metabase, Superset, Notion + embed).
- Training pentru echipa internă + handover documentat.

Recomandare: pachet fix **3.000–6.000 €**, în funcție de numărul de locații, entități, tool‑uri și dacă incluzi sau nu AI‑based document routing.[^4][^6]

#### C. „CFO‑as‑a‑Service (Remote)” – pachet recurent

Țintă: startup cu finanțare (sau în curs) care are deja Steuerberater și birou de Lohn, dar nu are CFO intern.

Conținut permis (strict BWL, nu Steuerberatung):[^1][^8]

- Board pack lunar:
    - P\&L / cashflow, vs buget, KPIs relevante (MRR, NRR, CAC, Burn Multiple).
- Runway \& scenario modeling (best/base/worst case), cu accent pe decizii operaționale (angajări, marketing spend, runway extension).
- Suport fundraising:
    - modele financiare pentru deck,
    - sanity‑check pentru term sheet în plan economic (nu juridic/fiscal),
    - coordonare cu Steuerberater și avocatul firmei.
- Implementarea de instrumente digitale: shared dashboards, date‑warehouse light pentru finanțe.

Recomandare: retainer **2.500–4.000 €/lună**, livrate tipic ca 0,5–1 zi/săptămână echivalent, ajustat la complexitate și la faptul că vii cu know‑how combinat finance + tech + HR/payroll.[^5][^6]

***

## 3. Pachete \& prețuri pentru „AI‑Powered Professional Hubs”

### 3.1. Context de piață – AI‑integrated web în DACH

Datele de preț directe pentru „Astro + Tailwind + Cloudflare + RAG chatbot” sunt încă limitate, dar se pot extrapola din:

- Benchmark‑urile de zi/oră pentru freelanceri IT/Dev senior (≈ 80–120 €/h în Germania).[^6]
- Faptul că soluțiile enterprise de RAG (AWS Kendra, Azure AI Search) pot ajunge la mii €/lună, în timp ce stack‑uri moderne ca Cloudflare AI Search permit implementări producție cu costuri de infrastructură foarte mici, astfel încât cea mai mare parte a valorii este munca de arhitectură și implementare.[^11][^9]
- Exemple publice de portofolii cu asistenți RAG custom (de ex. site‑uri personale cu RAG chatbot pe propriul conținut) confirmă că acest tip de produs devine standard pentru senior devs și consultanți, nu „nice‑to‑have”.[^12][^13][^14]

Pentru un solo developer senior în DACH cu profilul tău, un preț proiect‑based de **≈ 4.000–12.000 €** pentru hub‑uri AI complexe este perfect aliniat cu piața consultanței tech de senior level, mai ales cu timeline de 2–4 săptămâni per proiect.[^6]

### 3.2. Tabel – Pachete „AI‑Powered Professional Hubs”

| Tier | Profil client țintă | Conținut principal | Durată tipică | Tarif orientativ (net) |
| :-- | :-- | :-- | :-- | :-- |
| Tier 1 – Base Astro Portfolio | Senior dev / consultant fără AI încă | Site static/dinamic light în Astro, design custom, SEO + performanță, hosting Cloudflare inclus | ≈ 2 săpt. | 2.000–3.500 € |
| Tier 2 – Pro + RAG Career Copilot | Senior specialist / manager | Tot Tier 1 + chatbot RAG pe CV, JD‑uri, studii de caz, Q\&A inteligent pentru recrutori și clienți | 3–4 săpt. | 5.000–8.000 € |
| Tier 3 – Executive AI Branding Hub | C‑level / expert de top, autor, speaker | Hub multicanal (blog, newsletter, lead funnels) + RAG extins, analytics, A/B‑testing, retainer update conținut | 4 săpt. + retainer | 8.000–15.000 € + 500–1.500 €/lună |

*(Intervalele sunt construite pe baza rate‑lor orare tipice IT/consulting în DACH și a costurilor reduse de infrastructură pentru RAG pe Cloudflare / stack‑uri similare.)*[^11][^9][^6]

### 3.3. Detaliere Tiers – ce vinzi exact

#### Tier 1 – „Static Premium Astro Portfolio” (2.000–3.500 €)

Poziționare: „Site‑ul pe care îl meriți ca expert high‑end, nu un WordPress template.”

Conținut recomandat:

- Arhitectură: Astro 5/6, Tailwind v4, deployment pe Cloudflare Pages / Workers pentru time‑to‑first‑byte minim.[^9]
- Secțiuni:
    - Above‑the‑fold foarte clar („CFO meets CTO for DACH SaaS/Payroll”),
    - About cu proof of expertise (certificări, proiecte),
    - Services (pachetele din secțiunea financiară),
    - Case studies,
    - Contact / calendly.
- Optimizări tehnice: performance 90+ Lighthouse, best‑practices SEO, Open Graph, tracking minimalist orientat pe privacy (plauzible/matomo).

Model de preț: fix, cu 1–2 runde de revizuiri incluse; orice extra (ex. multi‑language, blog engine) se facturează ca addon.[^6]

#### Tier 2 – „Portfolio + Custom RAG AI Chatbot” (5.000–8.000 €)

Poziționare: „Career/Expert Copilot” – un chatbot care:

- Citește CV‑ul, JD‑urile furnizate, portofoliul, postări de blog și Q\&A anterioare.[^13][^12]
- Poate răspunde:
    - „Cât de potrivit este acest candidat pentru rolul X?”
    - „Ce studii de caz să trimit pentru acest client?”
    - „Cum aș prezenta experiența mea în payroll pentru un rol de Head of People Tech?”

Stack propus:

- Frontend: Astro + UI chat custom (Tailwind, componente personalizate).[^14]
- Backend: Cloudflare Workers + AI Search (sau vector DB managed), pipeline RAG (chunking, embeddings, retrieval).[^11][^9]

Structura de preț (de exemplu):

- Setup inițial (design, implementare, ingest CV + 5–10 documente cheie): **~5.000–6.000 €**.
- Extensii (multi‑lingual, analytics, roluri diferite de user) duc spre **7.000–8.000 €**.[^6]


#### Tier 3 – „Executive AI Branding Hub” (8.000–15.000 € + retainer)

Țintă: C‑level / experți de top din DACH (CFO, CTO, Founders, Autoren) care vor un ecosistem complet:

Conținut:

- Tot ce este în Tier 2, plus:
    - Integrare newsletter (Buttondown, Mailerlite), lead funnels, pagini pentru keynote‑uri, workshop‑uri.
    - Corpus AI extins: cărți albe, prezentări, transcrieri de podcast, articole media; segmentare pe „audiențe” (investitori, clienți enterprise, HR, presă).[^12][^13]
    - Analytics avansat: ce întrebări pun utilizatorii, ce conținut lipsește, heatmaps de content.
- Retainer 6–12 luni pentru:
    - update continuu al corpusului RAG (upload proiecte noi, fine‑tuning prompt templates),
    - mici îmbunătățiri UX, patch‑uri de securitate, alignment la schimbările Cloudflare / LLM APIs.[^9][^11]

Structură financiară:

- Proiect inițial: **8.000–15.000 €** în funcție de numărul de secțiuni, limbi, surse de conținut.
- Retainer: **500–1.500 €/lună** (include X ore de muncă + SLA de răspuns).[^6]

***

## 4. Cum să legi totul într‑un „Services” page coerent

Pentru a ancora brandul „CFO meets CTO” și a minimiza riscul legal:

- Structură de top‑level clară:
    - „Buchhaltung \& Lohn (gem. § 6 StBerG)” – cu lista serviciilor permise (Buchen lfd. Geschäftsvorfälle, laufende Lohnabrechnung, LSt‑Anmeldungen) + Tätigkeitshinweis.[^1][^3][^2]
    - „Controlling, CFO‑Advisory \& Business Planning (keine Steuerberatung)” – cu pachetele Startup Setup, Process Optimization, CFO‑as‑a‑Service.[^8]
    - „AI‑Powered Professional Hubs (Astro / Cloudflare / RAG Chatbots)” – cu cele 3 tiers, clar poziționate ca servicii tech/branding, nu ca consultanță juridico‑fiscală.[^14][^11][^9]
- La toate pachetele financiare, notează explicit: „Die steuerliche Beratung und Erstellung von Jahresabschlüssen/Steuererklärungen erfolgt durch den Steuerberater des Mandanten.”[^3][^2]
- La toate pachetele AI, evită formulări de tip „ersetzt Ihren Steuerberater / Rechtsanwalt”; în schimb, poziționează chatbot‑urile ca „Knowledge Interface” peste conținutul clientului, cu disclaimere clare.[^12][^11]

Astfel, îți maximizezi ARPU pe client (finanțe + tech + AI) și rămâi în același timp bine în interiorul gardurilor de protecție trasate de StBerG și practicile standard IHK / bresle profesionale.[^1][^3][^8]
<span style="display:none">[^15][^16][^17][^18]</span>

<div align="center">⁂</div>

[^1]: http://www.tallaros.de/.cm4all/uproc.php/0/Was besagt der.pdf?_=1766b87cb8a\&cdp=a

[^2]: https://agendabos.de/taetigkeitshinweis/

[^3]: https://www.mcdata.de/buchhaltung-buchfuehrung-muenster/buchfuehrung_lohnabrechnung__gemaess____6_stberg/

[^4]: https://lambertschuster.de/existenzgruender/stundensatz-kalkulation-fuer-selbstaendige-und-freiberufler/

[^5]: https://www.freelancermap.de/projekt/100-prozent-remote-bilanzbuchhalter-m-w-d-fuer-einbuchungen-in-datev-jahresabschluss

[^6]: https://norman.finance/de/blog/freiberufler-wie-viel-verdienen

[^7]: http://www.bilanzxpert.com/StBerG/3_4_StBerG.htm

[^8]: https://www.ihk.de/chemnitz/recht-und-steuern/rechtsinformationen/gewerberecht/nach-branchen/dienstleister/merkblatt-buchfuehrungshilfe-4777532

[^9]: https://workers.cloudflare.com/solutions/ai

[^10]: https://www.perplexity.ai/search/c495277d-d757-43a2-9973-505060f55871

[^11]: https://davidloor.com/en/blog/adding-your-own-ai-assistant-to-your-website-without-enterprise-costs

[^12]: https://neon.com/guides/react-fastapi-rag-portfolio

[^13]: https://github.com/nickberens360/nickberens-astro

[^14]: https://astro.build/themes/10/

[^15]: https://zenodo.org/record/2155807/files/article.pdf

[^16]: https://www.transcript-open.de/doi/10.14361/9783839461037-002

[^17]: https://likvi.de/freelancer-stundensatzrechner

[^18]: https://www.reddit.com/r/Bookkeeping/comments/bhpg2r/selfemployed_bookkeepersaccountants_how_much_do/
