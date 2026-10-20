/**
 * Shared AI helper for section-specific analysis
 * Uses research-engine model config (gpt-4.1 + web_search, fallback gpt-4o + web_search_preview)
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
 * Call OpenAI for section-specific analysis
 * Uses gpt-4.1 + web_search (fallback gpt-4o + web_search_preview) like research-engine
 */
export async function callSectionAI(
  config: SectionAIConfig,
  input: any, // The onderzoek_ruw or full onderzoek to analyze
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
  
  const models: Array<{ model: string; tool: string }> = config.useWebSearch
    ? [
        { model: 'gpt-4.1', tool: 'web_search' },
        { model: 'gpt-4o', tool: 'web_search_preview' },
      ]
    : [
        { model: 'gpt-4.1', tool: '' },
        { model: 'gpt-4o', tool: '' },
      ];
  
  const started = Date.now();
  
  for (const attempt of models) {
    const remaining = timeoutMs - (Date.now() - started);
    if (remaining < 10000) break;
    
    try {
      console.log(`[Section ${config.sectionName}] Calling ${attempt.model}${attempt.tool ? ` with ${attempt.tool}` : ''}...`);
      
      const body: any = {
        model: attempt.model,
        messages: [
          { role: 'user', content: promptWithInput }
        ],
        max_tokens: 4000,
        temperature: 0.1,
      };
      
      if (attempt.tool) {
        body.tools = [{ type: attempt.tool }];
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        console.error(`[Section ${config.sectionName}] ${attempt.model} failed: ${response.status} ${errorText.substring(0, 200)}`);
        continue;
      }
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      
      if (!content) {
        console.error(`[Section ${config.sectionName}] ${attempt.model} returned no content`);
        continue;
      }
      
      console.log(`[Section ${config.sectionName}] Got response from ${attempt.model}, length: ${content.length}`);
      
      // Parse JSON
      const parsed = extractJsonObject(content);
      if (!parsed) {
        console.error(`[Section ${config.sectionName}] ${attempt.model} returned invalid JSON`);
        console.error('Content preview:', content.substring(0, 500));
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
        return {
          data: parsed,
          model: attempt.model,
          error: `Geen bruikbare data gevonden voor ${config.schemaKeys.join(', ')}. Het onderzoek bevat mogelijk onvoldoende informatie voor deze sectie.`,
        };
      }
      
      return {
        data: parsed,
        model: attempt.model,
      };
      
    } catch (error) {
      console.error(`[Section ${config.sectionName}] ${attempt.model} error:`, error);
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        break; // No time for another attempt
      }
      continue;
    }
  }
  
  return {
    data: null,
    model: '',
    error: `Alle AI-modellen faalden voor sectie ${config.sectionName}. Controleer of de OpenAI API-sleutel geldig is en of het onderzoek voldoende informatie bevat.`,
  };
}
