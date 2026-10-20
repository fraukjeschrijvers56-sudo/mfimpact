import { NextRequest, NextResponse } from 'next/server';
import { isUsingSupabase, getDb } from '@/lib/db';
import { generateWordReport, generatePowerPointReport } from '@/lib/report-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * GET /api/clients/[id]/rapport?format=docx|pptx|pdf
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const clientId = parseInt(id, 10);
    const format = request.nextUrl.searchParams.get('format') || 'docx';

    if (!['docx', 'pptx', 'pdf'].includes(format)) {
      return NextResponse.json({ error: 'Ongeldig formaat (kies: docx, pptx, pdf)' }, { status: 400 });
    }

    const db = getDb();

    // Get client and dossier
    let client: any;
    if (isUsingSupabase()) {
      const { data, error } = await db.from('clients').select('*').eq('id', clientId).single();
      if (error) throw error;
      client = data;
    } else {
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId);
    }

    if (!client) {
      return NextResponse.json({ error: 'Prospect niet gevonden' }, { status: 404 });
    }

    // Parse dossier
    let dossier = client.dossier;
    if (typeof dossier === 'string') {
      try {
        dossier = JSON.parse(dossier);
      } catch {
        dossier = {};
      }
    }

    // Get huisstijl settings
    let huisstijl = {
      primary_color: '#10b981',
      secondary_color: '#3b82f6',
      font: 'Aptos',
    };

    if (isUsingSupabase()) {
      const { data } = await db.from('settings').select('*').eq('key', 'huisstijl').single();
      if (data?.value) {
        const settings = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        huisstijl = { ...huisstijl, ...settings };
      }
    } else {
      const row: any = db.prepare('SELECT value FROM settings WHERE key = ?').get('huisstijl');
      if (row?.value) {
        const settings = JSON.parse(row.value);
        huisstijl = { ...huisstijl, ...settings };
      }
    }

    // Generate report
    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'docx') {
      buffer = await generateWordReport({ client, dossier, huisstijl });
      filename = `MVO-dossier-${client.naam?.replace(/[^a-z0-9]/gi, '-') || 'prospect'}-${Date.now()}.docx`;
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (format === 'pptx') {
      buffer = await generatePowerPointReport({ client, dossier, huisstijl });
      filename = `MVO-dossier-${client.naam?.replace(/[^a-z0-9]/gi, '-') || 'prospect'}-${Date.now()}.pptx`;
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
      return NextResponse.json({ error: 'PDF export nog niet geïmplementeerd' }, { status: 501 });
    }

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rapport genereren mislukt' },
      { status: 500 }
    );
  }
}
