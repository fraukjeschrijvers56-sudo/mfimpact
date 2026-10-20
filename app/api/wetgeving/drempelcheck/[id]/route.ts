import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { assessLegislation } from '@/lib/legislation-status';

function parseDossier(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const assessment = assessLegislation(client, parseDossier(client.dossier));

    return NextResponse.json({
      client: {
        naam: client.naam,
        aantal_medewerkers: client.aantal_medewerkers,
        omzet: client.omzet,
        balanstotaal: client.balanstotaal,
      },
      summary: assessment.summary,
      disclaimer: assessment.disclaimer,
      referenceDate: assessment.referenceDate,
      items: assessment.items,
      direct: assessment.items.filter((item) => item.status === 'van_toepassing'),
      indirect: assessment.items.filter((item) => item.status === 'indirect_via_keten'),
    });
  } catch (error) {
    console.error('Error performing threshold check:', error);
    return NextResponse.json({ error: 'Failed to perform threshold check' }, { status: 500 });
  }
}
