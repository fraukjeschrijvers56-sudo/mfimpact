import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();
    const legislation = db.prepare('SELECT * FROM legislation ORDER BY niveau, naam').all();
    return NextResponse.json(legislation);
  } catch (error) {
    console.error('Error fetching legislation:', error);
    return NextResponse.json({ error: 'Failed to fetch legislation' }, { status: 500 });
  }
}
