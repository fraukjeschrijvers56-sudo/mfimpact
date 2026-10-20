import { NextRequest, NextResponse } from 'next/server';
import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { getDb, isUsingSupabase } from '@/lib/db';
import { checkAllThresholds } from '@/lib/esg-thresholds';
import { extractAndCheckClaims } from '@/lib/claim-check-rules';
import { ALL_SCAN_QUESTIONS, getGapPriority, getSuggestedEvidence } from '@/lib/vsme-scan-questions';
import { performDossierResearch, validateDossierQuotes } from '@/lib/research-engine';
import { normalizeDossier } from '@/lib/field-normalizer';
import { checkMvoRegister } from '@/lib/mvo-register';

// Vercel function timeout
export const maxDuration = 300; // 5 minutes

// Evidence schema - every field needs source
const EvidenceSchema = z.object({
  value: z.union([z.string(), z.number(), z.array(z.string()), z.literal('onbekend')]).nullable(),
  source_url: z.string().nullable(),
  quote: z.string().nullable(),
});

// Schema for company data extraction with sources
// All properties REQUIRED for OpenAI strict mode - use null/empty for missing data
const CompanyDataSchema = z.object({
  naam: z.string(),
  kvk: z.string().nullable(),
  kvk_source: z.string().nullable(),
  sector: z.string(),
  sector_source: z.string().nullable(),
  aantal_medewerkers: z.union([z.number(), z.literal('onbekend')]),
  aantal_medewerkers_source: z.string().nullable(),
  aantal_medewerkers_quote: z.string().nullable(),
  omzet: z.union([z.number(), z.literal('onbekend')]),
  omzet_source: z.string().nullable(),
  balanstotaal: z.union([z.number(), z.literal('onbekend')]),
  belangrijkste_afnemers: z.array(z.string()).nullable(),
  afnemers_source: z.string().nullable(),
  producten: z.array(z.string()).nullable(),
  producten_source: z.string().nullable(),
  certificaten: z.array(z.string()).nullable(),
  certificaten_source: z.string().nullable(),
  beschrijving: z.string().nullable(),
  confidence: z.enum(['hoog', 'middel', 'laag']),
});

async function fetchPageContent(url: string, timeoutMs: number = 8000): Promise<{ content: string; url: string } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(timeoutMs)
    });
    
    if (!response.ok) return null;

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove script, style, and navigation elements
    $('script, style, nav, header').remove();
    
    // Extract main text content
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);
    
    return { content: text, url };
  } catch (error) {
    return null;
  }
}

async function deepCrawlWebsite(baseUrl: string): Promise<{ pages: Array<{ url: string; content: string }>; totalContent: string }> {
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;
  
  // Common pages to check
  const pathsToTry = [
    '/',
    '/over-ons',
    '/about',
    '/about-us',
    '/duurzaamheid',
    '/sustainability',
    '/mvo',
    '/esg',
    '/csr',
    '/vacatures',
    '/careers',
    '/jobs',
    '/contact',
    '/algemene-voorwaarden',
    '/terms',
    '/privacy',
    '/sitemap.xml',
  ];
  
  const urlsToFetch = pathsToTry.map(path => `${origin}${path}`);
  
  // Parallel fetch with timeout
  const results = await Promise.all(
    urlsToFetch.map(url => fetchPageContent(url, 6000))
  );
  
  const pages = results.filter((r): r is { content: string; url: string } => r !== null && r.content.length > 100);
  
  // Combine all content
  const totalContent = pages.map(p => `[${p.url}]\n${p.content}`).join('\n\n---\n\n').slice(0, 50000);
  
  return { pages, totalContent };
}

async function researchCompanyWithWebSearch(companyName: string, city: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Web search skipped: No OpenAI API key');
    return 'Web search overgeslagen (geen API key beschikbaar)';
  }

  try {
    // OpenAI Responses API with the web_search tool
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        tools: [{ type: 'web_search' }],
        temperature: 0.1,
        max_output_tokens: 3000,
        input: `Onderzoek dit Nederlandse bedrijf en geef ALLEEN feiten met bronnen:

Bedrijf / website: ${companyName}
Locatie: ${city}

Zoek naar:
1. KvK-nummer (uit KvK register of bedrijfsprofiel)
2. Aantal medewerkers/FTE (alleen als je het toevallig vindt)
3. Sector/SBI-code
4. Certificaten: ISO 14001, EcoVadis score, B Corp, CO2-Prestatieladder niveau, SBTi commitment
5. Belangrijkste klanten/afnemers
6. Producten (vooral: soja, palmolie, rundvee, cacao, koffie, rubber, hout, staal, aluminium, cement voor EUDR/CBAM)
7. Relevante ESG/duurzaamheid nieuws

Geef elk feit met bron-URL. Als niet gevonden: vermeld dat expliciet.`,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      return `Web search error: ${response.status}`;
    }

    const data = await response.json();
    if (typeof data.output_text === 'string' && data.output_text) return data.output_text;
    let text = '';
    for (const item of data.output || []) {
      if (item?.type !== 'message') continue;
      for (const c of item.content || []) {
        if (c?.type === 'output_text') text += c.text || '';
      }
    }
    return text || 'Geen resultaten';
    
  } catch (error) {
    console.error('Web search error:', error);
    return `Web search mislukt: ${error instanceof Error ? error.message : 'Onbekend'}`;
  }
}

async function mergeDossier(db: any, clientId: number | string, patch: Record<string, any>) {
  if (!isUsingSupabase()) return;
  const { data, error } = await db.from('clients').select('dossier').eq('id', clientId).single();
  if (error) {
    console.error('Read dossier failed:', error);
  }
  const current = data?.dossier && typeof data.dossier === 'object' ? data.dossier : {};
  const { error: updError } = await db
    .from('clients')
    .update({ dossier: { ...current, ...patch }, updated_at: new Date().toISOString() })
    .eq('id', clientId);
  if (updError) {
    console.error('Update dossier failed:', updError);
    throw new Error(`Database fout: ${updError.message}`);
  }
}

export async function POST(request: NextRequest) {
  let currentStep = 'onbekend';
  try {
    // Parse body ONCE at the top - cannot read request.json() multiple times
    const body = await request.json();
    const { url, city, step, clientId } = body;
    currentStep = step || 'onbekend';

    if (!url) {
      return NextResponse.json({ error: 'URL is verplicht' }, { status: 400 });
    }
    
    if (!city) {
      return NextResponse.json({ error: 'Hoofdvestigingsplaats is verplicht' }, { status: 400 });
    }

    // Validate and normalize URL
    let websiteUrl: URL;
    try {
      websiteUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Ongeldige URL' }, { status: 400 });
    }

    const db = getDb();

    // Step 1: Deep crawl website
    if (step === 'crawl') {
      const crawlData = await deepCrawlWebsite(websiteUrl.toString());
      return NextResponse.json({ 
        success: true, 
        pagesFound: crawlData.pages.length,
        urls: crawlData.pages.map(p => p.url),
        contentLength: crawlData.totalContent.length
      });
    }

    // Step 2: Web search research
    if (step === 'research') {
      // Get company name from URL or use domain
      const companyName = websiteUrl.hostname.replace('www.', '').split('.')[0];
      const researchResults = await researchCompanyWithWebSearch(companyName, city);
      
      return NextResponse.json({ 
        success: true, 
        research: researchResults.slice(0, 2000) + '...' 
      });
    }

    // Step 3: Extract company data (deep analysis with sources)
    if (step === 'extract') {
      // Deep crawl
      const crawlData = await deepCrawlWebsite(websiteUrl.toString());
      
      // Web search
      const companyName = websiteUrl.hostname.replace('www.', '').split('.')[0];
      const webResearch = await researchCompanyWithWebSearch(companyName, city);
      
      // Combined analysis
      const { object: companyData } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: CompanyDataSchema,
        prompt: `Analyseer deze data en extraheer bedrijfsgegevens met bronnen.

Bedrijf: ${companyName}
Stad: ${city}
Website: ${websiteUrl.toString()}

WEBSITE CONTENT (meerdere pagina's):
${crawlData.totalContent}

WEB RESEARCH:
${webResearch}

KRITISCH - Regels:
1. NOOIT getallen verzinnen! Gebruik "onbekend" als niet gevonden.
2. Elk gegeven MOET een bron hebben (URL waar het vandaan komt).
3. Voor aantal_medewerkers: geef bron + citaat (bijv. "50 medewerkers" van LinkedIn)
4. Voor omzet: alleen als expliciet vermeld, anders "onbekend" (niet belangrijk voor drempelcheck)
5. Voor KvK: zoek in footer, algemene voorwaarden, KvK register, of null
6. Certificaten: ISO 14001, EcoVadis, B Corp, CO2-Prestatieladder, SBTi

Output per veld met *_source URL:
- naam: bedrijfsnaam
- kvk: nummer of null, kvk_source: URL
- sector: SBI-sector, sector_source: URL
- aantal_medewerkers: aantal of "onbekend", aantal_medewerkers_source: URL, aantal_medewerkers_quote: citaat
- omzet: bedrag of "onbekend", omzet_source: URL (niet kritisch)
- balanstotaal: bedrag of "onbekend"
- belangrijkste_afnemers: array of null, afnemers_source: URL
- producten: array (EUDR/CBAM: soja, palmolie, rundvee, cacao, koffie, rubber, hout, staal, aluminium, cement) of null, producten_source: URL
- certificaten: array of null, certificaten_source: URL
- beschrijving: tekst of null
- confidence: hoog/middel/laag`,
      });

      return NextResponse.json({ 
        success: true, 
        companyData,
        pagesAnalyzed: crawlData.pages.length
      });
    }

    // Step 4: MVO scan & gap analysis (VSME B1-B11 + extra)
    if (step === 'scan') {
      if (!clientId) {
        return NextResponse.json({ error: 'Client ID verplicht voor scan stap' }, { status: 400 });
      }

      // Use deep crawl for comprehensive scan
      const crawlData = await deepCrawlWebsite(websiteUrl.toString());
      
      // Scan each VSME question
      const scanResults = [];
      const gaps = [];
      
      for (const q of ALL_SCAN_QUESTIONS) {
        const result = await generateText({
          model: openai('gpt-4o-mini'),
          prompt: `Beoordeel deze vraag voor het bedrijf op basis van hun website (meerdere pagina's):

Vraag: ${q.question}
Categorie: ${q.category}

Website content (gecombineerd):
${crawlData.totalContent.slice(0, 5000)}

Geef in JSON formaat:
{
  "gevonden": true/false,
  "bewijs": "citaat van de website of 'Niet gevonden'",
  "bron_url": "URL waar het staat (een van de gecrawlde pagina's), of null",
  "opmerkingen": "extra context"
}`,
        });

        try {
          const parsed = JSON.parse(result.text);
          
          // Store answer
          const db = getDb();
          db.prepare(`
            INSERT OR REPLACE INTO scan_answers (client_id, category, question_key, answer)
            VALUES (?, ?, ?, ?)
          `).run(clientId, q.category, q.id, JSON.stringify(parsed));

          scanResults.push({
            questionId: q.id,
            question: q.question,
            ...parsed
          });

          // Create gap if not found
          if (!parsed.gevonden) {
            const priority = getGapPriority(q.id);
            const suggestions = getSuggestedEvidence(q.id);
            
            db.prepare(`
              INSERT INTO gap_items (client_id, gap_title, priority, suggested_evidence, status)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              clientId,
              `${q.category}: ${q.question}`,
              priority,
              suggestions.join('; '),
              'open'
            );

            gaps.push({
              title: q.question,
              priority,
              why: q.why_important,
              suggestions
            });
          }
        } catch (e) {
          console.error(`Failed to parse scan result for ${q.id}:`, e);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        scanResults,
        gaps,
        totalQuestions: ALL_SCAN_QUESTIONS.length,
        gapsCount: gaps.length
      });
    }

    // Step 5: Threshold check
    if (step === 'threshold') {
      if (!clientId) {
        return NextResponse.json({ error: 'Client ID verplicht voor threshold stap' }, { status: 400 });
      }

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as any;

      // Parse products from client data
      const products = client.afnemers?.split(',').map((p: string) => p.trim()) || [];
      let dossier = client.dossier;
      if (typeof dossier === 'string') {
        try {
          dossier = JSON.parse(dossier);
        } catch {
          dossier = {};
        }
      }

      const thresholds = checkAllThresholds(
        {
          aantal_medewerkers: client.aantal_medewerkers === 'onbekend' ? undefined : client.aantal_medewerkers,
          omzet: client.omzet === 'onbekend' ? undefined : client.omzet,
          balanstotaal: client.balanstotaal === 'onbekend' ? undefined : client.balanstotaal,
          sector: client.sector,
          products,
        },
        dossier
      );

      return NextResponse.json({ 
        success: true, 
        thresholds 
      });
    }

    // Step: deep research dossier (Responses API + web_search), merged into clients.dossier
    if (step === 'dossier') {
      if (!clientId) {
        return NextResponse.json({ error: 'Client ID verplicht voor dossier stap', step }, { status: 400 });
      }
      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API key ontbreekt', step }, { status: 500 });
      }

      const research = await performDossierResearch(websiteUrl.toString(), city, process.env.OPENAI_API_KEY, 210000);
      let onderzoek = research.dossier;
      if (onderzoek) {
        try {
          onderzoek = await validateDossierQuotes(onderzoek, 45000);
        } catch (e) {
          console.error('Quote validation failed (non-fatal):', e);
        }
        // Normalize to ensure consistent structure (parse JSON strings, etc.)
        onderzoek = normalizeDossier(onderzoek);
      }

      const patch: Record<string, any> = {
        onderzoek: onderzoek || null,
        onderzoek_webbronnen: research.citations,
        onderzoek_model: research.model,
        onderzoek_op: new Date().toISOString(),
      };
      if (!onderzoek) {
        patch.onderzoek_ruwe_tekst = research.raw ? research.raw.slice(0, 60000) : null;
        patch.onderzoek_fout = research.error || 'onbekend';
      }
      await mergeDossier(db, clientId, patch);

      if (!onderzoek) {
        return NextResponse.json({ error: `Diepteonderzoek mislukt: ${research.error || 'onbekend'}`, step }, { status: 502 });
      }
      return NextResponse.json({ success: true, webbronnen: research.citations.length });
    }

    // Step: MVO-register check
    if (step === 'mvo_register') {
      if (!clientId) {
        return NextResponse.json({ error: 'Client ID verplicht voor MVO-register stap', step }, { status: 400 });
      }

      // Get client data to extract name and KvK
      let client: any;
      if (isUsingSupabase()) {
        const { data } = await db.from('clients').select('naam, kvk').eq('id', clientId).single();
        client = data;
      } else {
        client = db.prepare('SELECT naam, kvk FROM clients WHERE id = ?').get(clientId);
      }

      if (!client || !client.naam) {
        return NextResponse.json({ error: 'Bedrijfsnaam ontbreekt', step }, { status: 400 });
      }

      // Perform MVO-register check (non-fatal)
      try {
        const mvoCheck = await checkMvoRegister(client.naam, client.kvk);
        await mergeDossier(db, clientId, { mvo_register: mvoCheck });
        return NextResponse.json({ 
          success: true, 
          status: mvoCheck.status,
          matches: mvoCheck.matches.length 
        });
      } catch (error) {
        console.error('MVO-register check failed (non-fatal):', error);
        // Store failure status
        const failedCheck = {
          status: 'kon_niet_controleren',
          gezocht_op: client.naam,
          matches: [],
          gecontroleerd_op: new Date().toISOString(),
        };
        await mergeDossier(db, clientId, { mvo_register: failedCheck });
        return NextResponse.json({ 
          success: true, 
          status: 'kon_niet_controleren',
          matches: 0
        });
      }
    }

    // Step 6: Claim check (ECGT + ACM)
    if (step === 'claims') {
      if (!clientId) {
        return NextResponse.json({ error: 'Client ID verplicht voor claims stap' }, { status: 400 });
      }
      
      // Use deep crawl for comprehensive claim detection
      const crawlData = await deepCrawlWebsite(websiteUrl.toString());
      
      // Use claim-check-rules module
      const claimResults = extractAndCheckClaims(crawlData.totalContent, websiteUrl.toString());

      // Store in database
      if (isUsingSupabase()) {
        await mergeDossier(db, clientId, { claimcheck: claimResults });
      } else {
        for (const result of claimResults) {
          db.prepare(`
            INSERT INTO claim_checks (client_id, claim_text, result, risks, suggestions)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            clientId,
            result.claim_text,
            `${result.color.toUpperCase()}: ${result.matched_rule}`,
            `${result.reason}\n\nJuridische basis: ${result.legal_basis}`,
            result.rewrite_suggestion
          );
        }
      }

      return NextResponse.json({ 
        success: true, 
        claims: claimResults,
        summary: {
          red: claimResults.filter(c => c.color === 'red').length,
          orange: claimResults.filter(c => c.color === 'orange').length,
          green: claimResults.filter(c => c.color === 'green').length,
        }
      });
    }

    // Full analysis (all steps combined with deep research)
    if (step === 'full') {
      console.log('Starting full analysis for:', websiteUrl.toString(), 'city:', city);
      
      // Deep crawl (non-fatal)
      let crawlData;
      try {
        crawlData = await deepCrawlWebsite(websiteUrl.toString());
        console.log(`Crawled ${crawlData.pages.length} pages, ${crawlData.totalContent.length} chars`);
      } catch (error) {
        console.error('Crawl error (continuing):', error);
        crawlData = { pages: [], totalContent: 'Crawl fout' };
      }
      
      // Web search (non-fatal)
      const companyName = websiteUrl.hostname.replace('www.', '').split('.')[0];
      let webResearch;
      try {
        webResearch = await researchCompanyWithWebSearch(companyName, city);
        console.log('Web research completed, length:', webResearch.length);
      } catch (error) {
        console.error('Web research error (continuing):', error);
        webResearch = 'Web research overgeslagen';
      }
      
      // Extract company data with sources
      console.log('Extracting company data with OpenAI...');
      const { object: companyData } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: CompanyDataSchema,
        prompt: `DEEP ANALYSIS met bronvermelding.

Bedrijf: ${companyName}
Stad: ${city}
Website: ${websiteUrl.toString()}

WEBSITE CONTENT (${crawlData.pages.length} pagina's):
${crawlData.totalContent}

WEB RESEARCH RESULTS:
${webResearch}

REGELS:
1. NOOIT getallen verzinnen - gebruik "onbekend"
2. Elk veld moet een *_source URL hebben
3. aantal_medewerkers: met source + quote (LinkedIn, werkenbij.nl, nieuws)
4. omzet: NIET belangrijk, mag "onbekend" zijn
5. KvK: uit footer, voorwaarden, of KvK register
6. certificaten: ISO 14001, EcoVadis, B Corp, CO2-Prestatieladder, SBTi

Vul alle velden in met bronnen waar mogelijk.`,
      });
      
      console.log('Extracted company data:', {
        naam: companyData.naam,
        sector: companyData.sector,
        fte: companyData.aantal_medewerkers,
        omzet: companyData.omzet,
        kvk: companyData.kvk
      });

      // Create or update client in database
      let finalClientId: number;
      
      if (isUsingSupabase()) {
        // Convert 'onbekend' strings to null for INTEGER/NUMERIC columns
        const clientData = {
          naam: companyData.naam,
          kvk: companyData.kvk || null,
          sector: companyData.sector || null,
          aantal_medewerkers: typeof companyData.aantal_medewerkers === 'number' ? companyData.aantal_medewerkers : null,
          omzet: typeof companyData.omzet === 'number' ? companyData.omzet : null,
          balanstotaal: typeof companyData.balanstotaal === 'number' ? companyData.balanstotaal : null,
          afnemers: companyData.belangrijkste_afnemers?.join(', ') || null,
          banken: null,
          tenders: null,
          website_url: websiteUrl.toString(),
          plaats: city,
          updated_at: new Date().toISOString(),
        };
        
        if (clientId) {
          // Update existing client
          console.log('Updating existing client:', clientId);
          const { error } = await db
            .from('clients')
            .update(clientData)
            .eq('id', clientId);
          
          if (error) {
            console.error('Supabase update error:', error);
            throw new Error(`Database fout: ${error.message}`);
          }
          finalClientId = clientId as number;
        } else {
          // Create new client
          console.log('Inserting client to Supabase:', { ...clientData, afnemers: clientData.afnemers?.substring(0, 50) });
          
          const { data: client, error } = await db
            .from('clients')
            .insert(clientData)
            .select('id')
            .single();
          
          if (error) {
            console.error('Supabase insert error:', error);
            throw new Error(`Database fout: ${error.message}`);
          }
          finalClientId = client.id;
          
          // Initialize status for new clients only
          const steps = ['scan', 'gatanalyse', 'bewijspakket', 'claimcheck', 'jaarlijkse-update'];
          const statusData = steps.map(step => ({
            client_id: finalClientId,
            stap: step,
            status: 'nog-niet-gestart'
          }));
          await db.from('client_status').insert(statusData);
        }
        
        // Store the basic profile in the dossier column (non-fatal). Deep research runs in step 'dossier'.
        try {
          const { error: dossierError } = await db
            .from('clients')
            .update({
              dossier: {
                basis: companyData,
                website: { url: websiteUrl.toString(), paginas: crawlData.pages.map((p: any) => p.url) },
                web_research_tekst: webResearch,
                aangemaakt_op: new Date().toISOString(),
              },
            })
            .eq('id', finalClientId);
          if (dossierError) console.error('Failed to store basic dossier:', dossierError);
        } catch (dossierError) {
          console.error('Storing basic dossier failed (non-fatal):', dossierError);
        }
        
      } else {
        if (clientId) {
          // Update existing SQLite client
          db.prepare(`
            UPDATE clients 
            SET naam = ?, sector = ?, aantal_medewerkers = ?, omzet = ?, balanstotaal = ?, afnemers = ?, kvk = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(
            companyData.naam,
            companyData.sector,
            companyData.aantal_medewerkers === 'onbekend' ? null : companyData.aantal_medewerkers,
            companyData.omzet === 'onbekend' ? null : companyData.omzet,
            companyData.balanstotaal === 'onbekend' ? null : companyData.balanstotaal,
            companyData.belangrijkste_afnemers?.join(', ') || null,
            companyData.kvk,
            clientId
          );
          finalClientId = clientId as number;
        } else {
          // Create new SQLite client
          const result = db.prepare(`
            INSERT INTO clients (naam, sector, aantal_medewerkers, omzet, balanstotaal, afnemers, kvk)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            companyData.naam,
            companyData.sector,
            companyData.aantal_medewerkers === 'onbekend' ? null : companyData.aantal_medewerkers,
            companyData.omzet === 'onbekend' ? null : companyData.omzet,
            companyData.balanstotaal === 'onbekend' ? null : companyData.balanstotaal,
            companyData.belangrijkste_afnemers?.join(', ') || null,
            companyData.kvk
          );
          finalClientId = result.lastInsertRowid as number;
          
          // Initialize status for new clients only
          const steps = ['scan', 'gatanalyse', 'bewijspakket', 'claimcheck', 'jaarlijkse-update'];
          const statusStmt = db.prepare(`
            INSERT INTO client_status (client_id, stap, status)
            VALUES (?, ?, ?)
          `);
          for (const step of steps) {
            statusStmt.run(finalClientId, step, 'nog-niet-gestart');
          }
        }
      }

      return NextResponse.json({ 
        success: true,
        clientId: finalClientId,
        companyData,
        websiteUrl: websiteUrl.toString(),
        pagesAnalyzed: crawlData.pages.length,
        needsConfirmation: false // Never block - FTE and omzet are not required
      });
    }

    return NextResponse.json({ error: 'Ongeldige step parameter' }, { status: 400 });
    
  } catch (error) {
    console.error('Website analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error('Error details:', errorDetails);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        step: currentStep,
        details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
      },
      { status: 500 }
    );
  }
}
