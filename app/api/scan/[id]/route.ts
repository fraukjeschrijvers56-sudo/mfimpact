import { NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    
    if (isUsingSupabase()) {
      const { data, error } = await db
        .from('scan_answers')
        .select('*')
        .eq('client_id', id);
      if (error) throw error;
      return NextResponse.json(data || []);
    } else {
      const answers = db.prepare('SELECT * FROM scan_answers WHERE client_id = ?').all(id);
      return NextResponse.json(answers);
    }
  } catch (error) {
    console.error('Error fetching scan answers:', error);
    return NextResponse.json({ error: 'Failed to fetch scan answers' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { answers } = await request.json();
    const db = getDb();

    if (isUsingSupabase()) {
      // Upsert answers
      const answersData = answers
        .filter((a: any) => a.answer)
        .map((a: any) => ({
          client_id: parseInt(id),
          category: a.category,
          question_key: a.question_key,
          answer: a.answer,
        }));
      
      if (answersData.length > 0) {
        const { error } = await db.from('scan_answers').upsert(answersData, {
          onConflict: 'client_id,category,question_key'
        });
        if (error) throw error;
      }
      
      // Update status
      const { error: statusError } = await db
        .from('client_status')
        .update({ 
          status: 'voltooid', 
          notitie: `Scan voltooid op ${new Date().toISOString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('client_id', id)
        .eq('stap', 'scan');
      if (statusError) throw statusError;
      
    } else {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO scan_answers (client_id, category, question_key, answer)
        VALUES (?, ?, ?, ?)
      `);

      for (const answer of answers) {
        if (answer.answer) {
          stmt.run(id, answer.category, answer.question_key, answer.answer);
        }
      }

      // Update client status
      db.prepare(`
        UPDATE client_status 
        SET status = 'voltooid', notitie = 'Scan voltooid op ' || datetime('now'), updated_at = datetime('now')
        WHERE client_id = ? AND stap = 'scan'
      `).run(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving scan answers:', error);
    return NextResponse.json({ error: 'Failed to save scan answers' }, { status: 500 });
  }
}
