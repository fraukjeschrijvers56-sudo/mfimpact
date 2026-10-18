import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { checkAuth } from '@/lib/auth-middleware';
import { normalizeDossier } from '@/lib/field-normalizer';

// GET single client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const db = getDb();

  try {
    if (isUsingSupabase()) {
      const { data, error } = await db.from('clients').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (!client) {
        return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
      }
      return NextResponse.json(client);
    }
  } catch (error) {
    console.error('GET client error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server fout' },
      { status: 500 }
    );
  }
}

// PATCH update client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  try {
    if (isUsingSupabase()) {
      // Mark dossier as manually edited if dossier field is being updated
      const updateData: any = { ...body, updated_at: new Date().toISOString() };
      
      if (body.dossier) {
        // Merge and normalize the dossier (parse JSON strings, ensure consistent structure)
        const existing = await db.from('clients').select('dossier').eq('id', id).single();
        const currentDossier = existing.data?.dossier || {};
        const mergedDossier = {
          ...currentDossier,
          ...body.dossier,
          _handmatig_aangepast: true,
        };
        updateData.dossier = normalizeDossier(mergedDossier);
      }

      const { data, error } = await db
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // SQLite update
      const fields = Object.keys(body).filter(k => k !== 'id');
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = fields.map(f => body[f]);
      
      db.prepare(`UPDATE clients SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(...values, id);
      
      const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error('PATCH client error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server fout' },
      { status: 500 }
    );
  }
}

// DELETE client (with cascade)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const db = getDb();

  try {
    if (isUsingSupabase()) {
      // Delete related records first (if tables exist)
      const relatedTables = [
        'scan_answers',
        'gap_items',
        'evidence_items',
        'client_status',
        'claim_checks',
      ];

      for (const table of relatedTables) {
        try {
          await db.from(table).delete().eq('client_id', id);
        } catch (e) {
          // Table might not exist, continue
          console.warn(`Could not delete from ${table}:`, e);
        }
      }

      // Delete the client
      const { error } = await db.from('clients').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ success: true });
    } else {
      // SQLite cascade delete
      const relatedTables = [
        'scan_answers',
        'gap_items',
        'evidence_items',
        'client_status',
      ];

      for (const table of relatedTables) {
        try {
          db.prepare(`DELETE FROM ${table} WHERE client_id = ?`).run(id);
        } catch (e) {
          // Table might not exist, continue
          console.warn(`Could not delete from ${table}:`, e);
        }
      }

      db.prepare('DELETE FROM clients WHERE id = ?').run(id);
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('DELETE client error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server fout' },
      { status: 500 }
    );
  }
}
