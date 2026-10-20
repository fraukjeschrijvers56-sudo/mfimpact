import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    let versions: any[] = [];

    if (isUsingSupabase()) {
      const { data } = await db
        .from('dossier_versions')
        .select('id, version_timestamp, section_name, change_reason, created_at')
        .eq('client_id', id)
        .order('version_timestamp', { ascending: false })
        .limit(20);
      
      versions = data || [];
    } else {
      versions = db
        .prepare('SELECT id, version_timestamp, section_name, change_reason, created_at FROM dossier_versions WHERE client_id = ? ORDER BY version_timestamp DESC LIMIT 20')
        .all(id);
    }

    return NextResponse.json({ versions });
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch versions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
