/**
 * Display helpers: never show "unknown"/empty values, always "onbekend".
 */
import { extractDisplayValue, getDisplayText, isFieldObject, parseFieldValue } from './field-normalizer';

const UNKNOWN_VALUES = new Set(['unknown', 'onbekend', 'n/a', 'na', 'none', 'null', 'undefined', '-', 'niet gevonden', 'not found', '']);

export function isUnknown(v: unknown): boolean {
  // First extract display value if it's a field object
  const displayValue = extractDisplayValue(v);
  
  if (displayValue === null || displayValue === undefined) return true;
  if (typeof displayValue === 'string') return UNKNOWN_VALUES.has(displayValue.trim().toLowerCase());
  if (Array.isArray(displayValue)) return displayValue.length === 0 || displayValue.every(isUnknown);
  return false;
}

export function nl(v: unknown): string {
  // Use the normalizer to get display text
  return getDisplayText(v);
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
