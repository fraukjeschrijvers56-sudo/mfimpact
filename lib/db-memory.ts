// In-memory database fallback for Vercel serverless deployment
import { Client, ClientStatus, EvidenceItem, ScanAnswer, GapItem, Legislation, ClaimCheck } from './db-types';

interface MemoryStore {
  clients: Map<number, Client & { id: number }>;
  clientStatus: Map<number, ClientStatus & { id: number }>;
  evidenceItems: Map<number, EvidenceItem & { id: number }>;
  scanAnswers: Map<number, ScanAnswer & { id: number }>;
  gapItems: Map<number, GapItem & { id: number }>;
  legislation: Map<number, Legislation & { id: number }>;
  claimChecks: Map<number, ClaimCheck & { id: number }>;
  nextId: {
    clients: number;
    clientStatus: number;
    evidenceItems: number;
    scanAnswers: number;
    gapItems: number;
    legislation: number;
    claimChecks: number;
  };
}

let memoryStore: MemoryStore | null = null;

function getMemoryStore(): MemoryStore {
  if (!memoryStore) {
    memoryStore = {
      clients: new Map(),
      clientStatus: new Map(),
      evidenceItems: new Map(),
      scanAnswers: new Map(),
      gapItems: new Map(),
      legislation: new Map(),
      claimChecks: new Map(),
      nextId: {
        clients: 1,
        clientStatus: 1,
        evidenceItems: 1,
        scanAnswers: 1,
        gapItems: 1,
        legislation: 1,
        claimChecks: 1,
      },
    };
    seedMemoryData();
  }
  return memoryStore;
}

function seedMemoryData() {
  const store = memoryStore!;
  
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

  legislationData.forEach((item) => {
    const id = store.nextId.legislation++;
    store.legislation.set(id, {
      id,
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // Seed demo client
  const clientId = store.nextId.clients++;
  store.clients.set(clientId, {
    id: clientId,
    naam: 'VOORBEELDDATA - Duurzame Bouw BV',
    kvk: '12345678',
    sector: 'Bouw en installatie',
    aantal_medewerkers: 45,
    omzet: 3500000,
    balanstotaal: 1200000,
    afnemers: 'Woningbouwcorporaties, Gemeenten, Projectontwikkelaars',
    banken: 'ING, Triodos Bank',
    tenders: 'Gemeente Amsterdam, Rijkswaterstaat',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Add status for each step
  const steps = ['scan', 'gatanalyse', 'bewijspakket', 'claimcheck', 'jaarlijkse-update'];
  const statusData = [
    { stap: 'scan', status: 'voltooid', notitie: 'Scan uitgevoerd op 2024-09-15' },
    { stap: 'gatanalyse', status: 'in-behandeling', notitie: 'Analyse lopend' },
    { stap: 'bewijspakket', status: 'nog-niet-gestart', notitie: undefined },
    { stap: 'claimcheck', status: 'nog-niet-gestart', notitie: undefined },
    { stap: 'jaarlijkse-update', status: 'nog-niet-gestart', notitie: undefined },
  ];

  statusData.forEach((item) => {
    const id = store.nextId.clientStatus++;
    store.clientStatus.set(id, {
      id,
      client_id: clientId,
      ...item,
      updated_at: new Date().toISOString(),
    });
  });

  // Add evidence items
  const evidenceData = [
    {
      titel: 'ISO 14001 certificaat',
      type: 'Certificaat',
      link_notitie: 'https://example.com/iso14001-cert',
      datum: '2023-06-01',
      geldig_tot: '2026-06-01',
    },
    {
      titel: 'Energie-audit rapport 2023',
      type: 'Rapport',
      link_notitie: 'Opgeslagen in Teams folder',
      datum: '2023-11-20',
      geldig_tot: '2027-11-20',
    },
    {
      titel: 'CO₂-footprint berekening',
      type: 'Berekening',
      link_notitie: 'Scope 1+2 compleet, Scope 3 deels',
      datum: '2024-01-15',
      geldig_tot: undefined,
    },
  ];

  evidenceData.forEach((item) => {
    const id = store.nextId.evidenceItems++;
    store.evidenceItems.set(id, {
      id,
      client_id: clientId,
      ...item,
      created_at: new Date().toISOString(),
    });
  });

  // Add scan answers
  const answerData = [
    { category: 'marktvraag', question_key: 'vsme_gevraagd', answer: 'ja' },
    { category: 'marktvraag', question_key: 'co2_footprint_gevraagd', answer: 'ja' },
    { category: 'marktvraag', question_key: 'iso14001_gevraagd', answer: 'ja' },
    { category: 'operationeel', question_key: 'energie_monitoring', answer: 'ja' },
    { category: 'operationeel', question_key: 'co2_scope1_2', answer: 'ja' },
    { category: 'operationeel', question_key: 'co2_scope3', answer: 'deels' },
    { category: 'operationeel', question_key: 'afval_scheiding', answer: 'ja' },
  ];

  answerData.forEach((item) => {
    const id = store.nextId.scanAnswers++;
    store.scanAnswers.set(id, {
      id,
      client_id: clientId,
      ...item,
      updated_at: new Date().toISOString(),
    });
  });

  // Add gap items
  const gapData = [
    {
      gap_title: 'Scope 3 CO₂-berekening niet volledig',
      priority: 'hoog',
      suggested_evidence: 'Volledige Scope 3 screening volgens GHG Protocol; leveranciersdata opvragen',
      status: 'open',
    },
    {
      gap_title: 'Gedragscode leveranciers ontbreekt',
      priority: 'middel',
      suggested_evidence: 'Opstellen leveranciersgedragscode conform OESO-richtlijnen',
      status: 'open',
    },
    {
      gap_title: 'Diversiteitsrapportage WPM niet opgesteld',
      priority: 'laag',
      suggested_evidence: 'WPM-rapportage opstellen (>25 medewerkers)',
      status: 'open',
    },
  ];

  gapData.forEach((item) => {
    const id = store.nextId.gapItems++;
    store.gapItems.set(id, {
      id,
      client_id: clientId,
      ...item,
      created_at: new Date().toISOString(),
    });
  });
}

export class MemoryDatabase {
  private store: MemoryStore;

  constructor() {
    this.store = getMemoryStore();
  }

  prepare(sql: string) {
    return {
      run: (...params: any[]) => {
        return this.executeMutation(sql, params);
      },
      get: (...params: any[]) => {
        return this.executeQuery(sql, params);
      },
      all: (...params: any[]) => {
        return this.executeQueryAll(sql, params);
      },
    };
  }

  exec(sql: string) {
    // No-op for CREATE TABLE statements
  }

  private executeMutation(sql: string, params: any[]) {
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.startsWith('insert')) {
      return this.handleInsert(sql, params);
    } else if (sqlLower.startsWith('update')) {
      return this.handleUpdate(sql, params);
    } else if (sqlLower.startsWith('delete')) {
      return this.handleDelete(sql, params);
    }
    
    return { lastInsertRowid: 0, changes: 0 };
  }

  private handleInsert(sql: string, params: any[]) {
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('into clients')) {
      const id = this.store.nextId.clients++;
      const client: any = {
        id,
        naam: params[0],
        kvk: params[1],
        sector: params[2],
        aantal_medewerkers: params[3],
        omzet: params[4],
        balanstotaal: params[5],
        afnemers: params[6],
        banken: params[7],
        tenders: params[8],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.store.clients.set(id, client);
      return { lastInsertRowid: id, changes: 1 };
    } else if (sqlLower.includes('into client_status')) {
      const id = this.store.nextId.clientStatus++;
      this.store.clientStatus.set(id, {
        id,
        client_id: params[0],
        stap: params[1],
        status: params[2],
        notitie: params[3],
        updated_at: new Date().toISOString(),
      });
      return { lastInsertRowid: id, changes: 1 };
    } else if (sqlLower.includes('into evidence_items')) {
      const id = this.store.nextId.evidenceItems++;
      this.store.evidenceItems.set(id, {
        id,
        client_id: params[0],
        titel: params[1],
        type: params[2],
        link_notitie: params[3],
        datum: params[4],
        geldig_tot: params[5],
        created_at: new Date().toISOString(),
      });
      return { lastInsertRowid: id, changes: 1 };
    } else if (sqlLower.includes('into scan_answers') || sqlLower.includes('or replace into scan_answers')) {
      // Find existing or create new
      let existingId: number | undefined;
      for (const [id, answer] of this.store.scanAnswers.entries()) {
        if (answer.client_id === params[0] && answer.category === params[1] && answer.question_key === params[2]) {
          existingId = id;
          break;
        }
      }
      
      const id = existingId ?? this.store.nextId.scanAnswers++;
      this.store.scanAnswers.set(id, {
        id,
        client_id: params[0],
        category: params[1],
        question_key: params[2],
        answer: params[3],
        updated_at: new Date().toISOString(),
      });
      return { lastInsertRowid: id, changes: 1 };
    } else if (sqlLower.includes('into gap_items')) {
      const id = this.store.nextId.gapItems++;
      this.store.gapItems.set(id, {
        id,
        client_id: params[0],
        gap_title: params[1],
        priority: params[2],
        suggested_evidence: params[3],
        status: params[4] || 'open',
        created_at: new Date().toISOString(),
      });
      return { lastInsertRowid: id, changes: 1 };
    } else if (sqlLower.includes('into claim_checks')) {
      const id = this.store.nextId.claimChecks++;
      this.store.claimChecks.set(id, {
        id,
        client_id: params[0],
        claim_text: params[1],
        result: params[2],
        risks: params[3],
        suggestions: params[4],
        created_at: new Date().toISOString(),
      });
      return { lastInsertRowid: id, changes: 1 };
    } else if (sqlLower.includes('into legislation') || sqlLower.includes('or replace into legislation')) {
      const id = this.store.nextId.legislation++;
      this.store.legislation.set(id, {
        id,
        naam: params[0],
        type: params[1],
        niveau: params[2],
        status: params[3],
        peildatum: params[4],
        drempels: params[5],
        doorwerking: params[6],
        bronlink: params[7],
        te_verifieren: params[8],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { lastInsertRowid: id, changes: 1 };
    }
    
    return { lastInsertRowid: 0, changes: 0 };
  }

  private handleUpdate(sql: string, params: any[]) {
    const sqlLower = sql.toLowerCase();
    
    if (sqlLower.includes('update client_status')) {
      const clientId = params[params.length - 1];
      const stap = params[params.length - 2];
      
      for (const [id, status] of this.store.clientStatus.entries()) {
        if (status.client_id === clientId && status.stap === stap) {
          this.store.clientStatus.set(id, {
            ...status,
            status: sqlLower.includes('voltooid') ? 'voltooid' : status.status,
            notitie: sqlLower.includes('datetime') ? `Updated at ${new Date().toISOString()}` : status.notitie,
            updated_at: new Date().toISOString(),
          });
          return { changes: 1 };
        }
      }
    }
    
    return { changes: 0 };
  }

  private handleDelete(sql: string, params: any[]) {
    const sqlLower = sql.toLowerCase();
    const clientId = params[0];
    
    if (sqlLower.includes('from gap_items')) {
      let deleted = 0;
      for (const [id, gap] of this.store.gapItems.entries()) {
        if (gap.client_id === clientId) {
          this.store.gapItems.delete(id);
          deleted++;
        }
      }
      return { changes: deleted };
    }
    
    return { changes: 0 };
  }

  private executeQuery(sql: string, params: any[]): any {
    const results = this.executeQueryAll(sql, params);
    return results.length > 0 ? results[0] : undefined;
  }

  private executeQueryAll(sql: string, params: any[]): any[] {
    const sqlLower = sql.toLowerCase().trim();
    
    if (sqlLower.includes('from clients')) {
      if (sqlLower.includes('where id')) {
        const client = this.store.clients.get(params[0]);
        return client ? [client] : [];
      } else if (sqlLower.includes('where naam')) {
        return Array.from(this.store.clients.values()).filter(c => c.naam === params[0]);
      } else if (sqlLower.includes('count(*)')) {
        return [{ count: this.store.clients.size }];
      } else if (sqlLower.includes('select c.')) {
        // Client list with counts
        return Array.from(this.store.clients.values()).map(client => {
          const evidence_count = Array.from(this.store.evidenceItems.values())
            .filter(e => e.client_id === client.id).length;
          const open_gaps = Array.from(this.store.gapItems.values())
            .filter(g => g.client_id === client.id && g.status === 'open').length;
          return { ...client, evidence_count, open_gaps };
        }).sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
      }
      return Array.from(this.store.clients.values())
        .sort((a, b) => new Date(b.updated_at!).getTime() - new Date(a.updated_at!).getTime());
    } else if (sqlLower.includes('from client_status')) {
      if (sqlLower.includes('where client_id')) {
        return Array.from(this.store.clientStatus.values())
          .filter(s => s.client_id === params[0])
          .sort((a, b) => a.id - b.id);
      } else if (sqlLower.includes('count(distinct client_id)')) {
        const uniqueClients = new Set(Array.from(this.store.clientStatus.values()).map(s => s.client_id));
        return [{ count: uniqueClients.size }];
      }
    } else if (sqlLower.includes('from evidence_items')) {
      if (sqlLower.includes('where client_id')) {
        return Array.from(this.store.evidenceItems.values())
          .filter(e => e.client_id === params[0])
          .sort((a, b) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime());
      }
    } else if (sqlLower.includes('from scan_answers')) {
      if (sqlLower.includes('where client_id')) {
        return Array.from(this.store.scanAnswers.values())
          .filter(a => a.client_id === params[0]);
      } else if (sqlLower.includes('count(distinct client_id)')) {
        const uniqueClients = new Set(Array.from(this.store.scanAnswers.values()).map(a => a.client_id));
        return [{ count: uniqueClients.size }];
      }
    } else if (sqlLower.includes('from gap_items')) {
      if (sqlLower.includes('where client_id')) {
        return Array.from(this.store.gapItems.values())
          .filter(g => g.client_id === params[0])
          .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
      } else if (sqlLower.includes('where status')) {
        return Array.from(this.store.gapItems.values())
          .filter(g => g.status === params[0]);
      } else if (sqlLower.includes('count(*)')) {
        const filtered = params[0] ? Array.from(this.store.gapItems.values()).filter(g => g.status === params[0]) : Array.from(this.store.gapItems.values());
        return [{ count: filtered.length }];
      }
    } else if (sqlLower.includes('from legislation')) {
      if (sqlLower.includes('count(*)')) {
        return [{ count: this.store.legislation.size }];
      }
      return Array.from(this.store.legislation.values())
        .sort((a, b) => {
          if (a.niveau !== b.niveau) return a.niveau.localeCompare(b.niveau);
          return a.naam.localeCompare(b.naam);
        });
    } else if (sqlLower.includes('from claim_checks')) {
      if (sqlLower.includes('where client_id')) {
        return Array.from(this.store.claimChecks.values())
          .filter(c => c.client_id === params[0])
          .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());
      }
    }
    
    return [];
  }
}
