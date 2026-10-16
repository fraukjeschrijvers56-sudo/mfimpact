/**
 * VSME Basic Module Scan Questions (B1-B11) + Extra vragen
 * Stand oktober 2026
 */

export interface ScanQuestion {
  id: string;
  category: string;
  question: string;
  priority: 'hoog' | 'middel' | 'laag';
  why_important: string;
  evidence_suggestions: string[];
}

/**
 * VSME Basic Module (B1-B11)
 */
export const VSME_QUESTIONS: ScanQuestion[] = [
  {
    id: 'B1',
    category: 'Governance',
    question: 'Grondslag en opzet rapport: Is er een duurzaamheidsverslag of -paragraaf in het jaarverslag?',
    priority: 'middel',
    why_important: 'Toont commitment en transparantie',
    evidence_suggestions: ['Duurzaamheidsverslag', 'Paragraaf in jaarverslag', 'Aparte duurzaamheidspagina op website']
  },
  {
    id: 'B2',
    category: 'Governance',
    question: 'Beleid en praktijken duurzaamheid: Is er een gedocumenteerd duurzaamheidsbeleid?',
    priority: 'middel',
    why_important: 'Inkopers en banken vragen naar beleid',
    evidence_suggestions: ['Duurzaamheidsbeleid document', 'Code of Conduct', 'MVO-strategie']
  },
  {
    id: 'B3',
    category: 'Klimaat & Energie',
    question: 'Energie (MWh) en broeikasgassen scope 1 en 2: Worden energieverbruik en CO2-uitstoot gerapporteerd?',
    priority: 'hoog',
    why_important: 'CSRD-kernvraag, inkopers vragen dit het eerst',
    evidence_suggestions: ['Energierapportage', 'CO2-footprint berekening', 'GHG Protocol scope 1+2 rapportage']
  },
  {
    id: 'B4',
    category: 'Milieu',
    question: 'Verontreiniging: Zijn er emissies naar lucht/water/bodem gerapporteerd?',
    priority: 'middel',
    why_important: 'Vergunningenplicht en milieurisico\'s',
    evidence_suggestions: ['Emissieregistratie', 'Milieuvergunning', 'Emissierapporten']
  },
  {
    id: 'B5',
    category: 'Biodiversiteit',
    question: 'Biodiversiteit en locaties: Zijn er maatregelen voor biodiversiteit of natuurbeheer?',
    priority: 'laag',
    why_important: 'Groeiende aandacht vanuit EU-regelgeving',
    evidence_suggestions: ['Biodiversiteitsplan', 'Natuurcompensatie', 'Groenbeheer op locaties']
  },
  {
    id: 'B6',
    category: 'Water',
    question: 'Water: Wordt waterverbruik gemonitord en gerapporteerd?',
    priority: 'laag',
    why_important: 'Relevant voor water-intensieve sectoren',
    evidence_suggestions: ['Waterverbruik (m³) rapportage', 'Waterbesparingsmaatregelen']
  },
  {
    id: 'B7',
    category: 'Circulariteit',
    question: 'Grondstoffen, circulariteit, afval: Is er een afvalregistratie en circulair beleid?',
    priority: 'middel',
    why_important: 'EU circular economy package en inkoopvoorwaarden',
    evidence_suggestions: ['Afvalregistratie (kg per fractie)', 'Circulariteitsplan', 'Hergebruik- en recyclepercentages']
  },
  {
    id: 'B8',
    category: 'Personeel',
    question: 'Personeel: Wordt aantal medewerkers, contracttype en verloop gerapporteerd?',
    priority: 'hoog',
    why_important: 'CSRD social metrics, inkopers en banken vragen dit',
    evidence_suggestions: ['Personeelsrapportage', 'FTE verdeling', 'Verzuimcijfers', 'Verloop (%)']
  },
  {
    id: 'B9',
    category: 'Gezondheid & Veiligheid',
    question: 'Gezondheid en veiligheid: Worden arbeidsongevallen geregistreerd en gerapporteerd?',
    priority: 'hoog',
    why_important: 'Zorgplicht werkgever, inkopers vragen ongevallencijfers',
    evidence_suggestions: ['Ongevallenregistratie (LTIF)', 'RI&E', 'VCA/SCC certificaat', 'Arbo-jaarplan']
  },
  {
    id: 'B10',
    category: 'Arbeidsvoorwaarden',
    question: 'Beloning, CAO, opleiding: Is er een CAO en worden opleidingsuren bijgehouden?',
    priority: 'middel',
    why_important: 'Fair labour practices (CSDDD)',
    evidence_suggestions: ['CAO-vermelding', 'Opleidingsplan', 'Opleidingsuren per FTE']
  },
  {
    id: 'B11',
    category: 'Compliance',
    question: 'Veroordelingen corruptie/omkoping: Zijn er (geen) veroordelingen voor corruptie of omkoping?',
    priority: 'hoog',
    why_important: 'Compliance en reputatie (CSDDD due diligence)',
    evidence_suggestions: ['Compliance statement', 'Anti-omkoping beleid', 'Verklaring geen veroordelingen']
  }
];

/**
 * Extra vragen (bovenop VSME B1-B11)
 */
export const EXTRA_QUESTIONS: ScanQuestion[] = [
  {
    id: 'EX1',
    category: 'Keten',
    question: 'Gedragscode voor leveranciers: Is er een supplier code of conduct?',
    priority: 'middel',
    why_important: 'CSDDD ketenverantwoordelijkheid',
    evidence_suggestions: ['Supplier Code of Conduct', 'Inkoopvoorwaarden met ESG-criteria', 'Leveranciersaudit']
  },
  {
    id: 'EX2',
    category: 'Certificering',
    question: 'Keurmerken/certificaten: Zijn er ISO 14001, EcoVadis, B Corp, CO2-Prestatieladder, SBTi?',
    priority: 'middel',
    why_important: 'Externe verificatie en marktvoordeel',
    evidence_suggestions: ['ISO 14001 certificaat', 'EcoVadis scorecard', 'B Corp certificering', 'CO2-Prestatieladder niveau', 'SBTi commitment letter']
  },
  {
    id: 'EX3',
    category: 'Rapportage',
    question: 'Duurzaamheidsverslag of -pagina: Is er een publieke duurzaamheidsrapportage?',
    priority: 'laag',
    why_important: 'Transparantie en stakeholder communicatie',
    evidence_suggestions: ['Duurzaamheidspagina op website', 'PDF duurzaamheidsverslag', 'GRI/CSRD-rapportage']
  },
  {
    id: 'EX4',
    category: 'Klimaatdoelen',
    question: 'CO2-doelen met jaartal: Zijn er concrete CO2-reductiedoelen met streefdata?',
    priority: 'hoog',
    why_important: 'Klimaatambitie en Paris Agreement alignment',
    evidence_suggestions: ['CO2-reductiedoel (bijv. -50% in 2030 t.o.v. 2020)', 'SBTi-goedgekeurd doel', 'Net zero commitment']
  }
];

/**
 * All questions combined
 */
export const ALL_SCAN_QUESTIONS = [...VSME_QUESTIONS, ...EXTRA_QUESTIONS];

/**
 * Get priority explanation for gap
 */
export function getGapPriority(questionId: string): 'hoog' | 'middel' | 'laag' {
  const question = ALL_SCAN_QUESTIONS.find(q => q.id === questionId);
  return question?.priority || 'middel';
}

/**
 * Get suggested evidence for gap
 */
export function getSuggestedEvidence(questionId: string): string[] {
  const question = ALL_SCAN_QUESTIONS.find(q => q.id === questionId);
  return question?.evidence_suggestions || ['Voeg bewijs toe'];
}
