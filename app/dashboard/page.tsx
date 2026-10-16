import MainLayout from '../components/MainLayout';
import GlassWindow from '../components/GlassWindow';
import Link from 'next/link';
import { getDb, isUsingSupabase } from '@/lib/db';
import { seedData } from '@/lib/seed';
import { Users, Search, AlertTriangle, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  try {
    const db = getDb();
    let stats: {
      totalClients: number;
      activeScans: number;
      openGaps: number;
      legislationItems: number;
    };
    let recentClients: any[];
    
    if (isUsingSupabase()) {
      // Supabase async queries
      const [clientsResult, scansResult, gapsResult, legislationResult, recentResult] = await Promise.all([
        db.from('clients').select('id', { count: 'exact', head: true }),
        db.from('scan_answers').select('client_id', { count: 'exact', head: true }),
        db.from('gap_items').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        db.from('legislation').select('id', { count: 'exact', head: true }),
        db.from('clients').select('id, naam, sector, updated_at').order('updated_at', { ascending: false }).limit(5)
      ]);
      
      stats = {
        totalClients: clientsResult.count || 0,
        activeScans: scansResult.count || 0,
        openGaps: gapsResult.count || 0,
        legislationItems: legislationResult.count || 0,
      };
      recentClients = recentResult.data || [];
      
    } else {
      // SQLite sync queries
      const clientCount = db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number };
      
      if (clientCount.count === 0) {
        seedData();
      }

      stats = {
        totalClients: clientCount.count,
        activeScans: (db.prepare('SELECT COUNT(DISTINCT client_id) as count FROM scan_answers').get() as { count: number }).count,
        openGaps: (db.prepare('SELECT COUNT(*) as count FROM gap_items WHERE status = ?').get('open') as { count: number }).count,
        legislationItems: (db.prepare('SELECT COUNT(*) as count FROM legislation').get() as { count: number }).count,
      };

      recentClients = db.prepare(`
        SELECT id, naam, sector, updated_at 
        FROM clients 
        ORDER BY updated_at DESC 
        LIMIT 5
      `).all();
    }

    return (
      <MainLayout>
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-white">Dashboard</h1>
            <p className="text-teal-200 text-lg">Overzicht van de MVO-bewijs werkbank</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassWindow>
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-teal-500/20 border border-teal-400/30">
                  <Users className="w-6 h-6 text-teal-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-teal-200">Totaal klanten</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalClients}</p>
                </div>
              </div>
            </GlassWindow>

            <GlassWindow>
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                  <Search className="w-6 h-6 text-emerald-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-200">Actieve scans</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.activeScans}</p>
                </div>
              </div>
            </GlassWindow>

            <GlassWindow>
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/30">
                  <AlertTriangle className="w-6 h-6 text-amber-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-200">Open gaps</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.openGaps}</p>
                </div>
              </div>
            </GlassWindow>

            <GlassWindow>
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-400/30">
                  <BookOpen className="w-6 h-6 text-blue-200" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-200">Wetgeving items</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.legislationItems}</p>
                </div>
              </div>
            </GlassWindow>
          </div>

          {/* Recent Clients */}
          <GlassWindow title="Recente klanten" dragEnabled={true}>
            <div className="space-y-3">
              {recentClients.map((client: any) => (
                <Link
                  key={client.id}
                  href={`/klanten/${client.id}`}
                  className="block p-4 rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white group-hover:text-teal-200 transition-colors">{client.naam}</p>
                      <p className="text-sm text-teal-200/70">{client.sector || 'Geen sector'}</p>
                    </div>
                    <div className="text-sm text-teal-200/50">
                      {new Date(client.updated_at).toLocaleDateString('nl-NL')}
                    </div>
                  </div>
                </Link>
              ))}
              {recentClients.length === 0 && (
                <div className="text-center py-8 text-teal-200/50">
                  Nog geen klanten
                </div>
              )}
            </div>
          </GlassWindow>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/klanten">
              <GlassWindow>
                <div className="flex items-center space-x-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-400/30">
                    <Users className="w-8 h-8 text-teal-200" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Klantbeheer</h3>
                    <p className="text-teal-200/70 text-sm mt-1">Beheer klantdossiers en bewijs</p>
                  </div>
                </div>
              </GlassWindow>
            </Link>

            <Link href="/scan">
              <GlassWindow>
                <div className="flex items-center space-x-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30">
                    <Search className="w-8 h-8 text-emerald-200" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Scan & gatanalyse</h3>
                    <p className="text-emerald-200/70 text-sm mt-1">Start een nieuwe scan</p>
                  </div>
                </div>
              </GlassWindow>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return (
      <MainLayout>
        <GlassWindow title="Error">
          <div className="text-rose-200">
            Error loading dashboard. Check console for details.
          </div>
        </GlassWindow>
      </MainLayout>
    );
  }
}
