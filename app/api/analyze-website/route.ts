import { NextRequest, NextResponse } from 'next/server';
import { generateObject, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import { getDb } from '@/lib/db';
import { checkAllThresholds } from '@/lib/esg-thresholds';
import { extractAndCheckClaims } from '@/lib/claim-check-rules';
import { ALL_SCAN_QUESTIONS, getGapPriority, getSuggestedEvidence } from '@/lib/vsme-scan-questions';

// Schema for company data extraction - NOOIT verzinnen, gebruik "onbekend"
// All properties REQUIRED for OpenAI strict mode - use null/empty for missing data
const CompanyDataSchema = z.object({
  naam: z.string(),
  kvk: z.string().nullable(),
  sector: z.string(),
  aantal_medewerkers: z.union([z.number(), z.literal('onbekend')]),
  omzet: z.union([z.number(), z.literal('onbekend')]),
  balanstotaal: z.union([z.number(), z.literal('onbekend')]),
  belangrijkste_afnemers: z.array(z.string()).nullable(),
  producten: z.array(z.string()).nullable(),
  beschrijving: z.string().nullable(),
  confidence: z.enum(['hoog', 'middel', 'laag']),
});

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Remove script, style, and navigation elements
    $('script, style, nav, footer, header').remove();
    
    // Extract main text content
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // Limit to 8000 chars
    
    return text;
  } catch (error) {
    throw new Error(`Website ophalen mislukt: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, step } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is verplicht' }, { status: 400 });
    }

    // Validate and normalize URL
    let websiteUrl: URL;
    try {
      websiteUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Ongeldige URL' }, { status: 400 });
    }

    const db = getDb();

    // Step 1: Fetch website content
    if (step === 'fetch') {
      const content = await fetchWebsiteContent(websiteUrl.toString());
      return NextResponse.json({ 
        success: true, 
        content: content.slice(0, 1000) + '...',
        contentLength: content.length 
      });
    }

    // Step 2: Extract company data
    if (step === 'extract') {
      const content = await fetchWebsiteContent(websiteUrl.toString());
      
      const { object: companyData } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: CompanyDataSchema,
        prompt: `Analyseer deze website en extraheer ALLEEN feiten die EXPLICIET vermeld worden.

Website: ${websiteUrl.toString()}
Content: ${content}

KRITISCH: NOOIT aantallen verzinnen! Gebruik null voor ontbrekende arrays/strings.
- aantal_medewerkers: alleen als expliciet vermeld (bijv. "50 medewerkers", "team van 12"), anders "onbekend"
- omzet: alleen als expliciet vermeld in jaarverslag/cijfers, anders "onbekend"  
- balanstotaal: alleen als expliciet vermeld, anders "onbekend"
- kvk: zoek in footer, algemene voorwaarden, of "KvK" vermelding, anders null
- sector: gok SBI-code sector op basis van producten/diensten
- producten: array van producten voor EUDR/CBAM check (soja, palmolie, rundvee, cacao, koffie, rubber, hout, staal, aluminium, cement), of null als onbekend
- belangrijkste_afnemers: array van klantgroepen (bijv. ["gemeenten", "bouwbedrijven", "consumenten"]), of null als onbekend
- beschrijving: korte omschrijving bedrijf, of null
- confidence: 'hoog' als veel cijfers gevonden, 'middel' als sector duidelijk, 'laag' als weinig info`,
      });

      return NextResponse.json({ 
        success: true, 
        companyData 
      });
    }

    // Step 3: MVO scan & gap analysis (VSME B1-B11 + extra)
    if (step === 'scan') {
      const { clientId } = await request.json();
      if (!clientId) {
        return NextResponse.json({ error: 'Client ID verplicht' }, { status: 400 });
      }

      const content = await fetchWebsiteContent(websiteUrl.toString());
      
      // Scan each VSME question
      const scanResults = [];
      const gaps = [];
      
      for (const q of ALL_SCAN_QUESTIONS) {
        const result = await generateText({
          model: openai('gpt-4o-mini'),
          prompt: `Beoordeel deze vraag voor het bedrijf op basis van hun website:

Vraag: ${q.question}
Categorie: ${q.category}

Website content: ${content.slice(0, 3000)}

Geef in JSON formaat:
{
  "gevonden": true/false,
  "bewijs": "citaat van de website of 'Niet gevonden'",
  "bron_url": "URL waar het staat, of null",
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

    // Step 4: Threshold check
    if (step === 'threshold') {
      const { clientId } = await request.json();
      
      if (!clientId) {
        return NextResponse.json({ error: 'Client ID verplicht' }, { status: 400 });
      }

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as any;
      
      // Parse products from client data
      const products = client.afnemers?.split(',').map((p: string) => p.trim()) || [];
      
      const thresholds = checkAllThresholds({
        aantal_medewerkers: client.aantal_medewerkers === 'onbekend' ? undefined : client.aantal_medewerkers,
        omzet: client.omzet === 'onbekend' ? undefined : client.omzet,
        balanstotaal: client.balanstotaal === 'onbekend' ? undefined : client.balanstotaal,
        sector: client.sector,
        products,
      });

      return NextResponse.json({ 
        success: true, 
        thresholds 
      });
    }

    // Step 5: Claim check (ECGT + ACM)
    if (step === 'claims') {
      const { clientId } = await request.json();
      const content = await fetchWebsiteContent(websiteUrl.toString());
      
      // Use claim-check-rules module
      const claimResults = extractAndCheckClaims(content, websiteUrl.toString());

      // Store in database
      if (clientId) {
        const db = getDb();
        for (const result of claimResults) {
          db.prepare(`
            INSERT INTO claimcheck (client_id, claim_text, result, risks, suggestions)
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

    // Full analysis (all steps combined - for progress UI)
    if (step === 'full') {
      const content = await fetchWebsiteContent(websiteUrl.toString());
      
      // Extract company data (NEVER invent numbers!)
      const { object: companyData } = await generateObject({
        model: openai('gpt-4o-mini'),
        schema: CompanyDataSchema,
        prompt: `Analyseer deze website en extraheer ALLEEN expliciete feiten:

Website: ${websiteUrl.toString()}
Content: ${content}

KRITISCH: Gebruik "onbekend" voor getallen, null voor ontbrekende tekst/arrays.
- aantal_medewerkers: alleen als vermeld, anders "onbekend"
- omzet: alleen als vermeld in cijfers, anders "onbekend"
- balanstotaal: alleen als vermeld, anders "onbekend"
- kvk: zoek in footer/algemene voorwaarden, null als niet gevonden
- sector: gok SBI op basis van activiteiten
- belangrijkste_afnemers: array van klantgroepen, of null als onbekend
- producten: array van producten voor EUDR/CBAM check (soja, palmolie, rundvee, cacao, koffie, rubber, hout, staal, aluminium, cement), of null
- beschrijving: korte omschrijving, of null
- confidence: hoog/middel/laag`,
      });

      // Create client in database
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

      const clientId = result.lastInsertRowid;

      return NextResponse.json({ 
        success: true,
        clientId,
        companyData,
        websiteUrl: websiteUrl.toString(),
        needsConfirmation: companyData.aantal_medewerkers === 'onbekend' || companyData.omzet === 'onbekend'
      });
    }

    return NextResponse.json({ error: 'Ongeldige step parameter' }, { status: 400 });
    
  } catch (error) {
    console.error('Website analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analyse mislukt' },
      { status: 500 }
    );
  }
}
