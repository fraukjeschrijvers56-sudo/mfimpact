import { getDb } from './db';

export function seedData() {
  const db = getDb();

  // Seed legislation data
  const legislationData = [
    {
      naam: 'CSRD (Corporate Sustainability Reporting Directive)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van kracht; Omnibus-aanpassing in behandeling',
      peildatum: '2024-10-01',
      drempels: '>250 medewerkers OF omzet >€50M OF balanstotaal >€25M (gefaseerde invoer vanaf 2024)',
      doorwerking: 'Via ketenrapportages van grote afnemers',
      bronlink: 'https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:32022L2464',
      te_verifieren: 0
    },
    {
      naam: 'VSME (Voluntary SME Standard)',
      type: 'soft law',
      niveau: 'EU',
      status: 'Conceptstandaard beschikbaar',
      peildatum: '2024-10-01',
      drempels: 'Vrijwillig voor MKB (niet-CSRD-plichtig)',
      doorwerking: 'Verwacht door afnemers en banken voor uniforme ESG-informatie',
      bronlink: 'https://www.efrag.org/lab6',
      te_verifieren: 0
    },
    {
      naam: 'CSDDD (Corporate Sustainability Due Diligence Directive)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Aangenomen door EP en Raad, implementatie vanaf 2027',
      peildatum: '2024-05-01',
      drempels: '>1000 medewerkers en omzet >€450M (gefaseerde invoer)',
      doorwerking: 'Due diligence-eisen doorwerken via leveranciersketens',
      bronlink: 'https://www.europarl.europa.eu/doceo/document/TA-9-2024-0201_NL.html',
      te_verifieren: 0
    },
    {
      naam: 'EU Taxonomy',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van kracht',
      peildatum: '2023-01-01',
      drempels: 'CSRD-plichtige bedrijven; indirect via financiers',
      doorwerking: 'Banken en investeerders vragen taxonomy-alignering',
      bronlink: 'https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/eu-taxonomy-sustainable-activities_en',
      te_verifieren: 0
    },
    {
      naam: 'ESPR (Ecodesign for Sustainable Products Regulation)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van kracht, uitwerking per productgroep volgt',
      peildatum: '2024-07-01',
      drempels: 'Afhankelijk van productgroep',
      doorwerking: 'Keten-informatieplicht voor producenten en importeurs',
      bronlink: 'https://eur-lex.europa.eu/eli/reg/2024/1781/oj',
      te_verifieren: 0
    },
    {
      naam: 'EUDR (EU Deforestation Regulation)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van kracht, toepassing uitgesteld tot eind 2025',
      peildatum: '2024-10-01',
      drempels: 'Bedrijven die relevante grondstoffen op EU-markt brengen',
      doorwerking: 'Due diligence-verplichting geldt voor hele keten',
      bronlink: 'https://environment.ec.europa.eu/topics/forests/deforestation/regulation-deforestation-free-products_en',
      te_verifieren: 0
    },
    {
      naam: 'CBAM (Carbon Border Adjustment Mechanism)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Rapportageplicht vanaf okt 2023; heffing vanaf 2026',
      peildatum: '2024-10-01',
      drempels: 'Importeurs van cement, staal, aluminium, meststoffen, elektriciteit, waterstof',
      doorwerking: 'Directe rapportageplicht voor importeurs; CO₂-bewijs van leveranciers nodig',
      bronlink: 'https://taxation-customs.ec.europa.eu/carbon-border-adjustment-mechanism_en',
      te_verifieren: 0
    },
    {
      naam: 'Green Claims Directive / ECGT (Empowering Consumers for Green Transition)',
      type: 'hard law',
      niveau: 'EU',
      status: 'In EU-wetgevingstraject; ECGT deels van kracht',
      peildatum: '2024-10-01',
      drempels: 'Alle bedrijven met milieuclaims richting consumenten',
      doorwerking: 'Substantiërings- en verificatieplicht voor alle groene claims',
      bronlink: 'https://ec.europa.eu/commission/presscorner/detail/en/ip_23_1692',
      te_verifieren: 1
    },
    {
      naam: 'NL Energiebesparingsplicht',
      type: 'hard law',
      niveau: 'NL',
      status: 'Van kracht (Wet milieubeheer art. 2.15)',
      peildatum: '2023-01-01',
      drempels: 'Bedrijven met energieverbruik >50.000 kWh elektriciteit OF >25.000 m³ aardgas per jaar',
      doorwerking: 'Directe plicht; geen indirecte doorwerking',
      bronlink: 'https://www.rvo.nl/onderwerpen/energiebesparingsplicht',
      te_verifieren: 0
    },
    {
      naam: 'NL Informatieplicht energie (energie-audit)',
      type: 'hard law',
      niveau: 'NL',
      status: 'Van kracht (Wet milieubeheer art. 2.15)',
      peildatum: '2023-01-01',
      drempels: 'Bedrijven met energieverbruik >50.000 kWh OF >25.000 m³ aardgas; elke 4 jaar audit',
      doorwerking: 'Directe plicht; grote afnemers kunnen kopieën vragen',
      bronlink: 'https://www.rvo.nl/onderwerpen/energiebesparingsplicht/informatieplicht',
      te_verifieren: 0
    },
    {
      naam: 'WPM (Wet promotie werkgelegenheid en monitoring)',
      type: 'hard law',
      niveau: 'NL',
      status: 'Van kracht',
      peildatum: '2024-01-01',
      drempels: 'Bedrijven met >25 werknemers; rapportage over diversiteit en inclusie',
      doorwerking: 'Afnemers kunnen rapportages opvragen',
      bronlink: 'https://www.rijksoverheid.nl/onderwerpen/gelijke-behandeling-op-werk/diversiteit-en-inclusie-op-de-werkvloer',
      te_verifieren: 1
    },
    {
      naam: 'OESO-richtlijnen voor multinationale ondernemingen',
      type: 'soft law',
      niveau: 'internationaal',
      status: 'Van kracht (IMVO-convenant sectorspecifiek)',
      peildatum: '2023-06-01',
      drempels: 'Geen harde drempel; verwacht van MNO\'s en grote MKB',
      doorwerking: 'Afnemers stellen IMVO-eisen via inkoop; OESO-guidelines referentie',
      bronlink: 'https://www.oesorichtlijnen.nl/',
      te_verifieren: 0
    },
    {
      naam: 'UNGP (UN Guiding Principles on Business and Human Rights)',
      type: 'soft law',
      niveau: 'internationaal',
      status: 'Van kracht',
      peildatum: '2011-06-01',
      drempels: 'Geen harde drempel; internationale referentie voor mensenrechten',
      doorwerking: 'Basis voor IMVO-verwachtingen van afnemers en banken',
      bronlink: 'https://www.ohchr.org/sites/default/files/documents/publications/guidingprinciplesbusinesshr_en.pdf',
      te_verifieren: 0
    },
    {
      naam: 'ISO 26000 (Maatschappelijk verantwoord ondernemen)',
      type: 'soft law',
      niveau: 'internationaal',
      status: 'Van kracht (leidraad, geen certificering)',
      peildatum: '2010-11-01',
      drempels: 'Geen drempel; vrijwillige leidraad voor alle organisaties',
      doorwerking: 'Referentiekader voor MVO-beleid; genoemd in aanbestedingen',
      bronlink: 'https://www.iso.org/iso-26000-social-responsibility.html',
      te_verifieren: 0
    },
    {
      naam: 'ISO 14001 (Milieumanagementsysteem)',
      type: 'soft law',
      niveau: 'internationaal',
      status: 'Van kracht (certificeerbare norm)',
      peildatum: '2015-09-01',
      drempels: 'Geen drempel; certificering op vrijwillige basis',
      doorwerking: 'Vaak gevraagd door afnemers en in aanbestedingen',
      bronlink: 'https://www.iso.org/iso-14001-environmental-management.html',
      te_verifieren: 0
    },
    {
      naam: 'CO₂-Prestatieladder',
      type: 'soft law',
      niveau: 'NL',
      status: 'Van kracht (certificeringssysteem)',
      peildatum: '2024-01-01',
      drempels: 'Geen drempel; certificering niveau 1-5 op vrijwillige basis',
      doorwerking: 'Voorwaarde of voordeel bij publieke aanbestedingen',
      bronlink: 'https://www.skao.nl/co2-prestatieladder',
      te_verifieren: 0
    }
  ];

  const insertLegislation = db.prepare(`
    INSERT OR REPLACE INTO legislation (naam, type, niveau, status, peildatum, drempels, doorwerking, bronlink, te_verifieren)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of legislationData) {
    insertLegislation.run(
      item.naam,
      item.type,
      item.niveau,
      item.status,
      item.peildatum,
      item.drempels,
      item.doorwerking,
      item.bronlink,
      item.te_verifieren
    );
  }

  // Seed demo client
  const existingClient = db.prepare('SELECT id FROM clients WHERE naam = ?').get('VOORBEELDDATA - Duurzame Bouw BV');
  
  if (!existingClient) {
    const insertClient = db.prepare(`
      INSERT INTO clients (naam, kvk, sector, aantal_medewerkers, omzet, balanstotaal, afnemers, banken, tenders)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertClient.run(
      'VOORBEELDDATA - Duurzame Bouw BV',
      '12345678',
      'Bouw en installatie',
      45,
      3500000,
      1200000,
      'Woningbouwcorporaties, Gemeenten, Projectontwikkelaars',
      'ING, Triodos Bank',
      'Gemeente Amsterdam, Rijkswaterstaat'
    );

    const clientId = result.lastInsertRowid;

    // Add status for each step
    const insertStatus = db.prepare(`
      INSERT INTO client_status (client_id, stap, status, notitie)
      VALUES (?, ?, ?, ?)
    `);

    insertStatus.run(clientId, 'scan', 'voltooid', 'Scan uitgevoerd op 2024-09-15');
    insertStatus.run(clientId, 'gatanalyse', 'in-behandeling', 'Analyse lopend');
    insertStatus.run(clientId, 'bewijspakket', 'nog-niet-gestart', null);
    insertStatus.run(clientId, 'claimcheck', 'nog-niet-gestart', null);
    insertStatus.run(clientId, 'jaarlijkse-update', 'nog-niet-gestart', null);

    // Add some evidence items
    const insertEvidence = db.prepare(`
      INSERT INTO evidence_items (client_id, titel, type, link_notitie, datum, geldig_tot)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertEvidence.run(
      clientId,
      'ISO 14001 certificaat',
      'Certificaat',
      'https://example.com/iso14001-cert',
      '2023-06-01',
      '2026-06-01'
    );

    insertEvidence.run(
      clientId,
      'Energie-audit rapport 2023',
      'Rapport',
      'Opgeslagen in Teams folder',
      '2023-11-20',
      '2027-11-20'
    );

    insertEvidence.run(
      clientId,
      'CO₂-footprint berekening',
      'Berekening',
      'Scope 1+2 compleet, Scope 3 deels',
      '2024-01-15',
      null
    );

    // Add some scan answers
    const insertAnswer = db.prepare(`
      INSERT INTO scan_answers (client_id, category, question_key, answer)
      VALUES (?, ?, ?, ?)
    `);

    insertAnswer.run(clientId, 'marktvraag', 'vsme_gevraagd', 'ja');
    insertAnswer.run(clientId, 'marktvraag', 'co2_footprint_gevraagd', 'ja');
    insertAnswer.run(clientId, 'marktvraag', 'iso14001_gevraagd', 'ja');
    insertAnswer.run(clientId, 'operationeel', 'energie_monitoring', 'ja');
    insertAnswer.run(clientId, 'operationeel', 'co2_scope1_2', 'ja');
    insertAnswer.run(clientId, 'operationeel', 'co2_scope3', 'deels');
    insertAnswer.run(clientId, 'operationeel', 'afval_scheiding', 'ja');

    // Add some gap items
    const insertGap = db.prepare(`
      INSERT INTO gap_items (client_id, gap_title, priority, suggested_evidence, status)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertGap.run(
      clientId,
      'Scope 3 CO₂-berekening niet volledig',
      'hoog',
      'Volledige Scope 3 screening volgens GHG Protocol; leveranciersdata opvragen',
      'open'
    );

    insertGap.run(
      clientId,
      'Gedragscode leveranciers ontbreekt',
      'middel',
      'Opstellen leveranciersgedragscode conform OESO-richtlijnen',
      'open'
    );

    insertGap.run(
      clientId,
      'Diversiteitsrapportage WPM niet opgesteld',
      'laag',
      'WPM-rapportage opstellen (>25 medewerkers)',
      'open'
    );
  }

  console.log('Database seeded successfully');
}
