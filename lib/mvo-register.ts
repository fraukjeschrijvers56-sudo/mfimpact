/**
 * MVO-Register lookup (public search, no login)
 * Site: database.mvo-register.nl/rating-web (Apache Wicket)
 * Public search gives: name, description, companyId (requires session + Ajax)
 */

const BASE = 'https://database.mvo-register.nl/rating-web/';
const UA = 'Mozilla/5.0 (compatible; ESG-Werkbank/1.0)';

interface MvoRegisterResult {
  name: string;
  description: string;
  companyId: string | null;
  dashboardUrl: string | null;
}

interface MvoRegisterResponse {
  query: string;
  registered: boolean;
  noResults: boolean;
  results: MvoRegisterResult[];
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

/**
 * Search MVO-register (public search)
 */
export async function searchMvoRegister(
  query: string,
  options: { resolveIds?: boolean; timeoutMs?: number } = {}
): Promise<MvoRegisterResponse> {
  const { resolveIds = true, timeoutMs = 10000 } = options;

  try {
    const signal = AbortSignal.timeout(timeoutMs);

    // 1) Open search page -> 302 chain sets JSESSIONID and creates page instance ?0
    let res = await fetch(BASE + 'register/search', {
      headers: { 'User-Agent': UA },
      redirect: 'manual',
      signal,
    });

    // Extract JSESSIONID cookie
    const setCookieHeaders = res.headers.get('set-cookie');
    const cookies = setCookieHeaders
      ? setCookieHeaders.split(',').map((c) => c.split(';')[0])
      : [];
    const cookie = cookies.join('; ');

    if (!/JSESSIONID=/.test(cookie)) {
      throw new Error('MVO-register: geen sessie-cookie');
    }

    // Follow redirect to get page instance
    res = await fetch(BASE + 'register/search?0', {
      headers: { 'User-Agent': UA, Cookie: cookie },
      signal,
    });

    const page = await res.text();

    // Extract page instance ID from Wicket form action
    const match = page.match(
      /search(?:;jsessionid=[^?]+)?\?(\d+)-1\.0-filterBoxes-filterform-filterboxes-1-patternform-submit/
    );
    const pageId = match ? match[1] : '0';

    // 2) Wicket Ajax form submit
    const body = new URLSearchParams({
      'filterboxes:1:patternform:pattern': query,
      'filterboxes:1:patternform:submit': '1',
    });

    res = await fetch(
      `${BASE}register/search?${pageId}-1.0-filterBoxes-filterform-filterboxes-1-patternform-submit`,
      {
        method: 'POST',
        body,
        headers: {
          'User-Agent': UA,
          Cookie: cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Wicket-Ajax': 'true',
          'Wicket-Ajax-BaseURL': `register/search?${pageId}`,
          'X-Requested-With': 'XMLHttpRequest',
          Accept: 'text/xml',
        },
        signal,
      }
    );

    const xml = await res.text();

    if (!xml.includes('<ajax-response>')) {
      throw new Error(`MVO-register: onverwacht antwoord (${res.status})`);
    }

    // Parse results from XML
    const results: Array<MvoRegisterResult & { row: string }> = [];
    const resultRegex =
      /<div class="searchresult">([\s\S]*?)searchResults-result_row-(\d+)-details/g;
    let match2;

    while ((match2 = resultRegex.exec(xml)) !== null) {
      const block = match2[1];
      const row = match2[2];

      const nameMatch = block.match(/searchresult__title[^>]*>([\s\S]*?)<\/h5>/);
      const name = decode(nameMatch ? nameMatch[1] : '');

      const descMatch = block.match(/<p>([\s\S]*?)<\/p>/);
      const description = decode(descMatch ? descMatch[1] : '').replace(/\s+/g, ' ');

      results.push({
        name,
        description,
        row,
        companyId: null,
        dashboardUrl: null,
      });
    }

    // 3) Optional: resolve stable company ID via "Read more" link
    if (resolveIds) {
      for (const item of results) {
        try {
          const detailRes = await fetch(
            `${BASE}register/search?${pageId}-1.-searchResults-result_row-${item.row}-details`,
            {
              headers: { 'User-Agent': UA, Cookie: cookie },
              redirect: 'manual',
              signal,
            }
          );

          const location = detailRes.headers.get('location') || '';
          const idMatch = location.match(/companydashboard\/(\d+)/);
          const id = idMatch ? idMatch[1] : null;

          item.companyId = id;
          item.dashboardUrl = id ? `${BASE}companydashboard/${id}` : null;
        } catch (err) {
          // Non-fatal: continue without ID
          console.warn(`Failed to resolve MVO-register ID for ${item.name}:`, err);
        }
      }
    }

    return {
      query,
      registered: results.length > 0,
      noResults: xml.includes('class="noresults"'),
      results: results.map(({ row, ...rest }) => rest),
    };
  } catch (error) {
    console.error('MVO-register search error:', error);
    throw error;
  }
}

/**
 * Normalize a string for comparison (lowercase, remove special chars)
 */
function normalizeForComparison(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two company names are similar
 */
function namesSimilar(name1: string, name2: string): boolean {
  const n1 = normalizeForComparison(name1);
  const n2 = normalizeForComparison(name2);

  // Exact match
  if (n1 === n2) return true;

  // One contains the other (for cases like "ABC BV" vs "ABC")
  if (n1.includes(n2) || n2.includes(n1)) return true;

  // Check if core words match (ignore legal forms like BV, NV, etc.)
  const legal = /\b(bv|nv|vof|cv|holding|groep|group)\b/gi;
  const core1 = n1.replace(legal, '').trim();
  const core2 = n2.replace(legal, '').trim();

  return core1 === core2 || core1.includes(core2) || core2.includes(core1);
}

/**
 * Check MVO-register and return status object
 */
export async function checkMvoRegister(
  companyName: string,
  kvk?: string | null
): Promise<{
  status: 'geregistreerd' | 'niet_gevonden' | 'kon_niet_controleren';
  gezocht_op: string;
  matches: Array<{
    name: string;
    description: string;
    companyId: string | null;
    dashboardUrl: string | null;
  }>;
  gecontroleerd_op: string;
}> {
  const gecontroleerd_op = new Date().toISOString();

  try {
    // Try KvK first if available and valid (8 digits)
    if (kvk && /^\d{8}$/.test(kvk.trim())) {
      try {
        const kvkResult = await searchMvoRegister(kvk, { timeoutMs: 10000 });
        if (kvkResult.registered && kvkResult.results.length > 0) {
          return {
            status: 'geregistreerd',
            gezocht_op: `KvK ${kvk}`,
            matches: kvkResult.results,
            gecontroleerd_op,
          };
        }
      } catch (err) {
        console.warn('KvK search failed, trying company name:', err);
      }
    }

    // Search by company name
    const nameResult = await searchMvoRegister(companyName, { timeoutMs: 10000 });

    if (!nameResult.registered || nameResult.results.length === 0) {
      return {
        status: 'niet_gevonden',
        gezocht_op: companyName,
        matches: [],
        gecontroleerd_op,
      };
    }

    // Filter results by name similarity
    const matches = nameResult.results.filter((result) =>
      namesSimilar(result.name, companyName)
    );

    if (matches.length > 0) {
      return {
        status: 'geregistreerd',
        gezocht_op: companyName,
        matches,
        gecontroleerd_op,
      };
    }

    // Found results but no good matches
    return {
      status: 'niet_gevonden',
      gezocht_op: companyName,
      matches: [],
      gecontroleerd_op,
    };
  } catch (error) {
    console.error('MVO-register check failed:', error);
    return {
      status: 'kon_niet_controleren',
      gezocht_op: kvk ? `KvK ${kvk} / ${companyName}` : companyName,
      matches: [],
      gecontroleerd_op,
    };
  }
}
