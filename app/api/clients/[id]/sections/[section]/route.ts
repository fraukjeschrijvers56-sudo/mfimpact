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
            
            // Fill placeholders
            promptTemplate = promptTemplate.replace('{naam}', profiel.handelsnaam || clientRecord?.naam || 'de prospect');
            promptTemplate = promptTemplate.replace('{url}', clientRecord?.website_url || 'onbekend');
            promptTemplate = promptTemplate.replace('{plaats}', profiel.hoofdvestiging || clientRecord?.plaats || 'onbekend');
            promptTemplate = promptTemplate.replace('{onderzoek_json}', JSON.stringify(onderzoek, null, 2));
            promptTemplate = promptTemplate.replace('{kennisbank_json}', JSON.stringify(KLANTEISEN_KB, null, 2));
            
            // TODO: Call OpenAI with promptTemplate and web_search enabled
            // For now, structure the output correctly but keep existing data
            const existingKlanteisen = onderzoek.klanteisen || {};
            
            // Map old structure to new structure for backwards compat
            newSectionData = {
              klanteisen: {
                klanttypen: existingKlanteisen.klanttypen || [],
                eisen: existingKlanteisen.eisen || [],
                tendertreffers: existingKlanteisen.concrete_tenders || existingKlanteisen.tendertreffers || [],
                aanknopingspunten: existingKlanteisen.aanknopingspunten || [],
                // Keep old structure for compat
                concrete_tenders: existingKlanteisen.concrete_tenders || [],
              },
            };
          } catch (error: any) {
            throw new Error(`Klanteisen processing failed: ${error.message}`);
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
