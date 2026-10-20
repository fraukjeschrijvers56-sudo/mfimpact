/**
 * Deterministic wetgeving & drempel status from stored dossier data.
 * Never uses an LLM. Missing/uncertain inputs → TE ONDERZOEKEN, never NVT.
 */
export const ESG_REFERENCE_DATE = '2026-10-16';
export const ESG_DISCLAIMER = 'Indicatief, geen juridisch advies';

export type LegislationStatus =
  | 'van_toepassing'
  | 'niet_van_toepassing'
  | 'te_onderzoeken'
  | 'indirect_via_keten'
  | 'vrijwillig';

export const LEGISLATION_STATUS_LABEL: Record<LegislationStatus, string> = {
  van_toepassing: 'VAN TOEPASSING',
  niet_van_toepassing: 'NIET VAN TOEPASSING',
  te_onderzoeken: 'TE ONDERZOEKEN',
  indirect_via_keten: 'INDIRECT / VIA KETEN',
  vrijwillig: 'VRIJWILLIG',
};

export const LEGISLATION_STATUS_COLOR: Record<LegislationStatus, string> = {
  van_toepassing: '#D64545',
  niet_van_toepassing: '#6B7280',
  te_onderzoeken: '#FFC14D',
  indirect_via_keten: '#3B82F6',
  vrijwillig: '#039088',
};

export interface LegislationItem {
  id: string;
  category: string;
  status: LegislationStatus;
  label: string;
  color: string;
  reasons: string[];
  source?: string;
  needed?: string;
  question?: string;
  documentRequest?: string;
  notes?: string[];
}

export interface LegislationAssessment {
  items: LegislationItem[];
  summary: string;
  counts: Record<LegislationStatus, number>;
  questions: string[];
  documentRequests: string[];
  mkbCategory: { category: string; reason: string };
  referenceDate: string;
  disclaimer: string;
}

const UNCERTAIN_RE =
  /onvoldoende gegevens|onbekend|niet ge[iï]dentificeerd|niet gevonden|niet bepaald|energieverbruik onbekend|geen producten ge[iï]dentificeerd|geen .+producten ge[iï]dentificeerd|n\/a|\bniet bekend\b/i;

const EUDR_GOODS = ['soja', 'palmolie', 'rundvee', 'cacao', 'koffie', 'rubber', 'hout', 'cattle', 'palm oil'];
const CBAM_GOODS = ['staal', 'aluminium', 'cement', 'kunstmest', 'waterstof', 'elektriciteit', 'steel', 'aluminum', 'fertilizer', 'hydrogen'];

const GOV_CLIENT_RE =
  /\b(gemeente|gemeenten|provincie|waterschap|rijksoverheid|rijk|ministerie|zbo|prorail|rijkswaterstaat|tender|aanbested|overheid|defensie|politie)\b/i;
const INFRA_CLIENT_RE =
  /\b(infra|gww|bouw|wegenbouw|beekherstel|reconstructie|bruggen|fietsroute|riolering|natuurparel|gebiedsinrichting|directievoering|waterschap)\b/i;
const LARGE_CLIENT_RE = /\b(asml|shell|unilever|philips|heineken|bank|banken|abn|ing|rabobank|csrd|csddd)\b/i;

function isUncertainText(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (typeof value === 'number' && Number.isFinite(value)) return false;
  const text = String(value).trim();
  if (!text) return true;
  return UNCERTAIN_RE.test(text) || ['none', 'null', 'undefined', '-', 'unknown'].includes(text.toLowerCase());
}

function unwrap(field: unknown): unknown {
  if (field && typeof field === 'object' && !Array.isArray(field) && 'waarde' in (field as object)) {
    return (field as { waarde?: unknown }).waarde;
  }
  return field;
}

function fieldBron(field: unknown): string | undefined {
  if (!field || typeof field !== 'object') return undefined;
  const bronnen = (field as { bronnen?: Array<{ url?: string; citaat?: string }> }).bronnen;
  if (!Array.isArray(bronnen) || bronnen.length === 0) return undefined;
  return bronnen[0]?.url || bronnen[0]?.citaat || undefined;
}

function fieldStatus(field: unknown): string {
  if (!field || typeof field !== 'object') return '';
  return String((field as { status?: string }).status || '').toLowerCase();
}

function parseNumber(raw: unknown): number | null {
  const value = unwrap(raw);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  if (isUncertainText(value)) return null;
  const cleaned = value
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function listOf(field: unknown): string[] {
  const value = unwrap(field);
  if (Array.isArray(value)) return value.map((item) => String(unwrap(item) ?? '')).filter((s) => s && !isUncertainText(s));
  if (typeof value === 'string' && !isUncertainText(value)) {
    return value.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function firstSource(...candidates: Array<string | undefined>): string | undefined {
  return candidates.find((s) => s && !isUncertainText(s));
}

function item(
  id: string,
  category: string,
  status: LegislationStatus,
  reasons: string[],
  extra: Partial<LegislationItem> = {}
): LegislationItem {
  const needed = extra.needed;
  return {
    id,
    category,
    status,
    label: LEGISLATION_STATUS_LABEL[status],
    color: LEGISLATION_STATUS_COLOR[status],
    reasons,
    question: extra.question || (status === 'te_onderzoeken' && needed ? needed : extra.question),
    documentRequest: extra.documentRequest,
    source: extra.source,
    needed,
    notes: extra.notes,
  };
}

function triState(field: unknown): 'yes' | 'no' | 'unknown' {
  const value = unwrap(field);
  const status = fieldStatus(field);
  const bron = fieldBron(field);
  if (value == null || isUncertainText(value)) return 'unknown';
  const text = String(value).trim().toLowerCase();
  if (/mogelijk|onzeker|twijfel|wellicht/.test(text)) return 'unknown';
  const yes = /^(ja|yes|true|1)$/.test(text) || text.startsWith('ja');
  const no = /^(nee|no|false|0)$/.test(text) || text.startsWith('nee');
  if (yes) return status === 'onbekend' ? 'unknown' : 'yes';
  if (no) {
    if (status === 'afgeleid' && !bron) return 'unknown';
    if (status === 'onbekend') return 'unknown';
    return 'no';
  }
  return 'unknown';
}

export interface LegislationFacts {
  fte: number | null;
  fteSource?: string;
  omzet: number | null;
  omzetSource?: string;
  balanstotaal: number | null;
  sector: string;
  products: string[];
  productsSource?: string;
  productsIdentified: boolean;
  energyKwh: number | null;
  gasM3: number | null;
  importTon: number | null;
  eudrSignal: 'yes' | 'no' | 'unknown';
  eudrSource?: string;
  cbamSignal: 'yes' | 'no' | 'unknown';
  cbamSource?: string;
  bouwInfra: 'yes' | 'no' | 'unknown';
  bouwInfraSource?: string;
  referenties: string[];
  klanttypen: string[];
  tendertreffers: string[];
  levertAan: string;
  levertAanSource?: string;
}

function extractFacts(client: any = {}, dossier: any = {}): LegislationFacts {
  const onderzoek = dossier?.onderzoek || (dossier?.profiel ? dossier : {}) || {};
  const basis = dossier?.basis || {};
  const profiel = onderzoek.profiel || {};
  const extra = onderzoek.extra || {};
  const keten = onderzoek.ketenrisico || onderzoek.ketenrisico_signalen || {};
  const klanteisen = onderzoek.klanteisen || {};

  const fteField = profiel.aantal_medewerkers ?? basis.aantal_medewerkers ?? client.aantal_medewerkers;
  const omzetField = profiel.omzet ?? basis.omzet ?? client.omzet;
  const productField = profiel.producten_diensten ?? basis.producten;
  const products = listOf(productField);
  const referenties = listOf(profiel.belangrijkste_klanten_referenties);

  const klanttypen = [
    ...listOf(klanteisen.klanttypen),
    ...(Array.isArray(klanteisen.klanttypen)
      ? klanteisen.klanttypen.map((k: any) => k.klanttype || k.naam || k).filter(Boolean)
      : []),
  ].map(String);

  const tendertreffers = (klanteisen.tendertreffers || klanteisen.concrete_tenders || []).map((t: any) =>
    [t.tender_titel, t.tender, t.opdrachtgever, t.eis_gesteld, t.eis].filter(Boolean).join(' ')
  );

  return {
    fte: parseNumber(fteField),
    fteSource: firstSource(fieldBron(profiel.aantal_medewerkers), fieldBron(basis), basis.aantal_medewerkers_source, 'KvK / jaarrekening'),
    omzet: parseNumber(omzetField),
    omzetSource: firstSource(fieldBron(profiel.omzet), basis.omzet_source),
    balanstotaal: parseNumber(profiel.balanstotaal ?? basis.balanstotaal ?? client.balanstotaal),
    sector: String(unwrap(profiel.sector) || unwrap(basis.sector) || client.sector || ''),
    products,
    productsSource: firstSource(fieldBron(profiel.producten_diensten), basis.producten_source),
    productsIdentified: products.length > 0,
    energyKwh: parseNumber(extra.energy_kwh ?? extra.elektriciteit_kwh ?? client.energy_kwh),
    gasM3: parseNumber(extra.gas_m3 ?? extra.aardgas_m3 ?? client.gas_m3),
    importTon: parseNumber(extra.import_volume_ton ?? keten.cbam_tonnage ?? client.import_volume_ton),
    eudrSignal: triState(keten.eudr),
    eudrSource: fieldBron(keten.eudr),
    cbamSignal: triState(keten.cbam),
    cbamSource: fieldBron(keten.cbam),
    bouwInfra: triState(keten.bouw_infra_gww),
    bouwInfraSource: fieldBron(keten.bouw_infra_gww),
    referenties,
    klanttypen,
    tendertreffers,
    levertAan: String(unwrap(keten.levert_aan_grote_ondernemingen_of_overheid) || ''),
    levertAanSource: fieldBron(keten.levert_aan_grote_ondernemingen_of_overheid),
  };
}

function matchesAny(texts: string[], re: RegExp): boolean {
  return texts.some((t) => re.test(t));
}

function goodsHit(products: string[], goods: string[]): string[] {
  const lower = products.map((p) => p.toLowerCase());
  return goods.filter((g) => lower.some((p) => p.includes(g)));
}

function looksLikeServicesOnly(products: string[], sector: string): boolean {
  if (!products.length) return false;
  const blob = `${products.join(' ')} ${sector}`.toLowerCase();
  const service = /advies|consultancy|management|directievoering|ontwerp|ingenieurs|software|diensten|projectmanagement/;
  const commodity = [...EUDR_GOODS, ...CBAM_GOODS].some((g) => blob.includes(g));
  return service.test(blob) && !commodity;
}

export function analyzeClientTypes(facts: LegislationFacts): {
  governmentOrTender: boolean;
  constructionInfra: boolean;
  largePrivate: boolean;
  evidence: string[];
} {
  const corpus = [
    facts.sector,
    facts.levertAan,
    ...facts.referenties,
    ...facts.klanttypen,
    ...facts.tendertreffers,
    ...facts.products,
  ].filter(Boolean);

  const governmentOrTender =
    matchesAny(corpus, GOV_CLIENT_RE) ||
    facts.tendertreffers.length > 0 ||
    /overheid|gemeente|waterschap/.test(facts.levertAan.toLowerCase());
  const constructionInfra = facts.bouwInfra === 'yes' || matchesAny(corpus, INFRA_CLIENT_RE);
  const largePrivate = matchesAny(corpus, LARGE_CLIENT_RE);

  const evidence: string[] = [];
  if (facts.bouwInfra === 'yes' && facts.bouwInfraSource) evidence.push(facts.bouwInfraSource);
  if (facts.levertAanSource && governmentOrTender) evidence.push(facts.levertAanSource);
  if (facts.referenties[0]) evidence.push(`referentie: ${facts.referenties[0]}`);
  if (facts.tendertreffers[0]) evidence.push('TenderNed-treffer');

  return { governmentOrTender, constructionInfra, largePrivate, evidence };
}

function assessAndThreshold(opts: {
  id: string;
  category: string;
  a: number | null;
  b: number | null;
  aMin: number;
  bMin: number;
  aLabel: string;
  bLabel: string;
  aSource?: string;
  bSource?: string;
  notes?: string[];
}): LegislationItem {
  const { a, b } = opts;
  const aFail = a != null && a <= opts.aMin;
  const bFail = b != null && b <= opts.bMin;
  const aPass = a != null && a > opts.aMin;
  const bPass = b != null && b > opts.bMin;

  if (aPass && bPass) {
    return item(opts.id, opts.category, 'van_toepassing', [
      `${opts.aLabel} ${a} > ${opts.aMin} én ${opts.bLabel} ${b} > ${opts.bMin}`,
    ], { source: firstSource(opts.aSource, opts.bSource), notes: opts.notes });
  }
  if (aFail || bFail) {
    const reasons = [
      aFail ? `${opts.aLabel} ${a} ligt onder de drempel van ${opts.aMin}` : null,
      bFail ? `${opts.bLabel} onder drempel` : null,
    ].filter(Boolean) as string[];
    return item(opts.id, opts.category, 'niet_van_toepassing', reasons, {
      source: aFail ? opts.aSource : opts.bSource,
      notes: opts.notes,
    });
  }
  const missing = [
    a == null ? opts.aLabel : null,
    b == null ? opts.bLabel : null,
  ].filter(Boolean) as string[];
  const needed = `Nodig: ${missing.join(' en ')} uit KvK-uittreksel of jaarrekening om ${opts.category}-plicht te bepalen.`;
  return item(opts.id, opts.category, 'te_onderzoeken', ['Onvoldoende gegevens'], {
    needed,
    question: needed,
    documentRequest: `KvK-uittreksel of laatste jaarrekening met ${missing.join(' en ')}`,
    notes: opts.notes,
  });
}

function mkbCategory(facts: LegislationFacts): { category: string; reason: string } {
  if (facts.fte == null) return { category: 'onbekend', reason: 'FTE onbekend' };
  if (facts.fte < 10) return { category: 'micro', reason: `<10 FTE (${facts.fte})` };
  if (facts.fte < 50) return { category: 'klein', reason: `<50 FTE (${facts.fte})` };
  if (facts.fte < 250) return { category: 'middelgroot', reason: `<250 FTE (${facts.fte})` };
  return { category: 'groot', reason: `≥250 FTE (${facts.fte})` };
}

export function summarizeLegislation(items: LegislationItem[]): string {
  const order: LegislationStatus[] = [
    'van_toepassing',
    'te_onderzoeken',
    'indirect_via_keten',
    'vrijwillig',
    'niet_van_toepassing',
  ];
  const short: Record<LegislationStatus, string> = {
    van_toepassing: 'van toepassing',
    te_onderzoeken: 'te onderzoeken',
    indirect_via_keten: 'via keten',
    vrijwillig: 'vrijwillig',
    niet_van_toepassing: 'niet van toepassing',
  };
  const parts = order
    .map((status) => {
      const n = items.filter((i) => i.status === status).length;
      return n ? `${n} ${short[status]}` : null;
    })
    .filter(Boolean);
  return parts.join(', ');
}

export function assessLegislation(client: any = {}, dossier: any = {}): LegislationAssessment {
  const facts = extractFacts(client, dossier);
  const clients = analyzeClientTypes(facts);
  const items: LegislationItem[] = [];

  const csrd = assessAndThreshold({
    id: 'csrd',
    category: 'CSRD',
    a: facts.fte,
    b: facts.omzet,
    aMin: 1000,
    bMin: 450_000_000,
    aLabel: 'FTE',
    bLabel: 'netto-omzet',
    aSource: facts.fteSource,
    bSource: facts.omzetSource,
    notes: ['Na Omnibus I: >1000 FTE én netto-omzet >€450 mln. Beursgenoteerd MKB valt niet meer onder CSRD.'],
  });
  items.push(csrd);

  if (facts.fte == null) {
    items.push(
      item('value_chain_cap', 'Value-chain cap', 'te_onderzoeken', ['FTE onbekend'], {
        needed: 'Nodig: aantal FTE (KvK / jaarrekening) om te bepalen of de value-chain cap (≤1000 FTE) geldt.',
        question: 'Nodig: aantal FTE (KvK / jaarrekening) om te bepalen of de value-chain cap (≤1000 FTE) geldt.',
        documentRequest: 'KvK-uittreksel of jaarrekening met aantal medewerkers (FTE)',
      })
    );
  } else if (facts.fte <= 1000) {
    items.push(
      item(
        'value_chain_cap',
        'Value-chain cap',
        'vrijwillig',
        [`≤1000 FTE (${facts.fte}): hoeft grote klanten niet meer te leveren dan de VSME-standaard`],
        { source: facts.fteSource, notes: ['Verkoopargument: VSME-rapportage is voldoende voor grote afnemers.'] }
      )
    );
  } else {
    items.push(
      item('value_chain_cap', 'Value-chain cap', 'niet_van_toepassing', [`>1000 FTE (${facts.fte}): value-chain cap niet van toepassing`], {
        source: facts.fteSource,
      })
    );
  }

  const csdddLegal = assessAndThreshold({
    id: 'csddd',
    category: 'CSDDD',
    a: facts.fte,
    b: facts.omzet,
    aMin: 5000,
    bMin: 1_500_000_000,
    aLabel: 'FTE',
    bLabel: 'netto-omzet',
    aSource: facts.fteSource,
    bSource: facts.omzetSource,
    notes: ['Na Omnibus: >5000 FTE én >€1,5 mrd omzet; toepassing vanaf 2029.'],
  });
  if (csdddLegal.status === 'niet_van_toepassing' && clients.largePrivate) {
    items.push(
      item('csddd', 'CSDDD', 'indirect_via_keten', [
        ...csdddLegal.reasons,
        'Grote klanten of banken kunnen CSDDD-clausules in contracten opnemen.',
      ], { source: csdddLegal.source, notes: csdddLegal.notes })
    );
  } else {
    items.push(csdddLegal);
  }

  items.push({
    ...csrd,
    id: 'eu_taxonomie',
    category: 'EU Taxonomie',
    notes: ['Volgt CSRD-scope'],
    needed: csrd.status === 'te_onderzoeken' ? csrd.needed : undefined,
    question: csrd.status === 'te_onderzoeken' ? csrd.question : undefined,
    documentRequest: csrd.status === 'te_onderzoeken' ? csrd.documentRequest : undefined,
  });

  const eudrHits = goodsHit(facts.products, EUDR_GOODS);
  if (facts.eudrSignal === 'yes' || eudrHits.length > 0) {
    items.push(
      item('eudr', 'EUDR', 'van_toepassing', [
        eudrHits.length ? `EUDR-goederen: ${eudrHits.join(', ')}` : 'Ketenrisico-signaal: wel EUDR-goederen',
      ], { source: facts.eudrSource || facts.productsSource })
    );
  } else if (!facts.productsIdentified && facts.eudrSignal !== 'no') {
    items.push(
      item('eudr', 'EUDR', 'te_onderzoeken', ['Geen producten geïdentificeerd'], {
        needed:
          'Nodig: welke producten of grondstoffen (soja, palmolie, rundvee, cacao, koffie, rubber, hout) op de EU-markt worden gebracht?',
        question:
          'Nodig: welke producten of grondstoffen (soja, palmolie, rundvee, cacao, koffie, rubber, hout) op de EU-markt worden gebracht?',
        documentRequest: 'Product-/inkooplijst met grondstoffen die onder EUDR vallen (soja, palmolie, rundvee, cacao, koffie, rubber, hout)',
      })
    );
  } else if (facts.eudrSignal === 'no' && facts.eudrSource) {
    items.push(
      item('eudr', 'EUDR', 'niet_van_toepassing', ['Sector/producten vallen buiten EUDR-goederen'], {
        source: facts.eudrSource,
      })
    );
  } else if (facts.productsIdentified && eudrHits.length === 0 && looksLikeServicesOnly(facts.products, facts.sector)) {
    items.push(
      item('eudr', 'EUDR', 'niet_van_toepassing', [
        `Geïdentificeerde activiteiten (${facts.products.slice(0, 4).join(', ')}) zijn geen EUDR-goederen`,
      ], { source: facts.productsSource })
    );
  } else {
    items.push(
      item('eudr', 'EUDR', 'te_onderzoeken', ['Onvoldoende gegevens om EUDR-scope uit te sluiten'], {
        needed:
          'Nodig: welke producten of grondstoffen (soja, palmolie, rundvee, cacao, koffie, rubber, hout) op de EU-markt worden gebracht?',
        question:
          'Nodig: welke producten of grondstoffen (soja, palmolie, rundvee, cacao, koffie, rubber, hout) op de EU-markt worden gebracht?',
        documentRequest: 'Product-/inkooplijst met grondstoffen die onder EUDR vallen',
      })
    );
  }

  const cbamHits = goodsHit(facts.products, CBAM_GOODS);
  const cbamNeeded =
    'Nodig: worden CBAM-goederen (staal, aluminium, cement, kunstmest, waterstof, elektriciteit) buiten de EU ingekocht en is dat meer dan 50 ton per jaar?';
  if ((facts.cbamSignal === 'yes' || cbamHits.length > 0) && !(facts.importTon != null && facts.importTon < 50)) {
    items.push(
      item('cbam', 'CBAM', 'van_toepassing', [
        cbamHits.length ? `CBAM-goederen: ${cbamHits.join(', ')}` : 'Import van CBAM-goederen vastgesteld',
      ], { source: facts.cbamSource || facts.productsSource })
    );
  } else if (facts.importTon != null && facts.importTon < 50 && (facts.cbamSignal === 'yes' || cbamHits.length > 0)) {
    items.push(
      item('cbam', 'CBAM', 'niet_van_toepassing', [`Import CBAM-goederen <50 ton/jaar (${facts.importTon} t)`], {
        source: facts.cbamSource,
      })
    );
  } else if (facts.cbamSignal === 'no' && facts.cbamSource) {
    items.push(
      item('cbam', 'CBAM', 'niet_van_toepassing', ['Aangetoond dat er geen CBAM-goederen buiten de EU worden ingekocht'], {
        source: facts.cbamSource,
      })
    );
  } else {
    items.push(
      item('cbam', 'CBAM', 'te_onderzoeken', ['Onvoldoende gegevens over import van CBAM-goederen'], {
        needed: cbamNeeded,
        question: cbamNeeded,
        documentRequest:
          'Inkoopoverzicht CBAM-goederen (staal, aluminium, cement, kunstmest, waterstof, elektriciteit) van buiten de EU, met tonnage per jaar',
      })
    );
  }

  const kwh = facts.energyKwh;
  const m3 = facts.gasM3;
  const energyNeeded = 'Nodig: energieverbruik elektriciteit (kWh) en gas (m³) per vestiging';
  if ((kwh != null && kwh >= 50_000) || (m3 != null && m3 >= 25_000)) {
    const reasons = [
      kwh != null && kwh >= 50_000 ? `≥50.000 kWh (${kwh.toLocaleString('nl-NL')} kWh)` : null,
      m3 != null && m3 >= 25_000 ? `≥25.000 m³ (${m3.toLocaleString('nl-NL')} m³)` : null,
    ].filter(Boolean) as string[];
    items.push(item('energiebesparingsplicht', 'Energiebesparingsplicht', 'van_toepassing', reasons));
  } else if (kwh != null && m3 != null && kwh < 50_000 && m3 < 25_000) {
    items.push(
      item('energiebesparingsplicht', 'Energiebesparingsplicht', 'niet_van_toepassing', [
        `Onder drempel: ${kwh.toLocaleString('nl-NL')} kWh en ${m3.toLocaleString('nl-NL')} m³`,
      ])
    );
  } else {
    items.push(
      item('energiebesparingsplicht', 'Energiebesparingsplicht', 'te_onderzoeken', ['Energieverbruik onbekend'], {
        needed: energyNeeded,
        question: energyNeeded,
        documentRequest: 'Energierekeningen per vestiging: elektriciteit (kWh) en gas (m³) over het laatste kalenderjaar',
      })
    );
  }

  if (clients.governmentOrTender || clients.constructionInfra) {
    const why = [
      clients.constructionInfra ? 'bouw-, infra- of GWW-opdrachten' : null,
      clients.governmentOrTender ? 'overheid of aanbestedingen' : null,
    ]
      .filter(Boolean)
      .join(' en ');
    items.push(
      item('co2_prestatieladder', 'CO2-Prestatieladder', 'indirect_via_keten', [
        `Gunningsvoordeel bij ${why} (geen wettelijke plicht)`,
      ], {
        source: clients.evidence[0],
        notes: ['Geen wet, wel gunningsvoordeel bij Rijk, ProRail en veel gemeenten.'],
      })
    );
  } else {
    items.push(
      item('co2_prestatieladder', 'CO2-Prestatieladder', 'te_onderzoeken', [
        'Geen overheid- of aanbestedingsklant aangetoond; zonder klanttype-analyse niet af te doen als niet-relevant.',
      ], {
        needed:
          'Nodig: overzicht van opdrachtgevers en TenderNed-aanbestedingen om te beoordelen of CO2-Prestatieladder gunningsvoordeel oplevert.',
        question:
          'Nodig: overzicht van opdrachtgevers en TenderNed-aanbestedingen om te beoordelen of CO2-Prestatieladder gunningsvoordeel oplevert.',
        documentRequest: 'Overzicht opdrachtgevers en aanbestedingen (TenderNed) inclusief gevraagde CO2-Prestatieladder-niveaus',
      })
    );
  }

  for (const row of items) {
    if (row.status === 'niet_van_toepassing' && row.reasons.some((r) => isUncertainText(r))) {
      row.status = 'te_onderzoeken';
      row.label = LEGISLATION_STATUS_LABEL.te_onderzoeken;
      row.color = LEGISLATION_STATUS_COLOR.te_onderzoeken;
    }
  }

  const counts = {
    van_toepassing: 0,
    niet_van_toepassing: 0,
    te_onderzoeken: 0,
    indirect_via_keten: 0,
    vrijwillig: 0,
  } as Record<LegislationStatus, number>;
  items.forEach((row) => {
    counts[row.status] += 1;
  });

  const teOnderzoeken = items.filter((row) => row.status === 'te_onderzoeken');
  return {
    items,
    summary: summarizeLegislation(items),
    counts,
    questions: teOnderzoeken.map((row) => row.question || row.needed || `${row.category}: te onderzoeken`).filter(Boolean) as string[],
    documentRequests: teOnderzoeken.map((row) => row.documentRequest).filter(Boolean) as string[],
    mkbCategory: mkbCategory(facts),
    referenceDate: ESG_REFERENCE_DATE,
    disclaimer: ESG_DISCLAIMER,
  };
}

export function extractLegislationFactsForTest(client: any, dossier: any): LegislationFacts {
  return extractFacts(client, dossier);
}
