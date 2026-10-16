export interface ClaimCheckRule {
  pattern: RegExp;
  risk: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export const claimCheckRules: ClaimCheckRule[] = [
  {
    pattern: /\b(klimaatneutraal|klimaat neutraal|climate neutral)\b/i,
    risk: 'Claim "klimaatneutraal" zonder onderbouwing kan misleidend zijn',
    severity: 'high',
    suggestion: 'Specificeer: welke scope (1/2/3), hoe bereikt (reductie vs compensatie), over welke periode, met welke verificatie'
  },
  {
    pattern: /\b(CO2[\s-]?neutraal|koolstofneutraal|carbon neutral)\b/i,
    risk: 'CO₂-neutraliteit via compensatie alleen is onvoldoende onderbouwd',
    severity: 'high',
    suggestion: 'Toon eerst emissiereductie-inspanningen; compensatie alleen volstaat niet volgens Green Claims Directive concept'
  },
  {
    pattern: /\b(100%\s*)(groen|duurzaam|milieuvriendelijk)\b/i,
    risk: 'Absolute claim zonder scope of bewijs',
    severity: 'high',
    suggestion: 'Definieer wat "100%" betekent: welk aspect, welke levenscyclusfase, met welke criteria'
  },
  {
    pattern: /\b(volledig|helemaal|geheel)\s+(duurzaam|groen|circulair)\b/i,
    risk: 'Absolute claim zonder nuancering',
    severity: 'high',
    suggestion: 'Specificeer de scope en beperkingen; volledige duurzaamheid is zelden haalbaar'
  },
  {
    pattern: /\b(groen|duurzaam|eco|milieuvriendelijk)\b/i,
    risk: 'Vage term zonder specificatie',
    severity: 'medium',
    suggestion: 'Concretiseer: op welk aspect is het groener (energie, materiaal, emissies)? Vergeleken met wat?'
  },
  {
    pattern: /\b(circulair|circular)\b/i,
    risk: 'Circulariteitsclaim zonder onderbouwing',
    severity: 'medium',
    suggestion: 'Leg uit: welk percentage is hergebruikt/recyclebaar, welke circulariteitsstrategie (repair, reuse, recycle)?'
  },
  {
    pattern: /\b(compenseren|gecompenseerd|offset)\b/i,
    risk: 'Compensatie zonder reductie-inspanningen',
    severity: 'medium',
    suggestion: 'Toon eerst emissiereductie; compensatie is aanvullend, niet primair'
  },
  {
    pattern: /\b(natuurlijk|natural)\b/i,
    risk: 'Term "natuurlijk" is vaak ongedefinieerd',
    severity: 'low',
    suggestion: 'Definieer wat "natuurlijk" betekent in deze context; niet automatisch duurzaam'
  },
  {
    pattern: /\b(plantaardig|plant[\s-]?based)\b/i,
    risk: 'Plantaardige claims kunnen impliciet milieubewustzijn suggereren zonder bewijs',
    severity: 'low',
    suggestion: 'Als milieuclaim bedoeld: onderbouw met LCA of footprintdata'
  },
  {
    pattern: /\b(verantwoord|responsible)\b/i,
    risk: 'Vage claim zonder criteria',
    severity: 'low',
    suggestion: 'Definieer "verantwoord": volgens welke standaard of criteria?'
  },
  {
    pattern: /\b(groene energie|duurzame energie)\b/i,
    risk: 'Energieclaim zonder bronvermelding',
    severity: 'medium',
    suggestion: 'Specificeer: welk type (wind, zon, water), welk percentage, met Garanties van Oorsprong?'
  },
  {
    pattern: /\b(biologisch afbreekbaar|biodegradable)\b/i,
    risk: 'Afbreekbaarheidsclaim vaak zonder tijdsaanduiding of omstandigheden',
    severity: 'medium',
    suggestion: 'Specificeer: onder welke omstandigheden, binnen welke termijn, volgens welke norm (bijv. EN 13432)?'
  },
  {
    pattern: /\b(zero waste|nul afval)\b/i,
    risk: 'Zero waste claim is zeer ambitieus en zelden volledig',
    severity: 'high',
    suggestion: 'Nuanceer: welk percentage afvalreductie, welke definitie van "waste", welke scope?'
  },
];

export function checkClaim(claimText: string): {
  risks: Array<{ rule: ClaimCheckRule; match: string }>;
  overallResult: 'green' | 'orange' | 'red';
} {
  const risks: Array<{ rule: ClaimCheckRule; match: string }> = [];
  
  for (const rule of claimCheckRules) {
    const match = claimText.match(rule.pattern);
    if (match) {
      risks.push({ rule, match: match[0] });
    }
  }

  // Determine overall result
  let overallResult: 'green' | 'orange' | 'red' = 'green';
  
  if (risks.some(r => r.rule.severity === 'high')) {
    overallResult = 'red';
  } else if (risks.some(r => r.rule.severity === 'medium')) {
    overallResult = 'orange';
  } else if (risks.length > 0) {
    overallResult = 'orange';
  }

  return { risks, overallResult };
}
