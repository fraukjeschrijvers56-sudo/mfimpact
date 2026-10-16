import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const allLegislation = db.prepare('SELECT * FROM legislation').all() as any[];
    
    const direct: any[] = [];
    const indirect: any[] = [];

    for (const item of allLegislation) {
      let isDirect = false;
      let reason = '';

      // CSRD check
      if (item.naam.includes('CSRD')) {
        if (client.aantal_medewerkers > 250 || 
            client.omzet > 50000000 || 
            client.balanstotaal > 25000000) {
          isDirect = true;
          reason = 'Bedrijf valt boven CSRD-drempels (>250 medewerkers OF omzet >€50M OF balanstotaal >€25M)';
        }
      }

      // CSDDD check
      if (item.naam.includes('CSDDD')) {
        if (client.aantal_medewerkers > 1000 && client.omzet > 450000000) {
          isDirect = true;
          reason = 'Bedrijf valt onder CSDDD (>1000 medewerkers EN omzet >€450M)';
        }
      }

      // NL Energiebesparingsplicht (simplified check - would need energy data)
      if (item.naam.includes('Energiebesparingsplicht') || item.naam.includes('energie-audit')) {
        if (client.aantal_medewerkers && client.aantal_medewerkers > 10) {
          isDirect = true;
          reason = 'Mogelijk van toepassing (drempel: energieverbruik >50.000 kWh of >25.000 m³ gas/jaar - controleer energiedata)';
        }
      }

      // WPM check
      if (item.naam.includes('WPM')) {
        if (client.aantal_medewerkers && client.aantal_medewerkers > 25) {
          isDirect = true;
          reason = 'Bedrijf heeft meer dan 25 werknemers - WPM rapportageplicht van toepassing';
        }
      }

      if (isDirect) {
        direct.push({ ...item, reason });
      } else if (item.doorwerking && item.doorwerking.length > 10) {
        // Items with indirect application through the chain
        indirect.push(item);
      }
    }

    return NextResponse.json({
      client: {
        naam: client.naam,
        aantal_medewerkers: client.aantal_medewerkers,
        omzet: client.omzet,
        balanstotaal: client.balanstotaal,
      },
      direct,
      indirect,
    });
  } catch (error) {
    console.error('Error performing threshold check:', error);
    return NextResponse.json({ error: 'Failed to perform threshold check' }, { status: 500 });
  }
}
