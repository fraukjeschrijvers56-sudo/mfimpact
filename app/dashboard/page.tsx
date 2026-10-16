import MainLayout from '../components/MainLayout';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { seedData } from '@/lib/seed';

export default function DashboardPage() {
  // Initialize database and seed if needed
  try {
    const db = getDb();
    const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
    
    if (clientCount.count === 0) {
      seedData();
    }

    const stats = {
      totalClients: clientCount.count,
      activeScans: db.prepare('SELECT COUNT(DISTINCT client_id) as count FROM scan_answers').get() as { count: number },
      openGaps: db.prepare('SELECT COUNT(*) as count FROM gap_items WHERE status = ?').get('open') as { count: number },
      legislationItems: db.prepare('SELECT COUNT(*) as count FROM legislation').get() as { count: number },
    };

    const recentClients = db.prepare(`
      SELECT id, naam, sector, updated_at 
      FROM clients 
      ORDER BY updated_at DESC 
      LIMIT 5
    `).all();

    return (
      <MainLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-2 text-gray-600">Overzicht van de MVO-bewijs werkbank</p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">👥</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Totaal klanten
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.totalClients}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Actieve scans
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.activeScans.count}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Open gaps
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.openGaps.count}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📋</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Wetgeving items
                      </dt>
                      <dd className="text-3xl font-semibold text-gray-900">
                        {stats.legislationItems.count}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recente klanten</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {recentClients.map((client: any) => (
                <Link
                  key={client.id}
                  href={`/klanten/${client.id}`}
                  className="block hover:bg-gray-50 px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">{client.naam}</p>
                      <p className="text-sm text-gray-500">{client.sector || 'Geen sector'}</p>
                    </div>
                    <div className="text-sm text-gray-400">
                      {new Date(client.updated_at).toLocaleDateString('nl-NL')}
                    </div>
                  </div>
                </Link>
              ))}
              {recentClients.length === 0 && (
                <div className="px-5 py-4 text-sm text-gray-500">
                  Nog geen klanten
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Link
              href="/klanten"
              className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 hover:bg-blue-100 transition"
            >
              <div className="flex items-center">
                <span className="text-4xl mr-4">👥</span>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">Klantbeheer</h3>
                  <p className="text-sm text-blue-700">Beheer klantdossiers en bewijs</p>
                </div>
              </div>
            </Link>

            <Link
              href="/scan"
              className="bg-green-50 border-2 border-green-200 rounded-lg p-6 hover:bg-green-100 transition"
            >
              <div className="flex items-center">
                <span className="text-4xl mr-4">🔍</span>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Scan & gatanalyse</h3>
                  <p className="text-sm text-green-700">Start een nieuwe scan</p>
                </div>
              </div>
            </Link>

            <Link
              href="/wetgeving"
              className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 hover:bg-purple-100 transition"
            >
              <div className="flex items-center">
                <span className="text-4xl mr-4">📋</span>
                <div>
                  <h3 className="text-lg font-semibold text-purple-900">Wetgeving</h3>
                  <p className="text-sm text-purple-700">Bekijk regelgeving en drempels</p>
                </div>
              </div>
            </Link>

            <Link
              href="/claimcheck"
              className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 hover:bg-orange-100 transition"
            >
              <div className="flex items-center">
                <span className="text-4xl mr-4">✓</span>
                <div>
                  <h3 className="text-lg font-semibold text-orange-900">Claimcheck</h3>
                  <p className="text-sm text-orange-700">Controleer groene claims</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return (
      <MainLayout>
        <div className="text-red-600">
          Error loading dashboard. Check console for details.
        </div>
      </MainLayout>
    );
  }
}
