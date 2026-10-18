/**
 * Research engine for structured company analysis
 * Two-step process: web search → structuring with quote validation
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Load prompt templates
export function loadPrompts() {
  try {
    const systeemPrompt = readFileSync(
      join(process.cwd(), 'lib/prompts/onderzoek-systeem.md'),
      'utf-8'
    );
    const gebruikerPromptTemplate = readFileSync(
      join(process.cwd(), 'lib/prompts/onderzoek-gebruiker.md'),
      'utf-8'
    );
    return { systeemPrompt, gebruikerPromptTemplate };
  } catch (error) {
    console.error('Failed to load prompts:', error);
    return {
      systeemPrompt: 'Je bent een ESG/MVO-onderzoeker.',
      gebruikerPromptTemplate: 'Onderzoek het bedrijf met website {url} en hoofdvestiging in {plaats}.'
    };
  }
}

export function fillPromptTemplate(template: string, url: string, plaats: string): string {
  return template.replace(/\{url\}/g, url).replace(/\{plaats\}/g, plaats);
}

/**
 * Step 1: Web search research with OpenAI Responses API
 */
export async function performWebSearchResearch(
  url: string,
  plaats: string,
  apiKey: string
): Promise<string> {
  const { systeemPrompt, gebruikerPromptTemplate } = loadPrompts();
  const gebruikerPrompt = fillPromptTemplate(gebruikerPromptTemplate, url, plaats);

  try {
    // Try gpt-4.1 first, fallback to gpt-4o
    const models = ['gpt-4.1', 'gpt-4o'];
    
    for (const model of models) {
      try {
        console.log(`Attempting web search with model: ${model}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systeemPrompt },
              { role: 'user', content: gebruikerPrompt }
            ],
            tools: [{ type: model === 'gpt-4.1' ? 'web_search' : 'web_search_preview' }],
            max_tokens: 4000,
            temperature: 0.1,
          }),
          signal: AbortSignal.timeout(90000), // 90 sec timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Model ${model} failed:`, response.status, errorText);
          continue; // Try next model
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        if (content) {
          console.log(`Web search successful with ${model}, content length: ${content.length}`);
          return content;
        }
      } catch (modelError) {
        console.error(`Model ${model} error:`, modelError);
        continue;
      }
    }
    
    // All models failed
    return 'Web search niet beschikbaar (alle modellen gefaald)';
    
  } catch (error) {
    console.error('Web search research error:', error);
    return `Web search overgeslagen: ${error instanceof Error ? error.message : 'onbekend'}`;
  }
}

/**
 * Validate quote by fetching source URL and string-matching
 */
export async function validateQuote(url: string, citaat: string): Promise<'gevonden' | 'twijfelachtig'> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 MVO-bewijs-werkbank/1.0' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      return 'twijfelachtig';
    }
    
    const content = await response.text();
    
    // Normalize whitespace for comparison
    const normalizeText = (text: string) => 
      text.toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[""'']/g, '"')
        .replace(/[–—]/g, '-')
        .trim();
    
    const normalizedContent = normalizeText(content);
    const normalizedCitaat = normalizeText(citaat);
    
    // Check if quote exists (with some tolerance for minor differences)
    if (normalizedContent.includes(normalizedCitaat)) {
      return 'gevonden';
    }
    
    // Try partial match (at least 70% of quote)
    const words = normalizedCitaat.split(' ');
    const threshold = Math.ceil(words.length * 0.7);
    let matchedWords = 0;
    
    for (const word of words) {
      if (word.length > 3 && normalizedContent.includes(word)) {
        matchedWords++;
      }
    }
    
    return matchedWords >= threshold ? 'gevonden' : 'twijfelachtig';
    
  } catch (error) {
    console.error(`Quote validation failed for ${url}:`, error);
    return 'twijfelachtig';
  }
}

/**
 * Load the JSON output schema description (editable in lib/prompts/onderzoek-schema.md)
 */
export function loadSchemaPrompt(): string {
  try {
    return readFileSync(join(process.cwd(), 'lib/prompts/onderzoek-schema.md'), 'utf-8');
  } catch {
    return 'Antwoord uitsluitend met één geldig JSON-object.';
  }
}

/**
 * Leniently extract a JSON object from model output (strips ```json fences and surrounding text)
 */
export function extractJsonObject(text: string): any | null {
  if (!text) return null;
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try {
    return JSON.parse(t);
  } catch {
    const first = t.indexOf('{');
    const last = t.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(t.slice(first, last + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface DossierResearchResult {
  dossier: any | null;
  raw: string;
  citations: Array<{ url: string; title?: string }>;
  model: string | null;
  error?: string;
}

/**
 * Deep research via the OpenAI Responses API with the web_search tool.
 * Returns the parsed dossier plus all web citations the model used.
 */
export async function performDossierResearch(
  url: string,
  plaats: string,
  apiKey: string,
  timeoutMs: number = 200000
): Promise<DossierResearchResult> {
  const { systeemPrompt, gebruikerPromptTemplate } = loadPrompts();
  const gebruikerPrompt = fillPromptTemplate(gebruikerPromptTemplate, url, plaats);
  const schemaPrompt = loadSchemaPrompt();
  const started = Date.now();

  const attempts: Array<{ model: string; tool: string }> = [
    { model: 'gpt-4.1', tool: 'web_search' },
    { model: 'gpt-4o', tool: 'web_search_preview' },
  ];

  let lastError = 'onbekende fout';

  for (const attempt of attempts) {
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining < 20000) break;
    try {
      console.log(`Dossier research via Responses API, model ${attempt.model}`);
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: attempt.model,
          instructions: `${systeemPrompt}\n\nSCHEMA\n${schemaPrompt}`,
          input: gebruikerPrompt,
          tools: [{ type: attempt.tool, search_context_size: 'high' }],
          max_output_tokens: 16000,
          temperature: 0.1,
        }),
        signal: AbortSignal.timeout(remaining),
      });

      if (!response.ok) {
        lastError = `OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`;
        console.error(`Model ${attempt.model} failed:`, lastError);
        continue;
      }

      const data = await response.json();
      let text = typeof data.output_text === 'string' ? data.output_text : '';
      const citations: Array<{ url: string; title?: string }> = [];
      const seen = new Set<string>();

      for (const item of data.output || []) {
        if (item?.type !== 'message') continue;
        for (const c of item.content || []) {
          if (c?.type === 'output_text') {
            if (!data.output_text) text += c.text || '';
            for (const a of c.annotations || []) {
              if (a?.type === 'url_citation' && a.url && !seen.has(a.url)) {
                seen.add(a.url);
                citations.push({ url: a.url, title: a.title });
              }
            }
          }
        }
      }

      const dossier = extractJsonObject(text);
      if (!dossier) {
        lastError = 'Antwoord was geen geldige JSON';
        console.error(`Model ${attempt.model}: no valid JSON, length ${text.length}`);
        // Still return raw text so nothing is lost
        return { dossier: null, raw: text, citations, model: attempt.model, error: lastError };
      }
      return { dossier, raw: text, citations, model: attempt.model };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`Model ${attempt.model} error:`, lastError);
      // A timeout means there is no time left for another attempt
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) break;
    }
  }

  return { dossier: null, raw: '', citations: [], model: null, error: lastError };
}

/**
 * Validate all quotes in dossier (parallel, one fetch per URL, with a time budget)
 */
export async function validateDossierQuotes(dossier: any, budgetMs: number = 45000): Promise<any> {
  const validatedDossier = JSON.parse(JSON.stringify(dossier)); // Deep clone
  const deadline = Date.now() + budgetMs;

  // Collect all bronnen with url + citaat
  const bronnen: any[] = [];
  const collect = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(collect);
      return;
    }
    if (Array.isArray(obj.bronnen)) {
      for (const b of obj.bronnen) {
        if (b && typeof b === 'object' && typeof b.url === 'string' && typeof b.citaat === 'string' && b.citaat.trim()) {
          bronnen.push(b);
        }
      }
    }
    for (const key in obj) collect(obj[key]);
  };
  collect(validatedDossier);

  // Fetch each unique URL once
  const pageCache = new Map<string, Promise<string | null>>();
  const getPage = (url: string) => {
    if (!pageCache.has(url)) {
      pageCache.set(
        url,
        (async () => {
          const remaining = deadline - Date.now();
          if (remaining < 1000) return null;
          try {
            const res = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0 MVO-bewijs-werkbank/1.0' },
              signal: AbortSignal.timeout(Math.min(8000, remaining)),
            });
            if (!res.ok) return null;
            return await res.text();
          } catch {
            return null;
          }
        })()
      );
    }
    return pageCache.get(url)!;
  };

  const normalizeText = (text: string) =>
    text
      .toLowerCase()
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[“”"'‘’]/g, '"')
      .replace(/[–—]/g, '-')
      .trim();

  const urls = Array.from(new Set(bronnen.map((b) => b.url)));
  const concurrency = 8;
  let idx = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
      while (idx < urls.length) {
        const u = urls[idx++];
        await getPage(u);
      }
    })
  );

  for (const bron of bronnen) {
    const content = await getPage(bron.url);
    if (!content) {
      bron.validatie = 'niet_controleerbaar';
      continue;
    }
    const nc = normalizeText(content);
    const nq = normalizeText(bron.citaat);
    if (nc.includes(nq)) {
      bron.validatie = 'gevonden';
      continue;
    }
    const words = nq.split(' ').filter((w) => w.length > 3);
    const matched = words.filter((w) => nc.includes(w)).length;
    bron.validatie = words.length > 0 && matched >= Math.ceil(words.length * 0.7) ? 'gevonden' : 'twijfelachtig';
  }

  return validatedDossier;
}
