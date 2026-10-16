import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const db = getDb();
    
    const stmt = db.prepare(`
      INSERT INTO clients (naam, kvk, sector, aantal_medewerkers, omzet, balanstotaal, afnemers, banken, tenders)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.naam,
      data.kvk || null,
      data.sector || null,
      data.aantal_medewerkers ? parseInt(data.aantal_medewerkers) : null,
      data.omzet ? parseFloat(data.omzet) : null,
      data.balanstotaal ? parseFloat(data.balanstotaal) : null,
      data.afnemers || null,
      data.banken || null,
      data.tenders || null
    );

    // Initialize status for all steps
    const statusStmt = db.prepare(`
      INSERT INTO client_status (client_id, stap, status)
      VALUES (?, ?, ?)
    `);

    const clientId = result.lastInsertRowid;
    const steps = ['scan', 'gatanalyse', 'bewijspakket', 'claimcheck', 'jaarlijkse-update'];
    for (const step of steps) {
      statusStmt.run(clientId, step, 'nog-niet-gestart');
    }

    return NextResponse.json({ id: clientId, success: true });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
