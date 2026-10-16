import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const answers = db.prepare('SELECT * FROM scan_answers WHERE client_id = ?').all(id);
    return NextResponse.json(answers);
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving scan answers:', error);
    return NextResponse.json({ error: 'Failed to save scan answers' }, { status: 500 });
  }
}
