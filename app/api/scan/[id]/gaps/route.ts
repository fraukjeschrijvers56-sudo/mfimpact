import { NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const usingSupabase = isUsingSupabase();

    // Get scan answers
    let answers: any[];
    if (usingSupabase) {
      const { data, error } = await db
        .from('scan_answers')
        .select('*')
        .eq('client_id', id);
      if (error) throw error;
      answers = data || [];
    } else {
      answers = db.prepare('SELECT * FROM scan_answers WHERE client_id = ?').all(id) as any[];
    }
    
    const answerMap: Record<string, string> = {};
    answers.forEach(a => {
      answerMap[`${a.category}_${a.question_key}`] = a.answer;
    });

    // Delete existing gaps for this client
    if (usingSupabase) {
      await db.from('gap_items').delete().eq('client_id', id);
    } else {
      db.prepare('DELETE FROM gap_items WHERE client_id = ?').run(id);
    }

    // Generate gaps based on answers
    const gaps: Array<{ title: string; priority: string; evidence: string }> = [];

    // Check CO2 Scope 3
    if (answerMap['operationeel_co2_scope3'] !== 'ja') {
      gaps.push({
        title: 'CO₂ Scope 3 berekening ontbreekt of is incompleet',
        priority: 'hoog',
        evidence: 'Volledige Scope 3 screening volgens GHG Protocol; leveranciersdata opvragen voor belangrijkste categorieën'
      });
    }

    // Check supplier code of conduct
    if (answerMap['operationeel_leveranciers_gedragscode'] !== 'ja') {
      gaps.push({
        title: 'Leveranciersgedragscode ontbreekt',
        priority: 'middel',
        evidence: 'Opstellen leveranciersgedragscode conform OESO-richtlijnen; publiceren op website; communiceren naar leveranciers'
      });
    }

    // Check supplier screening
    if (answerMap['operationeel_leveranciers_screening'] !== 'ja') {
      gaps.push({
        title: 'Leveranciersscreening wordt niet of onvoldoende uitgevoerd',
        priority: 'middel',
        evidence: 'Proces opzetten voor due diligence op leveranciers; risico-assessment per productgroep/land'
      });
    }

    // Check energy audit
    if (answerMap['operationeel_energie_audit'] !== 'ja') {
      gaps.push({
        title: 'Energie-audit ontbreekt',
        priority: 'hoog',
        evidence: 'Energie-audit laten uitvoeren conform EN 16247 (verplicht bij >50.000 kWh of >25.000 m³ gas)'
      });
    }

    // Check diversity data
    if (answerMap['operationeel_diversiteit_data'] !== 'ja') {
      gaps.push({
        title: 'Diversiteitsgegevens (WPM) ontbreken',
        priority: 'laag',
        evidence: 'WPM-rapportage opstellen (verplicht bij >25 medewerkers); arbeidsmarktpositiegegevens verzamelen'
      });
    }

    // Check RI&E
    if (answerMap['operationeel_veiligheid_ri_e'] !== 'ja') {
      gaps.push({
        title: 'Actuele risico-inventarisatie & -evaluatie (RI&E) ontbreekt',
        priority: 'hoog',
        evidence: 'RI&E opstellen of actualiseren; actieplan formuleren; jaarlijks herzien'
      });
    }

    // Check integrity code
    if (answerMap['operationeel_governance_integriteit'] !== 'ja') {
      gaps.push({
        title: 'Integriteitscode of klokkenluiderregeling ontbreekt',
        priority: 'middel',
        evidence: 'Integriteitscode opstellen; klokkenluiderregeling implementeren; publiceren intern en extern'
      });
    }

    // Check waste management
    if (answerMap['operationeel_afval_scheiding'] !== 'ja') {
      gaps.push({
        title: 'Afvalscheiding en -registratie niet op orde',
        priority: 'laag',
        evidence: 'Afvalscheidingsplan implementeren; afvalstromen registreren; recyclingpercentages monitoren'
      });
    }

    // Market demand gaps
    if (answerMap['marktvraag_vsme_gevraagd'] === 'ja' && answerMap['operationeel_co2_scope1_2'] !== 'ja') {
      gaps.push({
        title: 'VSME wordt gevraagd maar CO₂-data zijn onvoldoende',
        priority: 'hoog',
        evidence: 'VSME vereist minimaal Scope 1+2 CO₂-berekening; GHG Protocol toepassen'
      });
    }

    if (answerMap['marktvraag_co2_prestatieladder_gevraagd'] === 'ja') {
      gaps.push({
        title: 'CO₂-Prestatieladder certificering vereist voor aanbestedingen',
        priority: 'hoog',
        evidence: 'CO₂-Prestatieladder traject starten; niveau 3 is gebruikelijk voor MKB; footprint + reductiedoelen nodig'
      });
    }

    if (answerMap['marktvraag_iso14001_gevraagd'] === 'ja') {
      gaps.push({
        title: 'ISO 14001 certificering wordt gevraagd',
        priority: 'hoog',
        evidence: 'ISO 14001 traject starten; milieumanagementsysteem implementeren; externe audit inplannen'
      });
    }

    // Insert all gaps
    if (usingSupabase) {
      if (gaps.length > 0) {
        const gapsData = gaps.map(gap => ({
          client_id: parseInt(id),
          gap_title: gap.title,
          priority: gap.priority,
          suggested_evidence: gap.evidence,
          status: 'open'
        }));
        const { error } = await db.from('gap_items').insert(gapsData);
        if (error) throw error;
      }
      
      // Update status
      const { error: statusError } = await db
        .from('client_status')
        .update({ 
          status: 'voltooid', 
          notitie: `Gatanalyse voltooid op ${new Date().toISOString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', id)
        .eq('stap', 'gatanalyse');
      if (statusError) throw statusError;
      
    } else {
      const insertGap = db.prepare(`
        INSERT INTO gap_items (client_id, gap_title, priority, suggested_evidence, status)
        VALUES (?, ?, ?, ?, 'open')
      `);
      
      for (const gap of gaps) {
        insertGap.run(id, gap.title, gap.priority, gap.evidence);
      }

      // Update status to in-behandeling
      db.prepare(`
        UPDATE client_status 
        SET status = 'voltooid', notitie = 'Gatanalyse voltooid op ' || datetime('now'), updated_at = datetime('now')
        WHERE client_id = ? AND stap = 'gatanalyse'
      `).run(id);
    }

    return NextResponse.json({ success: true, gapsGenerated: gaps.length });
  } catch (error) {
    console.error('Error generating gaps:', error);
    return NextResponse.json({ error: 'Failed to generate gaps' }, { status: 500 });
  }
}
