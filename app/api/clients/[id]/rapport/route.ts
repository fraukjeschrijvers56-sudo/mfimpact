import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { generateWordReport, generatePowerPointReport, generatePDFReport } from '@/lib/rapport-generator';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'docx';

    if (!['docx', 'pptx', 'pdf'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use docx, pptx, or pdf' }, { status: 400 });
    }

    const db = getDb();
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
      try {
        dossier = JSON.parse(dossier);
      } catch {
        dossier = {};
      }
    }
    dossier = dossier && typeof dossier === 'object' ? dossier : {};

    let buffer: Buffer;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'docx':
        buffer = await generateWordReport(client, dossier);
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        filename = `rapport-${client.naam || 'prospect'}-${Date.now()}.docx`;
        break;
      case 'pptx':
        buffer = await generatePowerPointReport(client, dossier);
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
        filename = `rapport-${client.naam || 'prospect'}-${Date.now()}.pptx`;
        break;
      case 'pdf':
        buffer = await generatePDFReport(client, dossier);
        contentType = 'application/pdf';
        filename = `rapport-${client.naam || 'prospect'}-${Date.now()}.pdf`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
