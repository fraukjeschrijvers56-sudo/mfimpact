export interface HuisstijlSettings {
  primary_color: string;
  secondary_color: string;
  font: string;
  heading_color?: string;
  table_shade?: string;
  status_red?: string;
  status_amber?: string;
  status_green?: string;
}

export const DEFAULT_SETTINGS: HuisstijlSettings = {
  primary_color: '#039088',
  secondary_color: '#0C4643',
  font: 'Aptos',
  heading_color: '#0C4643',
  table_shade: '#F4F7F7',
  status_red: '#D64545',
  status_amber: '#FFC14D',
  status_green: '#039088',
};

/**
 * Coerce a dossier field that may be a plain string/number/array or a
 * `{ status, waarde, bronnen, toelichting }` object into display text.
 */
export function getValueOrString(field: unknown): string {
  if (field == null || field === '') return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'number' || typeof field === 'boolean') return String(field);
  if (Array.isArray(field)) {
    return field
      .map((item) => getValueOrString(item))
      .filter((part) => part && part !== 'onbekend')
      .join(', ');
  }
  if (typeof field === 'object') {
    const obj = field as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(obj, 'waarde')) {
      return getValueOrString(obj.waarde);
    }
    if (typeof obj.url === 'string' && obj.url) return obj.url;
    const primitives = Object.values(obj).filter(
      (value) => typeof value === 'string' || typeof value === 'number'
    );
    if (primitives.length > 0) return primitives.map(String).join(', ');
    return '';
  }
  return String(field);
}

export function hexColor(hex: string | undefined, fallback: string): string {
  const value = (hex || fallback).trim();
  return value.replace(/^#/, '').toUpperCase();
}
