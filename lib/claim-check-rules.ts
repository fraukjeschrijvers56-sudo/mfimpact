/**
 * Claim Check Rules (ECGT + ACM Leidraad, stand oktober 2026)
 * 
 * Kader: Richtlijn Empowering Consumers (ECGT), van toepassing sinds 27-09-2026
 * ACM Leidraad Duurzaamheidsclaims
 * Green Claims Directive is GEEN basis (ingetrokken/on hold)
 */

export type ClaimColor = 'red' | 'orange' | 'green';

export interface ClaimRule {
  id: string;
  name: string;
  color: ClaimColor;
  keywords: string[];
  description: string;
  legalBasis: string;
}

export interface ClaimCheckResult {
  claim_text: string;
  url?: string;
  color: ClaimColor;
  matched_rule: string;
  reason: string;
  rewrite_suggestion: string;
  legal_basis: string;
}

/**
 * ROOD (verboden) - ECGT + ACM
 */
export const RED_RULES: ClaimRule[] = [
  {
    id: 'generic-without-proof',
    name: 'Generieke claim zonder erkend bewijs',
    color: 'red',
    keywords: ['duurzaam', 'groen', 'eco', 'milieuvriendelijk', 'klimaatbewust', 'natuurvriendelijk', 'goed voor het milieu'],
    description: 'Generieke claims zonder erkend bewijs van uitmuntende prestaties zijn verboden',
    legalBasis: 'ECGT art. 6(1)(b) + ACM Leidraad'
  },
  {
    id: 'climate-neutral-with-offsets',
    name: 'Klimaatneutraal met compensatie',
    color: 'red',
    keywords: ['klimaatneutraal', 'co2-neutraal', 'koolstofneutraal', 'klimaatpositief', 'carbon neutral'],
    description: 'Klimaatneutraal/CO2-compensatieclaims over product als die op compensatie rusten',
    legalBasis: 'ECGT art. 6(1)(d)'
  },
  {
    id: 'fake-label',
    name: 'Duurzaamheidslabel zonder certificering',
    color: 'red',
    keywords: ['label', 'keurmerk', 'certificaat', 'gecertificeerd'],
    description: 'Label dat niet op certificeringsschema of overheidsregeling rust',
    legalBasis: 'ECGT art. 6(1)(c)'
  },
  {
    id: 'partial-as-full',
    name: 'Deelclaim als geheel gepresenteerd',
    color: 'red',
    keywords: ['100%', 'volledig', 'geheel', 'compleet'],
    description: 'Claim over hele product/bedrijf terwijl het om een deel gaat',
    legalBasis: 'ECGT art. 6(1)(a) + ACM Leidraad'
  },
  {
    id: 'legal-as-distinctive',
    name: 'Wettelijke verplichting als onderscheidend',
    color: 'red',
    keywords: ['voldoet aan', 'conform', 'volgens wetgeving'],
    description: 'Wettelijke verplichtingen presenteren als onderscheidend',
    legalBasis: 'ECGT art. 6(1)(e)'
  }
];

/**
 * ORANJE (risicovol)
 */
export const ORANGE_RULES: ClaimRule[] = [
  {
    id: 'future-without-plan',
    name: 'Toekomstclaim zonder plan',
    color: 'orange',
    keywords: ['in 2030', 'in 2040', 'in 2050', 'netto nul', 'net zero', 'klimaatneutraal in'],
    description: 'Toekomstclaims zonder openbaar implementatieplan met tussendoelen en onafhankelijke toetsing',
    legalBasis: 'ECGT art. 6(1)(d) + ACM Leidraad'
  },
  {
    id: 'comparative-without-method',
    name: 'Vergelijkende claim zonder methode',
    color: 'orange',
    keywords: ['beter dan', 'meer dan', 'minder dan', 'duurzamer dan'],
    description: 'Vergelijkende claims zonder methode',
    legalBasis: 'ACM Leidraad'
  },
  {
    id: 'vague-percentage',
    name: 'Vaag percentage zonder basis',
    color: 'orange',
    keywords: ['% minder', '% duurzamer', '% CO2-reductie'],
    description: 'Vage percentages zonder basis',
    legalBasis: 'ECGT art. 6(1)(a)'
  }
];

/**
 * GROEN (toegestaan)
 */
export const GREEN_CRITERIA = {
  specific: 'Specifiek en concreet',
  measurable: 'Meetbaar met cijfers',
  substantiated: 'Onderbouwd met bron of certificaat',
  current: 'Actueel (niet verouderd)'
};

/**
 * Check a single claim against all rules
 */
export function checkClaim(
  claimText: string,
  url?: string,
  context?: string
): ClaimCheckResult {
  const lowerClaim = claimText.toLowerCase();
  
  // Check RED rules first
  for (const rule of RED_RULES) {
    const matches = rule.keywords.some(keyword => lowerClaim.includes(keyword.toLowerCase()));
    
    if (matches) {
      let rewrite = '';
      
      switch (rule.id) {
        case 'generic-without-proof':
          rewrite = 'Vervang door specifieke claim met bewijs, bijv. "ISO 14001 gecertificeerd" of "30% CO2-reductie t.o.v. 2020 (geverifieerd door [naam])"';
          break;
        case 'climate-neutral-with-offsets':
          rewrite = 'Vermeld expliciet: "CO2-compensatie via [project]" of focus op absolute emissiereductie zonder compensatie';
          break;
        case 'fake-label':
          rewrite = 'Gebruik alleen erkende certificeringsschema\'s (ISO, FSC, B Corp, etc.) of verwijder label';
          break;
        case 'partial-as-full':
          rewrite = 'Specificeer nauwkeurig welk deel: bijv. "verpakking 100% gerecycled" i.p.v. "100% gerecycled"';
          break;
        case 'legal-as-distinctive':
          rewrite = 'Verwijder claim of voeg toe wat je EXTRA doet bovenop wettelijke verplichtingen';
          break;
      }
      
      return {
        claim_text: claimText,
        url,
        color: 'red',
        matched_rule: rule.name,
        reason: `VERBODEN: ${rule.description}`,
        rewrite_suggestion: rewrite,
        legal_basis: rule.legalBasis
      };
    }
  }
  
  // Check ORANGE rules
  for (const rule of ORANGE_RULES) {
    const matches = rule.keywords.some(keyword => lowerClaim.includes(keyword.toLowerCase()));
    
    if (matches) {
      let rewrite = '';
      
      switch (rule.id) {
        case 'future-without-plan':
          rewrite = 'Publiceer een implementatieplan met: tussendoelen per jaar, verantwoordelijke partij, en onafhankelijke verificatie';
          break;
        case 'comparative-without-method':
          rewrite = 'Vermeld: basis van vergelijking (wat/wanneer), gebruikte methode, en databron';
          break;
        case 'vague-percentage':
          rewrite = 'Specificeer: percentage t.o.v. wat (jaar/product), gebruikte berekeningsmethode, en verificatie';
          break;
      }
      
      return {
        claim_text: claimText,
        url,
        color: 'orange',
        matched_rule: rule.name,
        reason: `RISICOVOL: ${rule.description}`,
        rewrite_suggestion: rewrite,
        legal_basis: rule.legalBasis
      };
    }
  }
  
  // Check if claim is GREEN (specific, measurable, substantiated)
  const hasNumbers = /\d+/.test(claimText);
  const hasCertification = /\b(iso|fsc|b corp|ecovadis|sbti|science.based|co2.prestatieladder)\b/i.test(claimText);
  const hasSource = /\b(geverifieerd|gecontroleerd|onderzocht door|volgens|gebaseerd op)\b/i.test(claimText);
  const hasYearReference = /\b(20\d{2}|vergeleken met|ten opzichte van)\b/i.test(claimText);
  
  const greenScore = [hasNumbers, hasCertification, hasSource, hasYearReference].filter(Boolean).length;
  
  if (greenScore >= 2) {
    return {
      claim_text: claimText,
      url,
      color: 'green',
      matched_rule: 'Voldoet aan groene criteria',
      reason: `TOEGESTAAN: Claim is ${hasNumbers ? 'meetbaar' : ''}${hasCertification ? ', gecertificeerd' : ''}${hasSource ? ', onderbouwd' : ''}${hasYearReference ? ', actueel' : ''}`,
      rewrite_suggestion: 'Geen aanpassing nodig. Houd claim actueel en controleerbaar.',
      legal_basis: 'ECGT art. 6 + ACM Leidraad (voldoet aan criteria)'
    };
  }
  
  // Default: ORANGE (insufficient info to determine)
  return {
    claim_text: claimText,
    url,
    color: 'orange',
    matched_rule: 'Onduidelijk / onvoldoende informatie',
    reason: 'RISICOVOL: Claim mist concrete details, cijfers of onderbouwing',
    rewrite_suggestion: 'Voeg toe: specifieke cijfers, certificaat/bron, meetbare indicator, of basisjaar voor vergelijking',
    legal_basis: 'ECGT art. 6(1)(a) - transparantie en waarheidsgetrouwheid'
  };
}

/**
 * Extract and check all claims from text
 */
export function extractAndCheckClaims(text: string, url?: string): ClaimCheckResult[] {
  // Common claim patterns
  const claimPatterns = [
    /[^.!?]*\b(duurzaam|groen|eco|milieuvriendelijk|klimaatbewust|klimaatneutraal|co2[-\s]?neutraal|klimaatpositief|circulair|hernieuwbaar|biologisch|fair.?trade|gecertificeerd)\b[^.!?]*/gi,
    /[^.!?]*\b\d+%?\s*(minder|reductie|besparing|duurzamer)\b[^.!?]*/gi,
    /[^.!?]*\b(netto.?nul|net.?zero|doelstelling|ambitie)\b[^.!?]*/gi,
  ];
  
  const foundClaims = new Set<string>();
  
  for (const pattern of claimPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const claim = match[0].trim();
      if (claim.length > 20 && claim.length < 300) {
        foundClaims.add(claim);
      }
    }
  }
  
  return Array.from(foundClaims)
    .slice(0, 20) // Limit to 20 claims
    .map(claim => checkClaim(claim, url));
}
