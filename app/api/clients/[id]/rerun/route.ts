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

    // Step 1: Run full research via research-engine
    console.log(`[Full Rerun ${clientId}] Step 1: Full dossier research`);
    
    const websiteUrl = client.website_url;
    const plaats = client.plaats;

    if (!websiteUrl || !plaats) {
      throw new Error('Website-URL en plaats zijn vereist voor volledig heronderzoek');
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY ontbreekt in omgevingsvariabelen');
    }

    // Call research-engine (same as original working flow)
    const { performDossierResearch, validateDossierQuotes } = await import('@/lib/research-engine');
    
    const researchResult = await performDossierResearch(websiteUrl, plaats, apiKey, 180000);
    
    if (!researchResult.dossier || researchResult.error) {
      throw new Error(`Webonderzoek mislukt: ${researchResult.error || 'geen geldig dossier'}`);
    }

    console.log(`[Full Rerun ${clientId}] Research completed with model ${researchResult.model}, ${researchResult.citations.length} citations`);

    // Validate quotes (parallel fetches)
    const validatedDossier = await validateDossierQuotes(researchResult.dossier, 45000);

    // Store in dossier.onderzoek AND onderzoek_ruw
    const onderzoekRuw = {
      timestamp: new Date().toISOString(),
      website: websiteUrl,
      plaats,
      raw_text: researchResult.raw,
      model: researchResult.model,
      citations: researchResult.citations,
      bronnen: researchResult.citations,
    };

    // Parse existing dossier to preserve other sections
    let dossier: any = client.dossier;
    if (typeof dossier === 'string') {
      try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
    }
    dossier = dossier || {};

    // Update onderzoek with validated result
    dossier.onderzoek = validatedDossier;
    dossier.onderzoek_model = researchResult.model;
    dossier.onderzoek_op = new Date().toISOString();
    dossier.onderzoek_webbronnen = researchResult.citations;

    // Save to database
    if (isUsingSupabase()) {
      await db.from('clients').update({
        dossier,
        onderzoek_ruw: onderzoekRuw,
      }).eq('id', clientId);
    } else {
      db.prepare('UPDATE clients SET dossier = ?, onderzoek_ruw = ? WHERE id = ?')
        .run(JSON.stringify(dossier), JSON.stringify(onderzoekRuw), clientId);
    }

    console.log(`[Full Rerun ${clientId}] Full research completed, now running klanteisen as follow-up`);

    // Step 2: Run klanteisen as follow-up using the sections API
    // This ensures klanteisen uses the fresh onderzoek data
    const klanteisJobId = jobIds['klanteisen'];
    
    try {
      const response = await fetch(`http://localhost:3000/api/clients/${clientId}/sections/klanteisen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`[Full Rerun ${clientId}] Klanteisen call failed:`, response.status);
      } else {
        console.log(`[Full Rerun ${clientId}] Klanteisen job started`);
      }
    } catch (error) {
      console.error(`[Full Rerun ${clientId}] Error calling klanteisen:`, error);
    }

    // Mark other section jobs as done (they were populated by the full research)
    const { updateSectionMetadata } = await import('@/lib/section-versions');
    
    // Reload client to get latest dossier
    if (isUsingSupabase()) {
      const { data } = await db.from('clients').select('*').eq('id', clientId).single();
      client = data;
    } else {
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    }
    
    let sectionMetadata: any = client.section_metadata;
    if (typeof sectionMetadata === 'string') {
      try { sectionMetadata = JSON.parse(sectionMetadata); } catch { sectionMetadata = {}; }
    }
    sectionMetadata = sectionMetadata || {};
    
    // Mark all non-klanteisen sections as done
    for (const section of SECTION_ORDER.filter(s => s !== 'klanteisen')) {
      const jobId = jobIds[section];
      
      await updateSectionJob(jobId, {
        status: 'done',
        progress: 100,
        completed_at: new Date().toISOString(),
      });
      
      sectionMetadata = updateSectionMetadata(sectionMetadata, section as any, {
        status: 'done',
      });
    }
    
    // Save metadata
    if (isUsingSupabase()) {
      await db.from('clients').update({
        section_metadata: sectionMetadata,
      }).eq('id', clientId);
    } else {
      db.prepare('UPDATE clients SET section_metadata = ? WHERE id = ?')
        .run(JSON.stringify(sectionMetadata), clientId);
    }

    console.log(`[Full Rerun ${clientId}] Complete`);
  } catch (error) {
    console.error(`[Full Rerun ${clientId}] Fatal error:`, error);
  }
}
