import { getDb } from './db';

export function seedData() {
  const db = getDb();

  // Seed legislation data
  const legislationData = [
    {
      naam: 'CSRD (Corporate Sustainability Reporting Directive)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van kracht na Omnibus I (EU) 2026/470, in werking 18-03-2026; NL-implementatie 36 678 nog in behandeling',
      peildatum: '2026-10-20',
      drempels: '>1000 werknemers én netto-omzet >€450 mln (2013/34/EU art. 19 bis / 29 bis)',
      doorwerking: 'Via ketenrapportages van grote afnemers; value-chain cap ≤1000 FTE (VSME)',
      bronlink: 'https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:02013L0034-20260318#art_19a',
      te_verifieren: 0
    },
    {
      naam: 'VSME (Voluntary SME Standard)',
      type: 'soft law',
      niveau: 'EU',
      status: 'Aanbeveling (EU) 2025/1710; gedelegeerde standaard (EU) 2026/1560 vanaf boekjaar 2027',
      peildatum: '2026-10-20',
      drempels: 'Vrijwillig voor MKB (niet-CSRD-plichtig); value-chain cap beschermt ≤1000 werknemers',
      doorwerking: 'Verwacht door afnemers en banken voor uniforme ESG-informatie',
      bronlink: 'https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:32025H1710#anx_I',
      te_verifieren: 0
    },
    {
      naam: 'CSDDD (Corporate Sustainability Due Diligence Directive)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van kracht na Omnibus I; toepassing vanaf 26-07-2029',
      peildatum: '2026-10-20',
      drempels: '>5000 werknemers én netto-omzet >€1,5 mrd (art. 2 lid 1)',
      doorwerking: 'Due diligence-eisen doorwerken via leveranciersketens',
      bronlink: 'https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:02024L1760-20260318#art_2',
      te_verifieren: 0
    },
    {
      naam: 'EU Taxonomy',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van kracht; art. 8 volgt CSRD-scope na Omnibus I',
      peildatum: '2026-10-20',
      drempels: 'CSRD-plichtigen (>1000 werknemers én >€450 mln) via art. 8 Taxonomieverordening',
      doorwerking: 'Banken en investeerders vragen taxonomy-alignering',
      bronlink: 'https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:32020R0852#art_8',
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
      status: 'Van toepassing 30-12-2026; micro en klein 30-06-2027',
      peildatum: '2026-10-20',
      drempels: 'Relevante grondstoffen/producten (bijlage I): rund, cacao, koffie, oliepalm, rubber, soja, hout',
      doorwerking: 'Due diligence-verplichting geldt voor hele keten',
      bronlink: 'https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:02023R1115-20260918#art_38',
      te_verifieren: 0
    },
    {
      naam: 'CBAM (Carbon Border Adjustment Mechanism)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Definitief regime 2026; eerste jaarlijkse aangifte 30-09-2027',
      peildatum: '2026-10-20',
      drempels: '50 ton nettomassa per jaar (art. 2 bis + bijlage VII); cement, staal, aluminium, meststoffen, elektriciteit, waterstof',
      doorwerking: 'Directe rapportageplicht voor importeurs; CO₂-bewijs van leveranciers nodig',
      bronlink: 'https://eur-lex.europa.eu/legal-content/NL/TXT/?uri=CELEX:02023R0956-20251020#art_2a',
      te_verifieren: 0
    },
    {
      naam: 'Green Claims Directive / ECGT (Empowering Consumers for Green Transition)',
      type: 'hard law',
      niveau: 'EU',
      status: 'Van toepassing vanaf 27-09-2026 (Richtlijn 2024/825; NL BW 6:193g)',
      peildatum: '2026-10-20',
      drempels: 'B2C-milieuclaims; Green Claims Directive is geen grondslag',
      doorwerking: 'Substantiërings- en verificatieplicht voor groene claims richting consumenten',
      bronlink: 'https://wetten.overheid.nl/BWBR0005289/#Boek6_Titeldeel3_Afdeling3A_Artikel193g',
      te_verifieren: 0
    },
    {
      naam: 'NL Energiebesparingsplicht',
      type: 'hard law',
      niveau: 'NL',
      status: 'Van kracht (Bal art. 5.15)',
      peildatum: '2026-10-20',
      drempels: '≥50.000 kWh elektriciteit of ≥25.000 m³ aardgasequivalent (Bal art. 5.15); informatieplicht art. 5.15a (volgende ronde 1-12-2027); onderzoeksplicht art. 5.15b',
      doorwerking: 'Directe plicht; geen indirecte doorwerking',
      bronlink: 'https://wetten.overheid.nl/BWBR0041330/#Hoofdstuk5_Afdeling5.4_Paragraaf5.4.1_Artikel5.15',
      te_verifieren: 0
    },
    {
      naam: 'NL Informatieplicht energie (energie-audit)',
      type: 'hard law',
      niveau: 'NL',
      status: 'Van kracht (Bal art. 5.15a)',
      peildatum: '2026-10-20',
      drempels: 'Zelfde ondergrens als art. 5.15; eens per 4 jaar, volgende ronde 1-12-2027',
      doorwerking: 'Directe plicht; grote afnemers kunnen kopieën vragen',
      bronlink: 'https://wetten.overheid.nl/BWBR0041330/#Hoofdstuk5_Afdeling5.4_Paragraaf5.4.1_Artikel5.15a',
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
      status: 'Norm, geen wet (SKAO Handboek 4.0)',
      peildatum: '2026-10-20',
      drempels: 'Geen wettelijke drempel; gunningscriterium bij aanbestedingen',
      doorwerking: 'Voorwaarde of voordeel bij publieke aanbestedingen',
      bronlink: 'https://www.co2-prestatieladder.nl/app/uploads/2025/01/Trede-1-print.pdf',
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
