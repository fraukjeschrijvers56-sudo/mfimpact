import { notFound } from 'next/navigation';
import { getDb, isUsingSupabase } from '@/lib/db';
import { ProspectView } from './view';

export const dynamic = 'force-dynamic';

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  let client: any = null;
  if (isUsingSupabase()) {
    const { data } = await db.from('clients').select('*').eq('id', id).single();
    client = data;
  } else {
    client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  }
  if (!client) notFound();
  return <ProspectView client={client} />;
}
