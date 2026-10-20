/**
 * Shared AI helper for section-specific analysis
 * Uses Responses API with web_search like research-engine (gpt-4.1 + web_search, fallback gpt-4o + web_search_preview)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface SectionAIConfig {
  sectionName: string;
  promptFile: string;
  useWebSearch: boolean;
  schemaKeys: string[]; // Expected keys in output JSON (e.g., ['profiel'], ['vsme_basic', 'gaten'])
}

export interface SectionAIResult {
  data: any;
  model: string;
  citations: Array<{ url: string; title?: string }>;
  error?: string;
}

/**
 * Load section prompt
 */
function loadSectionPrompt(promptFile: string): string {
  try {
    return readFileSync(join(process.cwd(), 'lib/prompts', promptFile), 'utf-8');
  } catch (error) {
    throw new Error(`Kan prompt ${promptFile} niet laden: ${error instanceof Error ? error.message : 'onbekend'}`);
  }
}

/**
 * Extract JSON from model response (handles ```json blocks)
 */
function extractJsonObject(text: string): any | null {
  if (!text) return null;
  let t = text.trim();
  
  // Remove ```json fences
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  
  try {
    return JSON.parse(t);
  } catch {
    // Try to find JSON object boundaries
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

/**
 * Call OpenAI Responses API for section-specific analysis
 * Uses gpt-4.1 + web_search (fallback gpt-4o + web_search_preview) exactly like performDossierResearch
 */
export async function callSectionAI(
  config: SectionAIConfig,
  input: any,
  apiKey: string,
  timeoutMs: number = 120000
): Promise<SectionAIResult> {
  const prompt = loadSectionPrompt(config.promptFile);
  
  // Fill prompt with input
  // For klanteisen, input has {naam, url, plaats, onderzoek, kennisbank}
  // For others, input is the onderzoek_ruw or onderzoek object
  let promptWithInput = prompt;
  if (input.naam !== undefined) {
    // Klanteisen special case
    promptWithInput = promptWithInput.replace(/\{naam\}/g, input.naam || 'de prospect');
    promptWithInput = promptWithInput.replace(/\{url\}/g, input.url || 'onbekend');
    promptWithInput = promptWithInput.replace(/\{plaats\}/g, input.plaats || 'onbekend');
    promptWithInput = promptWithInput.replace(/\{onderzoek_json\}/g, JSON.stringify(input.onderzoek, null, 2));
    promptWithInput = promptWithInput.replace(/\{kennisbank_json\}/g, JSON.stringify(input.kennisbank, null, 2));
  } else {
    // Standard sections
    promptWithInput = promptWithInput.replace(/\{onderzoek_json\}/g, JSON.stringify(input, null, 2));
  }
  
  const attempts: Array<{ model: string; tool: string }> = config.useWebSearch
    ? [
        { model: 'gpt-4.1', tool: 'web_search' },
        { model: 'gpt-4o', tool: 'web_search_preview' },
      ]
    : [
        { model: 'gpt-4.1', tool: '' },
        { model: 'gpt-4o', tool: '' },
      ];
  
  const started = Date.now();
  let lastError = 'onbekende fout';
  
  for (const attempt of attempts) {
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining < 20000) {
      lastError = 'timeout: niet genoeg tijd over voor nog een poging';
      break;
    }
    
    try {
      console.log(`[Section ${config.sectionName}] Via Responses API: ${attempt.model}${attempt.tool ? ` + ${attempt.tool}` : ''}`);
      
      const body: any = {
        model: attempt.model,
        instructions: `Je bent een ESG/MVO-onderzoeker. Analyseer de verstrekte data en produceer uitsluitend geldig JSON.`,
        input: promptWithInput,
        max_output_tokens: 16000,
        temperature: 0.1,
      };
      
      if (attempt.tool) {
        body.tools = [{ type: attempt.tool, search_context_size: 'high' }];
      }
      
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(remaining),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        lastError = `OpenAI ${response.status}: ${errorText.slice(0, 300)}`;
        console.error(`[Section ${config.sectionName}] ${attempt.model} failed:`, lastError);
        continue;
      }
      
      const data = await response.json();
      let text = typeof data.output_text === 'string' ? data.output_text : '';
      const citations: Array<{ url: string; title?: string }> = [];
      const seen = new Set<string>();
      
      // Parse output like research-engine does
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
      
      console.log(`[Section ${config.sectionName}] Got response from ${attempt.model}, text length: ${text.length}, citations: ${citations.length}`);
      
      // Parse JSON
      const parsed = extractJsonObject(text);
      if (!parsed) {
        lastError = 'ongeldige JSON in antwoord';
        console.error(`[Section ${config.sectionName}] ${attempt.model}: no valid JSON, text preview:`, text.substring(0, 500));
        continue;
      }
      
      // Validate expected keys
      const hasExpectedData = config.schemaKeys.some(key => {
        const value = parsed[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
        return value !== undefined && value !== null && value !== '';
      });
      
      if (!hasExpectedData) {
        lastError = `geen bruikbare data in ${config.schemaKeys.join(', ')}`;
        console.log(`[Section ${config.sectionName}] Empty result from ${attempt.model}`);
        return {
          data: parsed,
          model: attempt.model,
          citations,
          error: `Geen bruikbare data gevonden voor ${config.schemaKeys.join(', ')}. Het onderzoek bevat mogelijk onvoldoende informatie voor deze sectie. Laatste fout: ${lastError}`,
        };
      }
      
      return {
        data: parsed,
        model: attempt.model,
        citations,
      };
      
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[Section ${config.sectionName}] ${attempt.model} error:`, lastError);
      if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
        lastError = 'timeout overschreden';
        break;
      }
      continue;
    }
  }
  
  return {
    data: null,
    model: '',
    citations: [],
    error: `Alle AI-modellen faalden voor sectie ${config.sectionName}. Laatste fout: ${lastError}`,
  };
}
