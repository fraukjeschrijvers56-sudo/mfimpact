import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { createSectionJob, updateSectionJob, saveDossierVersion, mergeWithEditedFields } from '@/lib/section-runner';
import { createSectionMetadata, type SectionName, SECTION_NAMES } from '@/lib/section-versions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds for section refresh

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

    // Start async processing
    // For now, do it synchronously (can be refactored to use Next.js after() or Vercel waitUntil)
    await updateSectionJob(jobId, { status: 'running', started_at: new Date().toISOString(), progress: 10 });

    try {
      // Simulate section processing based on section type
      let newSectionData: any = {};

      switch (sectionName) {
        case 'klanteisen':
          // For klanteisen, we merge with the KB
          const { mergeKlanteisen } = await import('@/lib/klanteisen');
          const onderzoek = dossier.onderzoek || dossier;
          const klanteisen = onderzoek.klanteisen || { klanttypen: [], concrete_tenders: [] };
          
          // In a real implementation, this would call an AI model with the klanteisen prompt
          // For now, just refresh the merge
          newSectionData = {
            klanteisen: klanteisen,
          };
          break;

        case 'certificaten':
        case 'profiel':
        case 'vsme':
        case 'claimcheck':
        case 'tenders':
          // For other sections, we'd call the AI with the section-specific prompt
          // For now, keep existing data
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
        }).eq('id', id);
      } else {
        db.prepare('UPDATE clients SET dossier = ?, section_metadata = ? WHERE id = ?')
          .run(JSON.stringify(dossier), JSON.stringify(sectionMetadata), id);
      }

      await updateSectionJob(jobId, {
        status: 'done',
        progress: 100,
        completed_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        jobId,
        metadata: sectionMetadata[sectionName],
      });
    } catch (error) {
      console.error(`Error processing section ${sectionName}:`, error);
      await updateSectionJob(jobId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  } catch (error) {
    console.error('Error refreshing section:', error);
    return NextResponse.json(
      { error: 'Failed to refresh section', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
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
