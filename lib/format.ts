/**
 * Display helpers: never show "unknown"/empty values, always "onbekend".
 */
const UNKNOWN_VALUES = new Set(['unknown', 'onbekend', 'n/a', 'na', 'none', 'null', 'undefined', '-', 'niet gevonden', 'not found', '']);

export function isUnknown(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return UNKNOWN_VALUES.has(v.trim().toLowerCase());
  if (Array.isArray(v)) return v.length === 0 || v.every(isUnknown);
  return false;
}

export function nl(v: unknown): string {
  if (isUnknown(v)) return 'onbekend';
  if (typeof v === 'number') return v.toLocaleString('nl-NL');
  if (typeof v === 'boolean') return v ? 'ja' : 'nee';
  if (Array.isArray(v)) return v.filter((x) => !isUnknown(x)).map(nl).join(', ');
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v).replace(/\bunknown\b/gi, 'onbekend');
}

export function labelize(key: string): string {
  const special: Record<string, string> = {
    kvk_nummer: 'KvK-nummer',
    sbi: 'SBI-code',
    eudr: 'EUDR (ontbossing)',
    cbam: 'CBAM (koolstofgrens)',
    co2_doelen: 'CO2-doelen',
    co2_footprint: 'CO2-footprint',
    bouw_infra_gww: 'Bouw / infra / GWW',
    levert_aan_grote_ondernemingen_of_overheid: 'Levert aan grote ondernemingen of overheid',
    linkedin: 'LinkedIn',
  };
  if (special[key]) return special[key];
  const s = key.replace(/_/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function isUrl(v: unknown): v is string {
  return typeof v === 'string' && /^https?:\/\//i.test(v.trim());
}
