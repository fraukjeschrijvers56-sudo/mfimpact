import { NextRequest, NextResponse } from 'next/server';
import { isUsingSupabase, getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface HuisstijlSettings {
  primary_color: string;
  secondary_color: string;
  font: string;
}

const DEFAULT_SETTINGS: HuisstijlSettings = {
  primary_color: '#10b981', // emerald-500 from Tailwind
  secondary_color: '#3b82f6', // blue-500 from Tailwind
  font: 'Aptos',
};

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
        const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
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
    const { primary_color, secondary_color, font } = body;

    // Validate colors (hex format)
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(primary_color) || !hexRegex.test(secondary_color)) {
      return NextResponse.json(
        { error: 'Ongeldige kleurwaarde (gebruik hex formaat #RRGGBB)' },
        { status: 400 }
      );
    }

    // Validate font
    const allowedFonts = ['Aptos', 'Calibri', 'Inter', 'Arial'];
    if (!allowedFonts.includes(font)) {
      return NextResponse.json(
        { error: 'Ongeldige font (kies uit: Aptos, Calibri, Inter, Arial)' },
        { status: 400 }
      );
    }

    const settings: HuisstijlSettings = { primary_color, secondary_color, font };
    const db = getDb();

    if (isUsingSupabase()) {
      const { error } = await db
        .from('settings')
        .upsert({
          key: 'huisstijl',
          value: settings,
          updated_at: new Date().toISOString(),
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
