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

      // Get API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY ontbreekt in omgevingsvariabelen');
      }

      switch (sectionName) {
        case 'klanteisen': {
          const { KLANTEISEN_KB } = await import('@/lib/klanteisen');
          const { callSectionAI } = await import('@/lib/section-ai');
          const onderzoek = dossier.onderzoek || dossier;
          const profiel = onderzoek.profiel || {};
          
          // Get client record
          let clientRecord: any = null;
          if (isUsingSupabase()) {
            const { data } = await db.from('clients').select('*').eq('id', clientId).single();
            clientRecord = data;
          } else {
            clientRecord = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
          }
          
          // Build input with KB
          const klanteisInput = {
            naam: profiel.handelsnaam || clientRecord?.naam || 'de prospect',
            url: clientRecord?.website_url || 'onbekend',
            plaats: profiel.hoofdvestiging || clientRecord?.plaats || 'onbekend',
            onderzoek: {
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
            },
            kennisbank: KLANTEISEN_KB,
          };
          
          const result = await callSectionAI(
            {
              sectionName: 'klanteisen',
              promptFile: 'klanteisen.md',
              useWebSearch: true,
              schemaKeys: ['klanttypen', 'eisen', 'aanknopingspunten'],
            },
            klanteisInput,
            apiKey,
            120000
          );
          
          if (result.error || !result.data) {
            throw new Error(result.error || 'Klanteisen ophalen mislukt zonder data');
          }
          
          const klanttypen = result.data.klanttypen || [];
          const eisen = result.data.eisen || [];
          const tendertreffers = result.data.tendertreffers || [];
          const aanknopingspunten = result.data.aanknopingspunten || [];
          
          if (klanttypen.length === 0 && eisen.length === 0 && aanknopingspunten.length === 0) {
            throw new Error(`Geen klanttypen, eisen of aanknopingspunten gevonden voor ${klanteisInput.naam}. Controleer of belangrijkste_klanten_referenties gevuld is.`);
          }
          
          newSectionData = {
            klanteisen: {
              klanttypen,
              eisen,
              tendertreffers,
              aanknopingspunten,
              concrete_tenders: tendertreffers,
            },
          };
          break;
        }

        case 'profiel': {
          const { callSectionAI } = await import('@/lib/section-ai');
          const result = await callSectionAI(
            {
              sectionName: 'profiel',
              promptFile: 'profiel.md',
              useWebSearch: false,
              schemaKeys: ['profiel'],
            },
            researchInput,
            apiKey,
            60000
          );
          
          if (result.error || !result.data || !result.data.profiel) {
            throw new Error(result.error || 'Profiel genereren mislukt: geen data');
          }
          
          newSectionData = { profiel: result.data.profiel };
          break;
        }

        case 'vsme': {
          const { callSectionAI } = await import('@/lib/section-ai');
          const result = await callSectionAI(
            {
              sectionName: 'vsme',
              promptFile: 'vsme.md',
              useWebSearch: false,
              schemaKeys: ['vsme_basic', 'gaten'],
            },
            researchInput,
            apiKey,
            90000
          );
          
          if (result.error || !result.data) {
            throw new Error(result.error || 'VSME genereren mislukt: geen data');
          }
          
          newSectionData = {
            vsme_basic: result.data.vsme_basic || result.data.vsme || {},
            gaten: result.data.gaten || [],
          };
          break;
        }

        case 'certificaten': {
          const { callSectionAI } = await import('@/lib/section-ai');
          const result = await callSectionAI(
            {
              sectionName: 'certificaten',
              promptFile: 'certificaten.md',
              useWebSearch: true,
              schemaKeys: ['certificaten'],
            },
            researchInput,
            apiKey,
            90000
          );
          
          if (result.error || !result.data) {
            throw new Error(result.error || 'Certificaten genereren mislukt: geen data');
          }
          
          newSectionData = {
            certificaten: result.data.certificaten || [],
          };
          break;
        }

        case 'claimcheck': {
          const { callSectionAI } = await import('@/lib/section-ai');
          const result = await callSectionAI(
            {
              sectionName: 'claimcheck',
              promptFile: 'claimcheck.md',
              useWebSearch: false,
              schemaKeys: ['claims'],
            },
            researchInput,
            apiKey,
            60000
          );
          
          if (result.error || !result.data) {
            throw new Error(result.error || 'Claimcheck mislukt: geen data');
          }
          
          newSectionData = {
            claims: result.data.claims || [],
          };
          break;
        }

        case 'tenders': {
          const { callSectionAI } = await import('@/lib/section-ai');
          const result = await callSectionAI(
            {
              sectionName: 'tenders',
              promptFile: 'tenders.md',
              useWebSearch: true,
              schemaKeys: ['tenders_projecten', 'tenders'],
            },
            researchInput,
            apiKey,
            90000
          );
          
          if (result.error || !result.data) {
            throw new Error(result.error || 'Tenders genereren mislukt: geen data');
          }
          
          newSectionData = {
            tenders_projecten: result.data.tenders_projecten || result.data.tenders || [],
          };
          break;
        }

        default:
          throw new Error(`Onbekende sectie: ${sectionName}`);
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
