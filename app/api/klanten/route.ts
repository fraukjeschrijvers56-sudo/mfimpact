import { NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const db = getDb();
    
    if (isUsingSupabase()) {
      // Supabase async operations
      const clientData = {
        naam: data.naam,
        kvk: data.kvk || null,
        sector: data.sector || null,
        aantal_medewerkers: data.aantal_medewerkers ? parseInt(data.aantal_medewerkers) : null,
        omzet: data.omzet ? parseFloat(data.omzet) : null,
        balanstotaal: data.balanstotaal ? parseFloat(data.balanstotaal) : null,
        afnemers: data.afnemers || null,
        banken: data.banken || null,
        tenders: data.tenders || null,
      };
      
      const { data: client, error: clientError } = await db
        .from('clients')
        .insert(clientData)
        .select('id')
        .single();
      
      if (clientError) throw clientError;
      const clientId = client.id;
      
      // Initialize status for all steps
      const steps = ['scan', 'gatanalyse', 'bewijspakket', 'claimcheck', 'jaarlijkse-update'];
      const statusData = steps.map(step => ({
        client_id: clientId,
        stap: step,
        status: 'nog-niet-gestart'
      }));
      
      const { error: statusError } = await db.from('client_status').insert(statusData);
      if (statusError) console.error('Status insert error:', statusError);
      
      return NextResponse.json({ id: clientId, success: true });
      
    } else {
      // SQLite/in-memory sync operations
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
    }
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const db = getDb();
    
    if (!data.id) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
    }
    
    if (isUsingSupabase()) {
      const { error } = await db
        .from('clients')
        .update({
          naam: data.naam,
          kvk: data.kvk || null,
          sector: data.sector || null,
          aantal_medewerkers: typeof data.aantal_medewerkers === 'number' ? data.aantal_medewerkers : null,
          omzet: typeof data.omzet === 'number' ? data.omzet : null,
          balanstotaal: typeof data.balanstotaal === 'number' ? data.balanstotaal : null,
          afnemers: data.afnemers || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
      if (error) throw error;
      
    } else {
      const stmt = db.prepare(`
        UPDATE clients 
        SET naam = ?, kvk = ?, sector = ?, aantal_medewerkers = ?, omzet = ?, balanstotaal = ?, afnemers = ?
        WHERE id = ?
      `);
      
      stmt.run(
        data.naam,
        data.kvk || null,
        data.sector || null,
        typeof data.aantal_medewerkers === 'number' ? data.aantal_medewerkers : null,
        typeof data.omzet === 'number' ? data.omzet : null,
        typeof data.balanstotaal === 'number' ? data.balanstotaal : null,
        data.afnemers || null,
        data.id
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
