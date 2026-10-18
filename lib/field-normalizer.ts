/**
 * Field normalizer: handles field objects with {status, waarde, bronnen[], toelichting}
 * that may come as objects or JSON strings from the research API.
 */

export interface FieldObject {
  status?: string;
  waarde?: any;
  value?: any;
  bronnen?: Array<{
    url?: string;
    citaat?: string;
    datum?: string;
    validatie?: string;
  }>;
  toelichting?: string;
}

/**
 * Parse a value that might be a JSON string or already an object
 */
export function parseFieldValue(value: any): any {
  if (value === null || value === undefined) return null;
  
  // Already an object
  if (typeof value === 'object') return value;
  
  // Try to parse JSON strings
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return value;
      }
    }
  }
  
  return value;
}

/**
 * Check if a value is a field object (has status/waarde/bronnen structure)
 */
export function isFieldObject(value: any): value is FieldObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return 'waarde' in value || 'status' in value || 'bronnen' in value || 'value' in value;
}

/**
 * Extract the display value from a field object or raw value
 */
export function extractDisplayValue(value: any): any {
  const parsed = parseFieldValue(value);
  
  if (isFieldObject(parsed)) {
    return parsed.waarde ?? parsed.value ?? null;
  }
  
  return parsed;
}

/**
 * Normalize a string value: handle 'None', 'unknown', null, strip literal None from text
 */
export function normalizeStringValue(value: any): string {
  if (value === null || value === undefined) return 'onbekend';
  
  const str = String(value).trim();
  
  // Handle explicit unknown values
  const unknownValues = ['none', 'unknown', 'onbekend', 'null', 'undefined', '-', 'n/a', 'na'];
  if (unknownValues.includes(str.toLowerCase())) return 'onbekend';
  
  // Strip literal 'None' from text (e.g., "branche None" -> "branche")
  let cleaned = str
    .replace(/\bNone\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If nothing left after cleanup, it's unknown
  if (!cleaned) return 'onbekend';
  
  return cleaned;
}

/**
 * Humanize snake_case or technical keys to display text
 */
export function humanizeKey(key: string): string {
  const mapping: Record<string, string> = {
    'niet_controleerbaar': 'niet controleerbaar',
    'gevonden': 'gevonden',
    'twijfelachtig': 'twijfelachtig',
    'onbekend': 'onbekend',
    'niet_gevonden': 'niet gevonden',
    'onzeker': 'onzeker',
  };
  
  if (mapping[key]) return mapping[key];
  
  // Convert snake_case to space-separated
  return key.replace(/_/g, ' ').toLowerCase();
}

/**
 * Get a complete field object from any value (for editing)
 */
export function normalizeFieldObject(value: any): FieldObject {
  const parsed = parseFieldValue(value);
  
  if (isFieldObject(parsed)) {
    return {
      status: parsed.status,
      waarde: parsed.waarde ?? parsed.value,
      bronnen: Array.isArray(parsed.bronnen) ? parsed.bronnen : [],
      toelichting: parsed.toelichting,
    };
  }
  
  // Wrap raw value in field object structure
  return {
    waarde: parsed,
    bronnen: [],
  };
}

/**
 * Get display text from any value (handles field objects, arrays, unknown values)
 */
export function getDisplayText(value: any): string {
  const displayValue = extractDisplayValue(value);
  
  if (displayValue === null || displayValue === undefined) return 'onbekend';
  
  if (Array.isArray(displayValue)) {
    const items = displayValue
      .map(item => getDisplayText(item))
      .filter(text => text !== 'onbekend');
    return items.length > 0 ? items.join(', ') : 'onbekend';
  }
  
  if (typeof displayValue === 'object') {
    // Nested field object
    return getDisplayText(displayValue.waarde ?? displayValue.value);
  }
  
  return normalizeStringValue(displayValue);
}

/**
 * Recursively normalize all field objects in a dossier structure
 * (for saving to database - ensures consistency)
 */
export function normalizeDossier(dossier: any): any {
  if (!dossier || typeof dossier !== 'object') return dossier;
  
  if (Array.isArray(dossier)) {
    return dossier.map(item => normalizeDossier(item));
  }
  
  const normalized: any = {};
  
  for (const key in dossier) {
    const value = dossier[key];
    
    // Parse JSON strings
    const parsed = parseFieldValue(value);
    
    // Recursively normalize nested objects and arrays
    if (parsed && typeof parsed === 'object') {
      normalized[key] = normalizeDossier(parsed);
    } else {
      normalized[key] = parsed;
    }
  }
  
  return normalized;
}
