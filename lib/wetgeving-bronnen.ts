/**
 * Official legal sources for Wetgeving & drempels.
 * Static JSON import — never fetched at runtime (EUR-Lex blocks server-side fetch).
 */
import bronnenJson from '../data/wetgeving-bronnen.json' with { type: 'json' };
import type {
  LegalSourceDisplay,
  WetgevingBron,
  WetgevingWijziging,
} from './wetgeving-types.ts';

export type {
  LegalSourceDisplay,
  LegalWijzigingLink,
  WetgevingArtikel,
  WetgevingBron,
  WetgevingWijziging,
} from './wetgeving-types.ts';

export const WETGEVING_PEILDATUM = '2026-10-20';

/** Drempels aligned with data/wetgeving-bronnen.json (peildatum 2026-10-20). */
export const WETGEVING_THRESHOLDS = {
  PEILDATUM: WETGEVING_PEILDATUM,
  CSRD_FTE: 1000,
  CSRD_OMZET: 450_000_000,
  VALUE_CHAIN_FTE: 1000,
  VALUE_CHAIN_FROM_BOEKJAAR: 2027,
  CSDDD_FTE: 5000,
  CSDDD_OMZET: 1_500_000_000,
  CSDDD_APPLIES: '2029-07-26',
  CSDDD_APPLIES_LABEL: '26-07-2029',
  CBAM_TON: 50,
  CBAM_FIRST_DECLARATION: '2027-09-30',
  ENERGY_KWH: 50_000,
  ENERGY_M3: 25_000,
  ENERGY_ONDERZOEK_KWH: 10_000_000,
  ENERGY_ONDERZOEK_M3: 170_000,
  ENERGY_INFORMATIEPLICHT: '2027-12-01',
  EUDR_APPLIES: '2026-12-30',
  EUDR_MICRO_SMALL: '2027-06-30',
  MICRO_BALANS: 450_000,
  MICRO_OMZET: 900_000,
  MICRO_FTE: 10,
  KLEIN_FTE: 50,
  KLEIN_OMZET: 10_000_000,
  MIDDEL_FTE: 250,
  MIDDEL_OMZET: 50_000_000,
  ECGT_APPLIES: '2026-09-27',
  CSRD_OMNIBUS_IN_FORCE: '2026-03-18',
} as const;

export const WETGEVING_BRONNEN: WetgevingBron[] = bronnenJson as WetgevingBron[];

const BY_KEY = new Map(WETGEVING_BRONNEN.map((b) => [b.key, b]));

export function getWetgevingBron(key: string): WetgevingBron | undefined {
  return BY_KEY.get(key);
}

export function formatWijzigingLabel(w: Pick<WetgevingWijziging, 'titel' | 'nummer'>): string {
  const blob = `${w.titel} ${w.nummer}`;
  if (/Omnibus I/i.test(blob) && /2026\/470/.test(blob)) return 'Omnibus I (EU) 2026/470';
  if (/stop-the-clock/i.test(blob) && /2025\/794/.test(blob)) return 'stop-the-clock (EU) 2025/794';
  if (/2026\/1560/.test(blob)) return 'Gedelegeerde Verordening (EU) 2026/1560';
  if (/2026\/2102/.test(blob)) return '(EU) 2026/2102';
  if (/36\s*678/.test(blob)) return 'Wetsvoorstel 36 678';
  const euNum = blob.match(/\(EU\)\s*\d{4}\/\d+/);
  if (euNum) {
    const kind = w.titel.match(
      /^(Gedelegeerde Verordening|Gedelegeerde Richtlijn|Richtlijn|Verordening|Aanbeveling|Implementatiewet|Wet)/i
    );
    return kind ? `${kind[1]} ${euNum[0]}` : euNum[0];
  }
  const short = (w.nummer || w.titel).split('–')[0].trim();
  return short.length > 80 ? `${short.slice(0, 77)}…` : short;
}

export function formatLegalSource(bron: WetgevingBron, artikelIndex = 0): string {
  const art = bron.artikelen[artikelIndex] || bron.artikelen[0];
  if (!art) return `Bron: ${bron.nummer}`;
  return `Bron: ${bron.nummer} – ${art.artikel} (${art.onderwerp})`;
}

export function getLegalSourceDisplay(key: string): LegalSourceDisplay | undefined {
  const bron = getWetgevingBron(key);
  if (!bron) return undefined;
  const art = bron.artikelen[0];
  const bronLabel = art ? `${bron.nummer} – ${art.artikel} (${art.onderwerp})` : bron.nummer;
  return {
    key: bron.key,
    bronLabel,
    urlArtikel: bron.url_artikel || bron.url,
    toelichtingUrl: bron.toelichting_url || undefined,
    wijzigingen: (bron.wijzigingen || [])
      .filter((w) => w.url)
      .map((w) => ({ label: formatWijzigingLabel(w), url: w.url })),
    geverifieerd: !!bron.geverifieerd,
    opmerking: bron.opmerking || undefined,
    normGeenWet: bron.status_wet === 'norm' || bron.key === 'co2_prestatieladder',
    statusWet: bron.status_wet,
  };
}

export function collectLegalSourceUrls(): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u?: string | null) => {
    if (!u) return;
    const trimmed = u.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };
  for (const bron of WETGEVING_BRONNEN) {
    add(bron.url_artikel);
    add(bron.url);
    add(bron.toelichting_url);
    for (const w of bron.wijzigingen || []) add(w.url);
  }
  return urls;
}

export function mergeBronnenlijst(existing: string[] = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [...existing, ...collectLegalSourceUrls()]) {
    const trimmed = String(url || '').trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}
