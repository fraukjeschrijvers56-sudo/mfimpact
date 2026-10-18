import MainLayout from '@/app/components/MainLayout';
import { getDb, isUsingSupabase } from '@/lib/db';
import { ProspectsClient } from './page-client';

export const dynamic = 'force-dynamic';

export default async function ProspectsPage() {
  const db = getDb();
  let rows: any[] = [];
  try {
    if (isUsingSupabase()) {
      const { data } = await db.from('clients').select('id, naam, website_url, plaats, sector, created_at, dossier').order('created_at', { ascending: false }).limit(200);
      rows = data || [];
    } else {
      rows = db.prepare('SELECT id, naam, website_url, plaats, sector, created_at, dossier FROM clients ORDER BY created_at DESC').all();
    }
  } catch (e) {
    console.error('Prospects list error:', e);
  }

  return (
    <MainLayout>
      <ProspectsClient initialProspects={rows} />
    </MainLayout>
  );
}
