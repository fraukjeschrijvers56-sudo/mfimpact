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
 * Validate all quotes in dossier
 */
export async function validateDossierQuotes(dossier: any): Promise<any> {
  const validatedDossier = JSON.parse(JSON.stringify(dossier)); // Deep clone
  
  // Helper to validate bronnen array
  const validateBronnen = async (bronnen: any[]) => {
    if (!Array.isArray(bronnen)) return;
    
    for (const bron of bronnen) {
      if (bron.url && bron.citaat) {
        try {
          const validationResult = await validateQuote(bron.url, bron.citaat);
          bron.validatie = validationResult;
        } catch (error) {
          console.error('Validation error:', error);
          bron.validatie = 'twijfelachtig';
        }
      }
    }
  };
  
  // Validate all fields with bronnen
  const validateField = async (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj.bronnen)) {
      await validateBronnen(obj.bronnen);
    }
    
    // Recursively validate nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object') {
        await validateField(obj[key]);
      }
    }
  };
  
  await validateField(validatedDossier);
  
  return validatedDossier;
}
