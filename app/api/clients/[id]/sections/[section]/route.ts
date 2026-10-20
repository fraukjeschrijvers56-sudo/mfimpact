import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { createSectionJob, updateSectionJob, saveDossierVersion, mergeWithEditedFields } from '@/lib/section-runner';
import { createSectionMetadata, type SectionName, SECTION_NAMES } from '@/lib/section-versions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for section refresh

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; section: string }> }
) {
  try {
    const { id, section } = await params;

    if (!SECTION_NAMES.includes(section as SectionName)) {
      return NextResponse.json({ error: 'Invalid section name' }, { status: 400 });
    }

    const sectionName = section as SectionName;
    const db = getDb();

    // Get client and current dossier
    let client: any = null;
    if (isUsingSupabase()) {
      const { data } = await db.from('clients').select('*').eq('id', id).single();
      client = data;
    } else {
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    }

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Parse dossier and onderzoek_ruw
    let dossier: any = client.dossier;
    if (typeof dossier === 'string') {
      try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
    }
    dossier = dossier || {};

    let onderzoekRuw: any = client.onderzoek_ruw;
    if (typeof onderzoekRuw === 'string') {
      try { onderzoekRuw = JSON.parse(onderzoekRuw); } catch { onderzoekRuw = {}; }
    }
    onderzoekRuw = onderzoekRuw || {};

    let sectionMetadata: any = client.section_metadata;
    if (typeof sectionMetadata === 'string') {
      try { sectionMetadata = JSON.parse(sectionMetadata); } catch { sectionMetadata = {}; }
    }
    sectionMetadata = sectionMetadata || {};

    let editedFields: string[] = client.edited_fields;
    if (typeof editedFields === 'string') {
      try { editedFields = JSON.parse(editedFields); } catch { editedFields = [];}
    }
    editedFields = editedFields || [];

    // Save current version before updating
    await saveDossierVersion(
      parseInt(id),
      dossier,
      sectionName,
      `Section refresh: ${sectionName}`
    );

    // Create job for tracking
    const jobId = await createSectionJob(parseInt(id), sectionName);

    // Start async processing with stable after() from Next.js 16
    const { after } = await import('next/server');
    
    // Return immediately with jobId, processing continues in background
    const response = NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      message: 'Section refresh started',
    });

    after(async () => {
      await processSectionAsync(
        parseInt(id),
        sectionName,
        jobId,
        dossier,
        onderzoekRuw,
        sectionMetadata,
        editedFields
      );
    });

    return response;
  } catch (error) {
    console.error('Error starting section refresh:', error);
    return NextResponse.json(
      { error: 'Failed to start section refresh', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function processSectionAsync(
  clientId: number,
  sectionName: SectionName,
  jobId: number,
  dossier: any,
  onderzoekRuw: any,
  sectionMetadata: any,
  editedFields: string[]
) {
  const db = getDb();
  
  try {
    await updateSectionJob(jobId, { status: 'running', started_at: new Date().toISOString(), progress: 10 });

    // Prepare research input (use onderzoek_ruw or fall back to existing dossier bronnen)
    let researchInput: any;
    if (onderzoekRuw && Object.keys(onderzoekRuw).length > 0) {
      researchInput = onderzoekRuw;
    } else {
      // Fallback for old dossiers without onderzoek_ruw
      const onderzoek = dossier.onderzoek || dossier;
      researchInput = {
        bronnen: onderzoek.doorzochte_bronnen || [],
        profiel: onderzoek.profiel || {},
        existing_data: onderzoek,
      };
    }

    await updateSectionJob(jobId, { progress: 30 });

    try {
      // Process section based on type
      let newSectionData: any = {};

      switch (sectionName) {
        case 'klanteisen':
          // Call AI with klanteisen prompt
          // NEVER stop on missing klanttypen - the prompt itself performs detection
          try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const promptPath = path.join(process.cwd(), 'lib/prompts/klanteisen.md');
            let promptTemplate = await fs.readFile(promptPath, 'utf-8');
            
            const { KLANTEISEN_KB } = await import('@/lib/klanteisen');
            const onderzoek = dossier.onderzoek || dossier;
            const profiel = onderzoek.profiel || {};
            
            // Get client record for metadata
            let clientRecord: any = null;
            if (isUsingSupabase()) {
              const { data } = await db.from('clients').select('*').eq('id', clientId).single();
              clientRecord = data;
            } else {
              clientRecord = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
            }
            
            // Build onderzoek_json from dossier.onderzoek when onderzoek_ruw is empty
            // Include key fields: profiel, tenders_projecten, certificaten, vsme_basic, doorzochte_bronnen
            const onderzoekInput = {
              profiel: {
                ...profiel,
                sector: profiel.sector || profiel.sbi,
                producten_diensten: profiel.producten_diensten || profiel.producten,
                afnemers_markten: profiel.afnemers_markten || profiel.afnemers,
                belangrijkste_klanten_referenties: profiel.belangrijkste_klanten_referenties || profiel.referenties || profiel.belangrijkste_klanten,
              },
              tenders_projecten: onderzoek.tenders_projecten || onderzoek.tenders || [],
              certificaten: onderzoek.certificaten || [],
              vsme_basic: onderzoek.vsme_basic || onderzoek.vsme || {},
              doorzochte_bronnen: onderzoek.doorzochte_bronnen || [],
              kansen_gesprek: onderzoek.kansen_gesprek || [],
            };
            
            // Fill placeholders
            const naam = profiel.handelsnaam || clientRecord?.naam || 'de prospect';
            const url = clientRecord?.website_url || 'onbekend';
            const plaats = profiel.hoofdvestiging || clientRecord?.plaats || 'onbekend';
            
            promptTemplate = promptTemplate.replace(/\{naam\}/g, naam);
            promptTemplate = promptTemplate.replace(/\{url\}/g, url);
            promptTemplate = promptTemplate.replace(/\{plaats\}/g, plaats);
            promptTemplate = promptTemplate.replace(/\{onderzoek_json\}/g, JSON.stringify(onderzoekInput, null, 2));
            promptTemplate = promptTemplate.replace(/\{kennisbank_json\}/g, JSON.stringify(KLANTEISEN_KB, null, 2));
            
            // Call OpenAI with web_search enabled
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
              throw new Error('OPENAI_API_KEY ontbreekt in omgevingsvariabelen');
            }
            
            console.log(`[Klanteisen ${clientId}] Calling OpenAI for ${naam}...`);
            
            const models = ['gpt-4o', 'gpt-4-turbo'];
            let result: any = null;
            
            for (const model of models) {
              try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    model,
                    messages: [
                      { role: 'user', content: promptTemplate }
                    ],
                    tools: [{ type: 'web_search_preview' }],
                    max_tokens: 4000,
                    temperature: 0.1,
                  }),
                  signal: AbortSignal.timeout(120000), // 2 min timeout
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  console.error(`[Klanteisen ${clientId}] Model ${model} failed:`, response.status, errorText);
                  continue;
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                
                if (content) {
                  console.log(`[Klanteisen ${clientId}] Got response from ${model}, length: ${content.length}`);
                  
                  // Parse JSON robustly
                  const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
                  const jsonStr = jsonMatch ? jsonMatch[1] : content;
                  
                  try {
                    result = JSON.parse(jsonStr);
                    console.log(`[Klanteisen ${clientId}] Parsed JSON successfully`);
                    break;
                  } catch (parseError) {
                    console.error(`[Klanteisen ${clientId}] JSON parse error:`, parseError);
                    console.error('Content:', content.substring(0, 500));
                    continue;
                  }
                }
              } catch (modelError) {
                console.error(`[Klanteisen ${clientId}] Model ${model} error:`, modelError);
                continue;
              }
            }
            
            if (!result) {
              throw new Error('OpenAI antwoordde niet met geldig JSON na alle modelpogingen');
            }
            
            // Validate result has meaningful data
            const klanttypen = result.klanttypen || [];
            const eisen = result.eisen || [];
            const tendertreffers = result.tendertreffers || [];
            const aanknopingspunten = result.aanknopingspunten || [];
            
            if (klanttypen.length === 0 && eisen.length === 0 && aanknopingspunten.length === 0) {
              throw new Error(`Geen klanttypen, eisen of aanknopingspunten gevonden. Dit kan betekenen dat het onderzoek onvoldoende informatie bevat over klanten/referenties van ${naam}. Controleer of profiel.belangrijkste_klanten_referenties gevuld is.`);
            }
            
            console.log(`[Klanteisen ${clientId}] Success: ${klanttypen.length} klanttypen, ${eisen.length} eisen, ${tendertreffers.length} tenders, ${aanknopingspunten.length} aanknopingspunten`);
            
            // Structure output
            newSectionData = {
              klanteisen: {
                klanttypen,
                eisen,
                tendertreffers,
                aanknopingspunten,
                // Keep old structure for compat
                concrete_tenders: tendertreffers,
              },
            };
          } catch (error: any) {
            console.error(`[Klanteisen ${clientId}] Error:`, error);
            throw new Error(`Klanteisen ophalen mislukt: ${error.message}`);
          }
          break;

        case 'certificaten':
        case 'profiel':
        case 'vsme':
        case 'claimcheck':
        case 'tenders':
          // In a real implementation, these would call AI with section-specific prompts:
          // - lib/prompts/profiel.md
          // - lib/prompts/vsme.md (includes gaten)
          // - lib/prompts/certificaten.md
          // - lib/prompts/claimcheck.md
          // - lib/prompts/tenders.md (uses TenderNed web search)
          // Using researchInput as context
          // NEVER stop on missing input - each prompt handles detection/search
          newSectionData = {};
          break;
      }

      await updateSectionJob(jobId, { progress: 80 });

      // Merge new data with existing, preserving manually edited fields
      const onderzoekData = dossier.onderzoek || {};
      const mergedData = mergeWithEditedFields(
        { ...onderzoekData, ...newSectionData },
        onderzoekData,
        editedFields.filter((f: string) => f.startsWith(`onderzoek.${sectionName}`))
      );

      dossier.onderzoek = mergedData;

      // Update section metadata
      sectionMetadata[sectionName] = createSectionMetadata(sectionName);

      // Save to database
      if (isUsingSupabase()) {
        await db.from('clients').update({
          dossier,
          section_metadata: sectionMetadata,
        }).eq('id', clientId);
      } else {
        db.prepare('UPDATE clients SET dossier = ?, section_metadata = ? WHERE id = ?')
          .run(JSON.stringify(dossier), JSON.stringify(sectionMetadata), clientId);
      }

      await updateSectionJob(jobId, {
        status: 'done',
        progress: 100,
        completed_at: new Date().toISOString(),
      });

    } catch (error) {
      console.error(`Error processing section ${sectionName}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update job with error
      await updateSectionJob(jobId, {
        status: 'error',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      });
      
      // Update section metadata to show error in UI
      const { updateSectionMetadata } = await import('@/lib/section-versions');
      sectionMetadata = updateSectionMetadata(sectionMetadata, sectionName, {
        status: 'error',
        error_message: errorMessage,
      });
      
      // Save error state to database
      if (isUsingSupabase()) {
        await db.from('clients').update({
          section_metadata: sectionMetadata,
        }).eq('id', clientId);
      } else {
        db.prepare('UPDATE clients SET section_metadata = ? WHERE id = ?')
          .run(JSON.stringify(sectionMetadata), clientId);
      }
    }
  } catch (error) {
    console.error(`Fatal error in async section processing:`, error);
  }
}

// GET endpoint to check job status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; section: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const { getSectionJob } = await import('@/lib/section-runner');
    const job = await getSectionJob(parseInt(jobId));

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error getting job status:', error);
    return NextResponse.json(
      { error: 'Failed to get job status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
