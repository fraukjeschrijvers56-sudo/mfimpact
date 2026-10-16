import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const clientId = parseInt(params.id);
    const format = request.nextUrl.searchParams.get('format') || 'xlsx';
    
    const db = getDb();
    
    let client: any;
    let scanAnswers: any[];
    let gaps: any[];
    let claims: any[];
    
    if (isUsingSupabase()) {
      // Supabase async queries
      const { data: clientData, error: clientError } = await db
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();
      if (clientError || !clientData) {
        return NextResponse.json({ error: 'Client niet gevonden' }, { status: 404 });
      }
      client = clientData;
      
      const { data: scanData } = await db.from('scan_answers').select('*').eq('client_id', clientId);
      scanAnswers = scanData || [];
      
      const { data: gapsData } = await db.from('gap_items').select('*').eq('client_id', clientId);
      gaps = gapsData || [];
      
      const { data: claimsData } = await db.from('claimcheck').select('*').eq('client_id', clientId);
      claims = claimsData || [];
      
    } else {
      // SQLite/in-memory sync queries
      client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as any;
      if (!client) {
        return NextResponse.json({ error: 'Client niet gevonden' }, { status: 404 });
      }
      
      scanAnswers = db.prepare('SELECT * FROM scan_answers WHERE client_id = ?').all(clientId) as any[];
      gaps = db.prepare('SELECT * FROM gap_items WHERE client_id = ?').all(clientId) as any[];
      claims = db.prepare('SELECT * FROM claimcheck WHERE client_id = ?').all(clientId) as any[];
    }
    
    // Prepare data sheets
    const clientSheet = [
      ['MVO-bewijs Werkbank - Export'],
      ['Datum:', new Date().toLocaleDateString('nl-NL')],
      [],
      ['Bedrijfsgegevens'],
      ['Naam', client.naam],
      ['KvK', client.kvk || 'Niet vermeld'],
      ['Sector', client.sector || 'Niet vermeld'],
      ['Aantal medewerkers', client.aantal_medewerkers || 'Onbekend'],
      ['Omzet (€)', client.omzet || 'Onbekend'],
      ['Balanstotaal (€)', client.balanstotaal || 'Onbekend'],
      ['Afnemers', client.afnemers || 'Niet vermeld'],
    ];
    
    const scanSheet = [
      ['MVO Scan Resultaten'],
      ['Categorie', 'Vraag', 'Antwoord', 'Laatst bijgewerkt'],
      ...scanAnswers.map(s => [
        s.category,
        s.question_key,
        s.answer,
        s.updated_at
      ])
    ];
    
    const gapsSheet = [
      ['Gaps en Verbeterpunten'],
      ['Titel', 'Prioriteit', 'Suggestie', 'Status', 'Aangemaakt'],
      ...gaps.map(g => [
        g.gap_title,
        g.priority,
        g.suggested_evidence,
        g.status,
        g.created_at
      ])
    ];
    
    const claimsSheet = [
      ['Claimcheck (ECGT + ACM)'],
      ['Claim', 'Resultaat', 'Risico', 'Suggestie', 'Datum'],
      ...claims.map(c => [
        c.claim_text,
        c.result,
        c.risks,
        c.suggestions,
        c.created_at
      ])
    ];
    
    if (format === 'csv') {
      // CSV export (only client data for simplicity)
      const csvContent = clientSheet.map(row => row.join(';')).join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="mvo-bewijs-${client.naam.replace(/[^a-z0-9]/gi, '_')}.csv"`,
        },
      });
    }
    
    // XLSX export (default)
    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(clientSheet),
      'Bedrijf'
    );
    
    if (scanAnswers.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(scanSheet),
        'Scan'
      );
    }
    
    if (gaps.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(gapsSheet),
        'Gaps'
      );
    }
    
    if (claims.length > 0) {
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(claimsSheet),
        'Claims'
      );
    }
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="mvo-bewijs-${client.naam.replace(/[^a-z0-9]/gi, '_')}.xlsx"`,
      },
    });
    
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export mislukt' }, { status: 500 });
  }
}
