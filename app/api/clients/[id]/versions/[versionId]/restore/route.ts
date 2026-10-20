import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { saveDossierVersion, mergeWithEditedFields } from '@/lib/section-runner';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const db = getDb();

    // Get the version to restore
    let version: any = null;
    if (isUsingSupabase()) {
      const { data } = await db
        .from('dossier_versions')
        .select('*')
        .eq('id', versionId)
        .eq('client_id', id)
        .single();
      version = data;
    } else {
      version = db
        .prepare('SELECT * FROM dossier_versions WHERE id = ? AND client_id = ?')
        .get(versionId, id);
    }

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Get current client data
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

    // Parse current dossier and edited fields
    let currentDossier: any = client.dossier;
    if (typeof currentDossier === 'string') {
      try { currentDossier = JSON.parse(currentDossier); } catch { currentDossier = {}; }
    }

    let editedFields: string[] = client.edited_fields;
    if (typeof editedFields === 'string') {
      try { editedFields = JSON.parse(editedFields); } catch { editedFields = []; }
    }
    editedFields = editedFields || [];

    // Save current state before restoring
    await saveDossierVersion(
      parseInt(id),
      currentDossier,
      undefined,
      `Restore from version ${versionId}`
    );

    // Parse version snapshot
    let versionSnapshot: any = version.dossier_snapshot;
    if (typeof versionSnapshot === 'string') {
      try { versionSnapshot = JSON.parse(versionSnapshot); } catch { versionSnapshot = {}; }
    }

    // Merge with edited fields preserved
    const restoredDossier = mergeWithEditedFields(
      versionSnapshot,
      currentDossier,
      editedFields
    );

    // Update database
    if (isUsingSupabase()) {
      await db.from('clients').update({ dossier: restoredDossier }).eq('id', id);
    } else {
      db.prepare('UPDATE clients SET dossier = ? WHERE id = ?')
        .run(JSON.stringify(restoredDossier), id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Failed to restore version', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
