/**
 * Deterministic wetgeving & drempel status from stored dossier data.
 * Never uses an LLM. Missing/uncertain inputs → TE ONDERZOEKEN, never NVT.
 */
import { getLegalSourceDisplay, WETGEVING_PEILDATUM, WETGEVING_THRESHOLDS } from './wetgeving-bronnen.ts';
import type { LegalSourceDisplay } from './wetgeving-types.ts';

export const ESG_REFERENCE_DATE = WETGEVING_PEILDATUM;
export const ESG_DISCLAIMER = 'Indicatief, geen juridisch advies';

const T = WETGEVING_THRESHOLDS;

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
  legal?: LegalSourceDisplay;
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

const EUDR_GOODS = ['soja', 'palmolie', 'rundvee', 'cacao', 'koffie', 'rubber', 'hout', 'papier', 'cattle', 'palm oil', 'paper', 'wood'];
const CBAM_GOODS = ['staal', 'aluminium', 'cement', 'kunstmest', 'waterstof', 'elektriciteit', 'steel', 'aluminum', 'fertilizer', 'hydrogen'];
const EUDR_NEEDED =
  'Nodig: worden EUDR-goederen (hout, papier, soja, palmolie, rubber, cacao, koffie, rundvee) of producten daarvan in de EU gebracht of geëxporteerd?';
const FTE_OMZET_NEEDED = 'Nodig: aantal FTE en netto-omzet uit KvK/jaarrekening (laatste boekjaar)';

/** 2-digit SBI prefixes that are demonstrably services (no EUDR commodity placing). */
const PURE_SERVICE_SBI = new Set([
  '62', '63',
  '69', '70', '71', '72', '73', '74', '75',
  '78', '82',
  '85', '86', '87', '88',
  '94', '96',
]);

const HARD_SOURCE_RE = /kvk|kamer van koophandel|jaarrekening|jaarverslag|annual accounts|annual report/i;
const ESTIMATE_HOST_RE = /drimble|linkedin|creditsafe|graydon/i;
const COMPANY_INFO_RE = /company\.info|companyinfo/i;
const ESTIMATE_VALUE_RE = /\bca\.?\b|\bcirca\b|\bongeveer\b|\bschatting\b|\bestimate\b|\d+\s*[–\-]\s*\d+/i;
const UNRELIABLE_VALIDATIE_RE = /niet_controleerbaar|\bonzeker\b/;

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

function looksLikeEstimateValue(raw: unknown): boolean {
  const value = unwrap(raw);
  return typeof value === 'string' && ESTIMATE_VALUE_RE.test(value);
}

function collectValidatie(field: unknown): string {
  if (!field || typeof field !== 'object') return '';
  const direct = String((field as { validatie?: string }).validatie || '');
  const bronnen = (field as { bronnen?: Array<{ validatie?: string }> }).bronnen || [];
  return [direct, ...bronnen.map((b) => b?.validatie || '')].filter(Boolean).join(' ').toLowerCase();
}

function collectSourceBlob(field: unknown, extra: string[] = []): string {
  const parts = [...extra];
  if (field && typeof field === 'object') {
    const obj = field as { status?: string; toelichting?: string; bronnen?: Array<{ url?: string; citaat?: string; validatie?: string }> };
    if (obj.status) parts.push(String(obj.status));
    if (obj.toelichting) parts.push(String(obj.toelichting));
    for (const bron of obj.bronnen || []) {
      if (bron?.url) parts.push(bron.url);
      if (bron?.citaat) parts.push(bron.citaat);
    }
  }
  return parts.filter(Boolean).join(' ');
}

function editedPaths(client: any = {}, dossier: any = {}): string[] {
  const raw = client?.edited_fields ?? dossier?.edited_fields ?? [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isManuallyEntered(field: unknown, paths: string[], edited: string[]): boolean {
  const status = fieldStatus(field);
  if (/handmatig/.test(status)) return true;
  return paths.some((p) => edited.some((e) => e === p || e.endsWith(`.${p}`) || e.includes(p)));
}

/** Official FTE/omzet: KvK, jaarrekening, or manual entry, and not an unreliable validation. */
function isHardOfficialMetric(field: unknown, extraSources: string[], edited: boolean): boolean {
  if (parseNumber(field) == null) return false;
  if (UNRELIABLE_VALIDATIE_RE.test(collectValidatie(field))) return false;
  if (looksLikeEstimateValue(field)) return false;
  const blob = collectSourceBlob(field, extraSources);
  if (ESTIMATE_HOST_RE.test(blob) && !edited) return false;
  if (COMPANY_INFO_RE.test(blob) && /schatting|estimate|raming/i.test(blob) && !edited) return false;
  return edited || HARD_SOURCE_RE.test(blob);
}

function extractSbiCodes(field: unknown, extra: string[] = []): { codes: string[]; source?: string } {
  const blob = `${collectSourceBlob(field, extra)} ${String(unwrap(field) || '')}`;
  const five = [...blob.matchAll(/\b(\d{5})\b/g)].map((m) => m[1]);
  const dotted = [...blob.matchAll(/\b(\d{2}\.\d{2}\.?\d?)\b/g)].map((m) => m[1].replace(/\D/g, ''));
  let codes = [...new Set([...five, ...dotted])];
  if (!codes.length) {
    codes = [...new Set([...blob.matchAll(/sbi[^0-9]{0,20}(\d{2})\b/gi)].map((m) => m[1]))];
  }
  codes = codes.filter((c) => {
    const n = Number(c.slice(0, 2));
    return n >= 1 && n <= 99 && !/^(19|20)\d{2}$/.test(c);
  });
  const official = fieldBron(field) || extra.find((s) => s && !isUncertainText(s));
  const label = codes.length ? `SBI ${codes.join(' / ')}` : undefined;
  return { codes, source: label || official };
}

function isPureServiceSbi(codes: string[]): boolean {
  if (!codes.length) return false;
  return codes.every((code) => PURE_SERVICE_SBI.has(code.slice(0, 2)));
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
  fteHard: boolean;
  fteSource?: string;
  omzet: number | null;
  omzetHard: boolean;
  omzetSource?: string;
  balanstotaal: number | null;
  sector: string;
  sbiCodes: string[];
  sbiSource?: string;
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

  const edited = editedPaths(client, dossier);
  const fteEdited = isManuallyEntered(fteField, ['aantal_medewerkers', 'onderzoek.profiel.aantal_medewerkers'], edited);
  const omzetEdited = isManuallyEntered(omzetField, ['omzet', 'onderzoek.profiel.omzet'], edited);
  const sbiField = profiel.sbi ?? basis.sbi ?? client.sbi;
  const sbi = extractSbiCodes(sbiField, [basis.sbi_source, String(unwrap(profiel.sbi) || ''), String(unwrap(basis.sbi) || '')]);

  return {
    fte: parseNumber(fteField),
    fteHard: isHardOfficialMetric(fteField, [basis.aantal_medewerkers_source, client.aantal_medewerkers_source], fteEdited),
    fteSource: firstSource(fieldBron(profiel.aantal_medewerkers), basis.aantal_medewerkers_source, client.aantal_medewerkers_source),
    omzet: parseNumber(omzetField),
    omzetHard: isHardOfficialMetric(omzetField, [basis.omzet_source, client.omzet_source], omzetEdited),
    omzetSource: firstSource(fieldBron(profiel.omzet), basis.omzet_source, client.omzet_source),
    balanstotaal: parseNumber(profiel.balanstotaal ?? basis.balanstotaal ?? client.balanstotaal),
    sector: String(unwrap(profiel.sector) || unwrap(basis.sector) || client.sector || ''),
    sbiCodes: sbi.codes,
    sbiSource: sbi.source,
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
  return item(opts.id, opts.category, 'te_onderzoeken', ['Onvoldoende gegevens'], {
    needed: FTE_OMZET_NEEDED,
    question: FTE_OMZET_NEEDED,
    documentRequest: `KvK-uittreksel of laatste jaarrekening met ${missing.join(' en ') || 'FTE en netto-omzet'}`,
    notes: opts.notes,
  });
}

function mkbCategory(facts: LegislationFacts): { category: string; reason: string } {
  if (facts.fte == null) return { category: 'onbekend', reason: 'FTE onbekend' };
  const omzetOverMicro = facts.omzet != null && facts.omzet > T.MICRO_OMZET;
  const balansOverMicro = facts.balanstotaal != null && facts.balanstotaal > T.MICRO_BALANS;
  if (facts.fte < T.MICRO_FTE && !(omzetOverMicro && balansOverMicro)) {
    return { category: 'micro', reason: `<${T.MICRO_FTE} FTE (${facts.fte}); jaarrekening micro ≤€450k balans / ≤€900k omzet` };
  }
  if (facts.fte < T.KLEIN_FTE) return { category: 'klein', reason: `<${T.KLEIN_FTE} FTE (${facts.fte})` };
  if (facts.fte < T.MIDDEL_FTE) return { category: 'middelgroot', reason: `<${T.MIDDEL_FTE} FTE (${facts.fte})` };
  return { category: 'groot', reason: `≥${T.MIDDEL_FTE} FTE (${facts.fte})` };
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
    a: facts.fteHard ? facts.fte : null,
    b: facts.omzetHard ? facts.omzet : null,
    aMin: T.CSRD_FTE,
    bMin: T.CSRD_OMZET,
    aLabel: 'FTE',
    bLabel: 'netto-omzet',
    aSource: facts.fteHard ? facts.fteSource : undefined,
    bSource: facts.omzetHard ? facts.omzetSource : undefined,
    notes: [
      'Na Omnibus I (EU) 2026/470, in werking 18-03-2026: >1000 werknemers én >€450 mln omzet (2013/34 art. 19 bis / 29 bis). NL-implementatiewet 36 678 nog in behandeling.',
    ],
  });
  items.push(csrd);

  const valueChainNotes = [
    '2013/34 art. 19 bis lid 3 + Gedelegeerde Verordening (EU) 2026/1560 (VSME); beschermd ≤1000 werknemers; plafond vanaf boekjaar 2027.',
  ];
  if (facts.fte == null) {
    items.push(
      item('value_chain_cap', 'Value-chain cap', 'te_onderzoeken', ['FTE onbekend'], {
        needed: `Nodig: aantal FTE (KvK / jaarrekening) om te bepalen of de value-chain cap (≤${T.VALUE_CHAIN_FTE} FTE) geldt.`,
        question: `Nodig: aantal FTE (KvK / jaarrekening) om te bepalen of de value-chain cap (≤${T.VALUE_CHAIN_FTE} FTE) geldt.`,
        documentRequest: 'KvK-uittreksel of jaarrekening met aantal medewerkers (FTE)',
        notes: valueChainNotes,
      })
    );
  } else if (facts.fte <= T.VALUE_CHAIN_FTE) {
    items.push(
      item(
        'value_chain_cap',
        'Value-chain cap',
        'vrijwillig',
        [`≤${T.VALUE_CHAIN_FTE} FTE (${facts.fte}): hoeft grote klanten niet meer te leveren dan de VSME-standaard`],
        { source: facts.fteSource, notes: [...valueChainNotes, 'Verkoopargument: VSME-rapportage is voldoende voor grote afnemers.'] }
      )
    );
  } else if (facts.fteHard) {
    items.push(
      item('value_chain_cap', 'Value-chain cap', 'niet_van_toepassing', [`>${T.VALUE_CHAIN_FTE} FTE (${facts.fte}): value-chain cap niet van toepassing`], {
        source: facts.fteSource,
        notes: valueChainNotes,
      })
    );
  } else {
    items.push(
      item('value_chain_cap', 'Value-chain cap', 'te_onderzoeken', [`FTE >${T.VALUE_CHAIN_FTE} is niet uit KvK/jaarrekening bevestigd`], {
        needed: FTE_OMZET_NEEDED,
        question: FTE_OMZET_NEEDED,
        documentRequest: 'KvK-uittreksel of jaarrekening met aantal medewerkers (FTE)',
        notes: valueChainNotes,
      })
    );
  }

  const csdddLegal = assessAndThreshold({
    id: 'csddd',
    category: 'CSDDD',
    a: facts.fteHard ? facts.fte : null,
    b: facts.omzetHard ? facts.omzet : null,
    aMin: T.CSDDD_FTE,
    bMin: T.CSDDD_OMZET,
    aLabel: 'FTE',
    bLabel: 'netto-omzet',
    aSource: facts.fteHard ? facts.fteSource : undefined,
    bSource: facts.omzetHard ? facts.omzetSource : undefined,
    notes: [`Na Omnibus I: >${T.CSDDD_FTE} werknemers én >€1,5 mrd omzet; toepassing vanaf ${T.CSDDD_APPLIES_LABEL}.`],
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
    notes: ['Volgt CSRD-scope (Taxonomieverordening art. 8 → 2013/34 art. 19 bis / 29 bis).'],
    needed: csrd.status === 'te_onderzoeken' ? csrd.needed : undefined,
    question: csrd.status === 'te_onderzoeken' ? csrd.question : undefined,
    documentRequest: csrd.status === 'te_onderzoeken' ? csrd.documentRequest : undefined,
    legal: undefined,
  });

  const eudrHits = goodsHit(facts.products, EUDR_GOODS);
  const eudrDoc = 'Product-/inkooplijst met EUDR-goederen (hout, papier, soja, palmolie, rubber, cacao, koffie, rundvee) of producten daarvan';
  const eudrNotes = ['Van toepassing 30-12-2026; micro- en kleine ondernemingen 30-06-2027.'];
  if (facts.eudrSignal === 'yes' || eudrHits.length > 0) {
    items.push(
      item('eudr', 'EUDR', 'van_toepassing', [
        eudrHits.length ? `EUDR-goederen: ${eudrHits.join(', ')}` : 'Ketenrisico-signaal: wel EUDR-goederen',
      ], { source: facts.eudrSource || facts.productsSource, notes: eudrNotes })
    );
  } else if (isPureServiceSbi(facts.sbiCodes)) {
    items.push(
      item('eudr', 'EUDR', 'niet_van_toepassing', [
        `SBI ${facts.sbiCodes.join(' / ')} is een dienstensector, geen EUDR-goederen`,
      ], { source: facts.sbiSource, notes: eudrNotes })
    );
  } else if (facts.eudrSignal === 'no' && facts.eudrSource && HARD_SOURCE_RE.test(facts.eudrSource)) {
    items.push(
      item('eudr', 'EUDR', 'niet_van_toepassing', ['Sector/producten vallen buiten EUDR-goederen'], {
        source: facts.eudrSource,
        notes: eudrNotes,
      })
    );
  } else {
    const reason = !facts.productsIdentified
      ? 'Geen producten geïdentificeerd'
      : 'Website-tekst alleen is onvoldoende om EUDR uit te sluiten';
    items.push(
      item('eudr', 'EUDR', 'te_onderzoeken', [reason], {
        needed: EUDR_NEEDED,
        question: EUDR_NEEDED,
        documentRequest: eudrDoc,
        notes: eudrNotes,
      })
    );
  }

  const cbamHits = goodsHit(facts.products, CBAM_GOODS);
  const cbamNeeded =
    `Nodig: worden CBAM-goederen (staal, aluminium, cement, kunstmest, waterstof, elektriciteit) buiten de EU ingekocht en is dat meer dan ${T.CBAM_TON} ton per jaar?`;
  const cbamNotes = [
    `${T.CBAM_TON} ton nettomassa per jaar (art. 2 bis + bijlage VII); eerste jaarlijkse aangifte 30-09-2027.`,
  ];
  if ((facts.cbamSignal === 'yes' || cbamHits.length > 0) && !(facts.importTon != null && facts.importTon < T.CBAM_TON)) {
    items.push(
      item('cbam', 'CBAM', 'van_toepassing', [
        cbamHits.length ? `CBAM-goederen: ${cbamHits.join(', ')}` : 'Import van CBAM-goederen vastgesteld',
      ], { source: facts.cbamSource || facts.productsSource, notes: cbamNotes })
    );
  } else if (facts.importTon != null && facts.importTon < T.CBAM_TON && (facts.cbamSignal === 'yes' || cbamHits.length > 0)) {
    items.push(
      item('cbam', 'CBAM', 'niet_van_toepassing', [`Import CBAM-goederen <${T.CBAM_TON} ton/jaar (${facts.importTon} t)`], {
        source: facts.cbamSource,
        notes: cbamNotes,
      })
    );
  } else if (facts.cbamSignal === 'no' && facts.cbamSource) {
    items.push(
      item('cbam', 'CBAM', 'niet_van_toepassing', ['Aangetoond dat er geen CBAM-goederen buiten de EU worden ingekocht'], {
        source: facts.cbamSource,
        notes: cbamNotes,
      })
    );
  } else {
    items.push(
      item('cbam', 'CBAM', 'te_onderzoeken', ['Onvoldoende gegevens over import van CBAM-goederen'], {
        needed: cbamNeeded,
        question: cbamNeeded,
        documentRequest:
          'Inkoopoverzicht CBAM-goederen (staal, aluminium, cement, kunstmest, waterstof, elektriciteit) van buiten de EU, met tonnage per jaar',
        notes: cbamNotes,
      })
    );
  }

  const kwh = facts.energyKwh;
  const m3 = facts.gasM3;
  const energyNeeded = 'Nodig: energieverbruik elektriciteit (kWh) en gas (m³) per vestiging';
  const energyNotes = [
    'Bal art. 5.15 (≥50.000 kWh of ≥25.000 m³), informatieplicht art. 5.15a (volgende ronde 1-12-2027), onderzoeksplicht art. 5.15b.',
  ];
  if ((kwh != null && kwh >= T.ENERGY_KWH) || (m3 != null && m3 >= T.ENERGY_M3)) {
    const reasons = [
      kwh != null && kwh >= T.ENERGY_KWH ? `≥50.000 kWh (${kwh.toLocaleString('nl-NL')} kWh)` : null,
      m3 != null && m3 >= T.ENERGY_M3 ? `≥25.000 m³ (${m3.toLocaleString('nl-NL')} m³)` : null,
    ].filter(Boolean) as string[];
    items.push(item('energiebesparingsplicht', 'Energiebesparingsplicht', 'van_toepassing', reasons, { notes: energyNotes }));
  } else if (kwh != null && m3 != null && kwh < T.ENERGY_KWH && m3 < T.ENERGY_M3) {
    items.push(
      item('energiebesparingsplicht', 'Energiebesparingsplicht', 'niet_van_toepassing', [
        `Onder drempel: ${kwh.toLocaleString('nl-NL')} kWh en ${m3.toLocaleString('nl-NL')} m³`,
      ], { notes: energyNotes })
    );
  } else {
    items.push(
      item('energiebesparingsplicht', 'Energiebesparingsplicht', 'te_onderzoeken', ['Energieverbruik onbekend'], {
        needed: energyNeeded,
        question: energyNeeded,
        documentRequest: 'Energierekeningen per vestiging: elektriciteit (kWh) en gas (m³) over het laatste kalenderjaar',
        notes: energyNotes,
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
        notes: ['Norm, geen wet. Gunningsvoordeel bij Rijk, ProRail en veel gemeenten.'],
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
    row.legal = getLegalSourceDisplay(row.id);
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
