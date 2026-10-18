import MainLayout from '../components/MainLayout';
import GlassWindow from '../components/GlassWindow';
import Link from 'next/link';
import { getDb, isUsingSupabase } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function KlantenPage() {
  const db = getDb();
  let clients: any[];
  
  if (isUsingSupabase()) {
    // Supabase async query with joined counts
    const { data } = await db
      .from('clients')
      .select(`
        *,
        evidence_items (count),
        gap_items (count)
      `)
      .order('updated_at', { ascending: false });
    
    // Transform Supabase result to match SQLite structure
    clients = (data || []).map((c: any) => ({
      ...c,
      evidence_count: c.evidence_items?.[0]?.count || 0,
      open_gaps: c.gap_items?.filter((g: any) => g.status === 'open').length || 0
    }));
    
  } else {
    // SQLite sync query
    clients = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM evidence_items WHERE client_id = c.id) as evidence_count,
        (SELECT COUNT(*) FROM gap_items WHERE client_id = c.id AND status = 'open') as open_gaps
      FROM clients c
      ORDER BY c.updated_at DESC
    `).all();
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header in glass card for readability */}
        <GlassWindow>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Klanten</h1>
              <p className="mt-2 text-white/70">Beheer klantdossiers en voortgang</p>
            </div>
            <Link
              href="/klanten/nieuw"
              className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 font-medium transition-colors"
            >
              + Nieuwe klant
            </Link>
          </div>
        </GlassWindow>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Naam
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  KvK
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sector
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medewerkers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bewijs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Open gaps
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client: any) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{client.naam}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.kvk || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.sector || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.aantal_medewerkers || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.evidence_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      client.open_gaps > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {client.open_gaps}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Link
                      href={`/klanten/${client.id}`}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Bekijken
                    </Link>
                  </td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Nog geen klanten. Maak een nieuwe klant aan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
