import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
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
    
    // Get client data
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientId) as any;
    if (!client) {
      return NextResponse.json({ error: 'Client niet gevonden' }, { status: 404 });
    }
    
    // Get scan answers
    const scanAnswers = db.prepare('SELECT * FROM scan_answers WHERE client_id = ?').all(clientId) as any[];
    
    // Get gaps
    const gaps = db.prepare('SELECT * FROM gap_items WHERE client_id = ?').all(clientId) as any[];
    
    // Get claims
    const claims = db.prepare('SELECT * FROM claimcheck WHERE client_id = ?').all(clientId) as any[];
    
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
