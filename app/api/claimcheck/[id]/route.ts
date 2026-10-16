import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const checks = db.prepare(`
      SELECT * FROM claim_checks 
      WHERE client_id = ? 
      ORDER BY created_at DESC
    `).all(id);
    
    return NextResponse.json(checks);
  } catch (error) {
    console.error('Error fetching claim checks:', error);
    return NextResponse.json({ error: 'Failed to fetch claim checks' }, { status: 500 });
  }
}
