/**
 * LinkedIn URL normalization and validation
 */

export type LinkedInType = 'bedrijfspagina' | 'eigenaar';
export type LinkedInStatus = 'gevonden' | 'handmatig ingevoerd' | 'niet gevonden';

export interface LinkedInData {
  url?: string;
  type?: LinkedInType;
  naam?: string; // for eigenaar
  bron?: string;
  status?: LinkedInStatus;
}

/**
 * Normalize LinkedIn URL:
 * - Strip querystring and fragment
 * - Force https://www.linkedin.com
 * - Remove trailing slash
 * - Only accept /company/ or /in/ URLs
 */
export function normalizeLinkedInUrl(url: string): string | null {
  if (!url) return null;
  
  try {
    // Parse URL
    const parsed = new URL(url);
    
    // Must be linkedin.com
    if (!parsed.hostname.includes('linkedin.com')) {
      return null;
    }
    
    // Get clean pathname (no query, no fragment)
    const pathname = parsed.pathname.split('?')[0].split('#')[0];
    
    // Must be /company/ or /in/
    if (!pathname.startsWith('/company/') && !pathname.startsWith('/in/')) {
      return null;
    }
    
    // Remove trailing slash
    const cleanPath = pathname.replace(/\/$/, '');
    
    // Return normalized URL
    return `https://www.linkedin.com${cleanPath}`;
  } catch {
    return null;
  }
}

/**
 * Detect LinkedIn type from URL
 */
export function detectLinkedInType(url: string): LinkedInType | null {
  const normalized = normalizeLinkedInUrl(url);
  if (!normalized) return null;
  
  if (normalized.includes('/company/')) return 'bedrijfspagina';
  if (normalized.includes('/in/')) return 'eigenaar';
  return null;
}

/**
 * Parse LinkedIn data from various formats (backwards compatible)
 */
export function parseLinkedInData(value: any): LinkedInData | null {
  if (!value) return null;
  
  // Old format: simple string URL
  if (typeof value === 'string') {
    const url = normalizeLinkedInUrl(value);
    if (!url) return null;
    
    return {
      url,
      type: detectLinkedInType(url) || 'bedrijfspagina',
      status: 'gevonden',
    };
  }
  
  // Field object format with waarde
  if (value && typeof value === 'object' && 'waarde' in value) {
    return parseLinkedInData(value.waarde);
  }
  
  // New format: object with url, type, naam, status
  if (value && typeof value === 'object' && 'url' in value) {
    const url = normalizeLinkedInUrl(value.url);
    if (!url) return null;
    
    return {
      url,
      type: value.type || detectLinkedInType(url) || 'bedrijfspagina',
      naam: value.naam,
      bron: value.bron,
      status: value.status || 'gevonden',
    };
  }
  
  return null;
}

/**
 * Get display label for LinkedIn type
 */
export function linkedInTypeLabel(data: LinkedInData | null): string {
  if (!data) return 'onbekend';
  if (data.type === 'bedrijfspagina') return 'Bedrijfspagina';
  if (data.type === 'eigenaar' && data.naam) return `Eigenaar: ${data.naam}`;
  if (data.type === 'eigenaar') return 'Eigenaar';
  return 'LinkedIn';
}

/**
 * Check if LinkedIn data is manually entered
 */
export function isManuallyEntered(data: LinkedInData | null): boolean {
  return data?.status === 'handmatig ingevoerd';
}
