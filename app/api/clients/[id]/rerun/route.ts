import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { createSectionJob, updateSectionJob, saveDossierVersion } from '@/lib/section-runner';
import { createSectionMetadata, type SectionName } from '@/lib/section-versions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SECTION_ORDER: SectionName[] = [
  'profiel',
  'vsme',
  'certificaten',
  'claimcheck',
  'klanteisen',
  'tenders',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    // Get client
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

    // Parse dossier
    let dossier: any = client.dossier;
    if (typeof dossier === 'string') {
      try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
    }
    dossier = dossier || {};

    // Save current version before full rerun
    await saveDossierVersion(
      parseInt(id),
      dossier,
      'full_rerun',
      'Full rerun: all sections'
    );

    // Create jobs for all sections
    const jobIds: Record<string, number> = {};
    for (const section of SECTION_ORDER) {
      const jobId = await createSectionJob(parseInt(id), section);
      jobIds[section] = jobId;
    }

    // Return immediately with job IDs
    const response = NextResponse.json({
      success: true,
      message: 'Full rerun started',
      jobIds,
      sections: SECTION_ORDER,
    });

    // Start async processing chain
    after(async () => {
      await runFullRerunChain(parseInt(id), jobIds);
    });

    return response;
  } catch (error) {
    console.error('Error starting full rerun:', error);
    return NextResponse.json(
      { error: 'Failed to start full rerun', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function runFullRerunChain(clientId: number, jobIds: Record<string, number>) {
  const db = getDb();

  try {
    // Get client fresh
    let client: any = null;
    if (isUsingSupabase()) {
      const { data } = await db.from('clients').select('*').eq('clientId', clientId).single();
      client = data;
    } else {
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    }

    if (!client) {
      throw new Error('Client not found');
    }

    // Step 1: Run web research and store onderzoek_ruw
    console.log(`[Full Rerun ${clientId}] Step 1: Web research`);
    
    const websiteUrl = client.website_url;
    const plaats = client.plaats;

    if (!websiteUrl || !plaats) {
      throw new Error('Website URL and plaats are required for full rerun');
    }

    // TODO: Run actual web research here
    // This would call the onderzoek-systeem.md prompt with website & plaats
    // For now, we'll just mark it as placeholder
    
    const onderzoekRuw = {
      timestamp: new Date().toISOString(),
      website: websiteUrl,
      plaats,
      bronnen: [],
      raw_text: 'Placeholder for web research results',
    };

    // Save onderzoek_ruw to database
    if (isUsingSupabase()) {
      await db.from('clients').update({
        onderzoek_ruw: onderzoekRuw,
      }).eq('id', clientId);
    } else {
      db.prepare('UPDATE clients SET onderzoek_ruw = ? WHERE id = ?')
        .run(JSON.stringify(onderzoekRuw), clientId);
    }

    // Step 2-7: Run each section in order
    for (const section of SECTION_ORDER) {
      const jobId = jobIds[section];
      console.log(`[Full Rerun ${clientId}] Running section: ${section}`);

      await updateSectionJob(jobId, {
        status: 'running',
        started_at: new Date().toISOString(),
        progress: 10,
      });

      try {
        // Reload client to get latest state
        if (isUsingSupabase()) {
          const { data } = await db.from('clients').select('*').eq('id', clientId).single();
          client = data;
        } else {
          client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
        }

        let dossier: any = client.dossier;
        if (typeof dossier === 'string') {
          try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
        }
        dossier = dossier || {};

        let sectionMetadata: any = client.section_metadata;
        if (typeof sectionMetadata === 'string') {
          try { sectionMetadata = JSON.parse(sectionMetadata); } catch { sectionMetadata = {}; }
        }
        sectionMetadata = sectionMetadata || {};

        let onderzoekRuwData: any = client.onderzoek_ruw;
        if (typeof onderzoekRuwData === 'string') {
          try { onderzoekRuwData = JSON.parse(onderzoekRuwData); } catch { onderzoekRuwData = {}; }
        }

        // TODO: Process section with AI using section-specific prompt
        // - lib/prompts/profiel.md
        // - lib/prompts/vsme.md (includes gaten)
        // - lib/prompts/certificaten.md
        // - lib/prompts/claimcheck.md
        // - lib/prompts/klanteisen.md
        // - lib/prompts/tenders.md

        await updateSectionJob(jobId, { progress: 80 });

        // Update section metadata
        sectionMetadata[section] = createSectionMetadata(section);

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

        console.log(`[Full Rerun ${clientId}] Section ${section} completed`);
      } catch (error) {
        console.error(`[Full Rerun ${clientId}] Error in section ${section}:`, error);
        await updateSectionJob(jobId, {
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        });
      }
    }

    console.log(`[Full Rerun ${clientId}] Complete`);
  } catch (error) {
    console.error(`[Full Rerun ${clientId}] Fatal error:`, error);
  }
}
