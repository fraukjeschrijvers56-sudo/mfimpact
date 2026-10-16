/**
 * ESG Threshold Configuration Module (stand oktober 2026, Omnibus I verwerkt)
 * 
 * Centralized configuration for CSRD, CSDDD, EUDR, CBAM, and other ESG regulatory thresholds.
 * UI MOET TONEN: "Indicatief, geen juridisch advies" + peildatum veld
 */

export const ESG_REFERENCE_DATE = '2026-10-16';
export const ESG_DISCLAIMER = 'Indicatief, geen juridisch advies';

export interface ThresholdResult {
  applicable: boolean;
  status: 'verplicht' | 'indirect_via_keten' | 'vrijwillig' | 'niet_van_toepassing';
  reasons: string[];
  category: string;
  notes?: string[];
}

export interface CompanyData {
  aantal_medewerkers?: number | string; // Allow "onbekend"
  omzet?: number | string;
  balanstotaal?: number | string;
  sector?: string;
  products?: string[]; // For EUDR/CBAM checks
  energy_kwh?: number;
  gas_m3?: number;
  import_volume_ton?: number;
}

/**
 * CSRD (na Omnibus I): verplicht bij >1000 medewerkers EN netto-omzet >EUR 450 mln
 */
export function checkCSRD(data: CompanyData): ThresholdResult {
  const fte = typeof data.aantal_medewerkers === 'number' ? data.aantal_medewerkers : null;
  const omzet = typeof data.omzet === 'number' ? data.omzet : null;
  
  if (fte === null || omzet === null) {
    return {
      applicable: false,
      status: 'niet_van_toepassing',
      category: 'CSRD',
      reasons: ['Onvoldoende gegevens (FTE en/of omzet onbekend)'],
      notes: ['Bevestig FTE en omzet om CSRD-plicht te bepalen']
    };
  }

  const meetsThreshold = fte > 1000 && omzet > 450_000_000;
  
  return {
    applicable: meetsThreshold,
    status: meetsThreshold ? 'verplicht' : 'niet_van_toepassing',
    category: 'CSRD (na Omnibus I)',
    reasons: meetsThreshold 
      ? [`>1000 FTE (${fte}) EN omzet >€450 mln (€${(omzet / 1_000_000).toFixed(0)} mln)`]
      : [`Voldoet niet: ${fte} FTE en €${(omzet / 1_000_000).toFixed(0)} mln omzet`],
    notes: ['Beursgenoteerd MKB valt niet meer onder CSRD na Omnibus I']
  };
}

/**
 * Value-chain cap: <=1000 FTE hoeven grote klanten niet meer te leveren dan VSME-standaard
 */
export function checkValueChainCap(data: CompanyData): ThresholdResult {
  const fte = typeof data.aantal_medewerkers === 'number' ? data.aantal_medewerkers : null;
  
  if (fte === null) {
    return {
      applicable: false,
      status: 'niet_van_toepassing',
      category: 'Value-chain cap',
      reasons: ['FTE onbekend'],
    };
  }

  const eligible = fte <= 1000;
  
  return {
    applicable: eligible,
    status: eligible ? 'vrijwillig' : 'niet_van_toepassing',
    category: 'Value-chain cap',
    reasons: eligible 
      ? [`≤1000 FTE (${fte}): hoeft grote klanten niet meer te leveren dan VSME-standaard`]
      : [`>1000 FTE (${fte}): value-chain cap niet van toepassing`],
    notes: eligible ? ['Verkoopargument: VSME-rapportage is voldoende voor grote afnemers'] : []
  };
}

/**
 * CSDDD (na Omnibus): >5000 medewerkers EN >€1,5 mrd omzet; toepassing vanaf 2029
 */
export function checkCSDDD(data: CompanyData): ThresholdResult {
  const fte = typeof data.aantal_medewerkers === 'number' ? data.aantal_medewerkers : null;
  const omzet = typeof data.omzet === 'number' ? data.omzet : null;
  
  if (fte === null || omzet === null) {
    return {
      applicable: false,
      status: 'niet_van_toepassing',
      category: 'CSDDD',
      reasons: ['Onvoldoende gegevens'],
    };
  }

  const meetsThreshold = fte > 5000 && omzet > 1_500_000_000;
  
  return {
    applicable: meetsThreshold,
    status: meetsThreshold ? 'verplicht' : 'indirect_via_keten',
    category: 'CSDDD (na Omnibus)',
    reasons: meetsThreshold 
      ? [`>5000 FTE (${fte}) EN omzet >€1,5 mrd (€${(omzet / 1_000_000_000).toFixed(1)} mrd)`]
      : [`Niet direct verplicht: ${fte} FTE en €${(omzet / 1_000_000).toFixed(0)} mln omzet`],
    notes: meetsThreshold 
      ? ['Toepassing vanaf 2029']
      : ['MKB alleen indirect als leverancier van grote bedrijven']
  };
}

/**
 * EU-taxonomie: volgt CSRD-scope
 */
export function checkEUTaxonomy(data: CompanyData): ThresholdResult {
  const csrd = checkCSRD(data);
  return {
    ...csrd,
    category: 'EU Taxonomie',
    notes: ['Volgt CSRD-scope']
  };
}

/**
 * EUDR: soja, palmolie, rundvee, cacao, koffie, rubber, hout op EU-markt
 */
export function checkEUDR(data: CompanyData): ThresholdResult {
  const eudrProducts = ['soja', 'palmolie', 'rundvee', 'cacao', 'koffie', 'rubber', 'hout'];
  const products = data.products?.map(p => p.toLowerCase()) || [];
  
  const hasEUDRProducts = eudrProducts.some(ep => 
    products.some(p => p.includes(ep))
  );
  
  return {
    applicable: hasEUDRProducts,
    status: hasEUDRProducts ? 'verplicht' : 'niet_van_toepassing',
    category: 'EUDR',
    reasons: hasEUDRProducts 
      ? [`Verhandelt EUDR-producten: ${products.filter(p => eudrProducts.some(ep => p.includes(ep))).join(', ')}`]
      : ['Geen EUDR-producten geïdentificeerd'],
    notes: hasEUDRProducts ? ['MKB later dan grote bedrijven'] : []
  };
}

/**
 * CBAM: importeurs van staal, aluminium, cement, kunstmest, waterstof, elektriciteit
 */
export function checkCBAM(data: CompanyData): ThresholdResult {
  const cbamProducts = ['staal', 'aluminium', 'cement', 'kunstmest', 'waterstof', 'elektriciteit'];
  const products = data.products?.map(p => p.toLowerCase()) || [];
  
  const hasCBAMProducts = cbamProducts.some(cp => 
    products.some(p => p.includes(cp))
  );
  
  const volume = data.import_volume_ton;
  const exempt = volume !== undefined && volume < 50;
  
  return {
    applicable: hasCBAMProducts && !exempt,
    status: hasCBAMProducts ? (exempt ? 'niet_van_toepassing' : 'verplicht') : 'niet_van_toepassing',
    category: 'CBAM',
    reasons: hasCBAMProducts 
      ? exempt 
        ? [`Importeert CBAM-producten maar <50 ton/jaar (vrijstelling)`]
        : [`Importeert CBAM-producten: ${products.filter(p => cbamProducts.some(cp => p.includes(cp))).join(', ')}`]
      : ['Geen CBAM-producten geïdentificeerd'],
  };
}

/**
 * NL energiebesparingsplicht: >=50.000 kWh of >=25.000 m³ aardgas
 */
export function checkNLEnergySaving(data: CompanyData): ThresholdResult {
  const kwh = data.energy_kwh;
  const m3 = data.gas_m3;
  
  if (!kwh && !m3) {
    return {
      applicable: false,
      status: 'niet_van_toepassing',
      category: 'NL Energiebesparingsplicht',
      reasons: ['Energieverbruik onbekend'],
      notes: ['Check energiefacturen']
    };
  }
  
  const meetsElectricity = !!(kwh && kwh >= 50_000);
  const meetsGas = !!(m3 && m3 >= 25_000);
  const meetsEED = !!(kwh && kwh >= 10_000_000) || !!(m3 && m3 >= 170_000);
  
  const applicable = meetsElectricity || meetsGas;
  
  return {
    applicable,
    status: applicable ? 'verplicht' : 'niet_van_toepassing',
    category: 'NL Energiebesparingsplicht',
    reasons: [
      ...(meetsElectricity ? [`≥50.000 kWh (${kwh?.toLocaleString('nl-NL')} kWh)`] : []),
      ...(meetsGas ? [`≥25.000 m³ (${m3?.toLocaleString('nl-NL')} m³)`] : []),
      ...(!applicable && kwh ? [`Onder drempel: ${kwh.toLocaleString('nl-NL')} kWh`] : []),
      ...(!applicable && m3 ? [`Onder drempel: ${m3.toLocaleString('nl-NL')} m³`] : []),
    ],
    notes: meetsEED ? ['Ook EED-onderzoeksplicht (>10 mln kWh of >170.000 m³)'] : []
  };
}

/**
 * CO2-Prestatieladder: gunningsvoordeel bij Rijk en ProRail (geen wet)
 */
export function checkCO2Prestatieladder(data: CompanyData): ThresholdResult {
  const relevantSectors = ['bouw', 'infra', 'gww', 'infrastructuur', 'wegenbouw', 'civiele'];
  const sector = data.sector?.toLowerCase() || '';
  
  const isRelevant = relevantSectors.some(s => sector.includes(s));
  
  return {
    applicable: isRelevant,
    status: isRelevant ? 'vrijwillig' : 'niet_van_toepassing',
    category: 'CO2-Prestatieladder',
    reasons: isRelevant 
      ? [`Relevant voor sector: ${data.sector}`]
      : ['Niet relevant voor deze sector'],
    notes: isRelevant 
      ? ['Geen wettelijke plicht, wel gunningsvoordeel bij Rijk en ProRail']
      : []
  };
}

/**
 * MKB-definitie (EU): <250 FTE EN (omzet ≤€50 mln OF balans ≤€43 mln)
 */
export function checkMKBCategory(data: CompanyData): { 
  category: 'micro' | 'klein' | 'middelgroot' | 'groot' | 'onbekend';
  reason: string;
} {
  const fte = typeof data.aantal_medewerkers === 'number' ? data.aantal_medewerkers : null;
  const omzet = typeof data.omzet === 'number' ? data.omzet : null;
  const balans = typeof data.balanstotaal === 'number' ? data.balanstotaal : null;
  
  if (fte === null) {
    return { category: 'onbekend', reason: 'FTE onbekend' };
  }
  
  // Micro: <10 FTE en ≤€2 mln
  if (fte < 10 && (omzet === null || omzet <= 2_000_000)) {
    return { category: 'micro', reason: `<10 FTE (${fte})${omzet ? ` en ≤€2 mln omzet` : ''}` };
  }
  
  // Klein: <50 FTE en ≤€10 mln
  if (fte < 50 && (omzet === null || omzet <= 10_000_000)) {
    return { category: 'klein', reason: `<50 FTE (${fte})${omzet ? ` en ≤€10 mln omzet` : ''}` };
  }
  
  // Middelgroot MKB: <250 FTE en (≤€50 mln of ≤€43 mln balans)
  if (fte < 250 && (omzet === null || omzet <= 50_000_000 || (balans !== null && balans <= 43_000_000))) {
    return { category: 'middelgroot', reason: `<250 FTE (${fte})${omzet ? ` en ≤€50 mln omzet` : ''}` };
  }
  
  // Groot
  return { category: 'groot', reason: `≥250 FTE (${fte}) of omzet >€50 mln` };
}

/**
 * Run all threshold checks for a company
 */
export function checkAllThresholds(data: CompanyData) {
  const mkbCategory = checkMKBCategory(data);
  
  return {
    mkbCategory,
    csrd: checkCSRD(data),
    valueChainCap: checkValueChainCap(data),
    csddd: checkCSDDD(data),
    euTaxonomy: checkEUTaxonomy(data),
    eudr: checkEUDR(data),
    cbam: checkCBAM(data),
    nlEnergySaving: checkNLEnergySaving(data),
    co2Prestatieladder: checkCO2Prestatieladder(data),
    referenceDate: ESG_REFERENCE_DATE,
    disclaimer: ESG_DISCLAIMER,
  };
}
