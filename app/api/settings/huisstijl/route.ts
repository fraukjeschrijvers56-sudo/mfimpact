import { NextRequest, NextResponse } from 'next/server';
import { isUsingSupabase, getDb } from '@/lib/db';
import { DEFAULT_SETTINGS, type HuisstijlSettings } from '@/lib/huisstijl';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/huisstijl
 * Returns current huisstijl settings or defaults
 */
export async function GET() {
  try {
    const db = getDb();

    if (isUsingSupabase()) {
      const { data, error } = await db
        .from('settings')
        .select('*')
        .eq('key', 'huisstijl')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.value) {
        // Supabase returns JSONB as object, no parsing needed
        const settings = data.value;
        return NextResponse.json({ ...DEFAULT_SETTINGS, ...settings });
      }
    } else {
      // SQLite
      const row: any = db.prepare('SELECT value FROM settings WHERE key = ?').get('huisstijl');
      if (row?.value) {
        const settings = JSON.parse(row.value);
        return NextResponse.json({ ...DEFAULT_SETTINGS, ...settings });
      }
    }

    return NextResponse.json(DEFAULT_SETTINGS);
  } catch (error) {
    console.error('GET /api/settings/huisstijl error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Laden mislukt' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/settings/huisstijl
 * Save huisstijl settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    const colorKeys: (keyof HuisstijlSettings)[] = [
      'primary_color',
      'secondary_color',
      'heading_color',
      'table_shade',
      'status_red',
      'status_amber',
      'status_green',
    ];

    for (const key of colorKeys) {
      const value = body[key];
      if (value != null && value !== '' && !hexRegex.test(value)) {
        return NextResponse.json(
          { error: `Ongeldige kleurwaarde voor ${key} (gebruik hex formaat #RRGGBB)` },
          { status: 400 }
        );
      }
    }

    const font = body.font || DEFAULT_SETTINGS.font;
    const allowedFonts = ['Aptos', 'Calibri', 'Inter', 'Arial'];
    if (!allowedFonts.includes(font)) {
      return NextResponse.json(
        { error: 'Ongeldige font (kies uit: Aptos, Calibri, Inter, Arial)' },
        { status: 400 }
      );
    }

    const settings: HuisstijlSettings = {
      ...DEFAULT_SETTINGS,
      ...body,
      font,
    };
    const db = getDb();

    if (isUsingSupabase()) {
      // Upsert with JSONB value (Supabase auto-handles JSONB conversion)
      const { error } = await db
        .from('settings')
        .upsert({
          key: 'huisstijl',
          value: settings, // Will be stored as JSONB
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
    } else {
      // SQLite
      db.prepare(
        `INSERT INTO settings (key, value, updated_at) 
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      ).run('huisstijl', JSON.stringify(settings));
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('POST /api/settings/huisstijl error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Opslaan mislukt' },
      { status: 500 }
    );
  }
}
