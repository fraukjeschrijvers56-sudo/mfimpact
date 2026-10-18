import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { checkAuth } from '@/lib/auth-middleware';
import { checkMvoRegister } from '@/lib/mvo-register';
import { normalizeDossier } from '@/lib/field-normalizer';
import { extractDisplayValue } from '@/lib/field-normalizer';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const { id } = await params;
  const db = getDb();

  try {
    // Get client data
    let client: any;
    if (isUsingSupabase()) {
      const { data, error } = await db.from('clients').select('*').eq('id', id).single();
      if (error) throw error;
      client = data;
    } else {
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      if (!client) {
        return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 });
      }
    }

    // Extract company name and KvK
    const naam = String(extractDisplayValue(client.naam) || '');
    const kvk = String(extractDisplayValue(client.kvk) || '');

    if (!naam) {
      return NextResponse.json(
        { error: 'Bedrijfsnaam ontbreekt' },
        { status: 400 }
      );
    }

    // Perform MVO-register check
    const mvoCheck = await checkMvoRegister(naam, kvk);

    // Update dossier
    if (isUsingSupabase()) {
      const { data: existing } = await db
        .from('clients')
        .select('dossier')
        .eq('id', id)
        .single();

      const currentDossier = existing?.dossier || {};
      const updatedDossier = normalizeDossier({
        ...currentDossier,
        mvo_register: mvoCheck,
      });

      const { error } = await db
        .from('clients')
        .update({ dossier: updatedDossier, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } else {
      // SQLite doesn't have JSONB support in this app - skip
      console.warn('MVO-register check not stored (SQLite mode)');
    }

    return NextResponse.json({ success: true, mvoCheck });
  } catch (error) {
    console.error('MVO-register check error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server fout' },
      { status: 500 }
    );
  }
}
