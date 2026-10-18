import Link from 'next/link';
import MainLayout from '@/app/components/MainLayout';
import { getDb, isUsingSupabase } from '@/lib/db';
import { nl, hostOf } from '@/lib/format';
import { ChevronRight, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProspectsPage() {
  const db = getDb();
  let rows: any[] = [];
  try {
    if (isUsingSupabase()) {
      const { data } = await db.from('clients').select('id, naam, website_url, plaats, sector, created_at').order('created_at', { ascending: false }).limit(200);
      rows = data || [];
    } else {
      rows = db.prepare('SELECT id, naam, sector, created_at FROM clients ORDER BY created_at DESC').all();
    }
  } catch (e) {
    console.error('Prospects list error:', e);
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between rounded-2xl bg-emerald-950/85 border border-emerald-600/40 p-5">
          <h1 className="text-2xl font-bold text-white">Eerdere prospects</h1>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400 text-emerald-950 font-semibold hover:bg-emerald-300"><Plus className="w-4 h-4" /> Nieuwe prospect</Link>
        </div>
        <ul className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 divide-y divide-emerald-800/70 overflow-hidden">
          {rows.length === 0 && <li className="p-5 text-emerald-100">Nog geen prospects onderzocht.</li>}
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/prospect/${r.id}`} className="flex items-center gap-4 p-4 hover:bg-emerald-900/60">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{nl(r.naam)}</p>
                  <p className="text-sm text-emerald-100/80 truncate">
                    {r.website_url ? hostOf(r.website_url) : 'website onbekend'} · {nl(r.plaats)} · {nl(r.sector)}
                  </p>
                </div>
                <span className="text-xs text-emerald-200/80 tabular-nums">{r.created_at ? new Date(r.created_at).toLocaleDateString('nl-NL', { timeZone: 'Europe/Amsterdam' }) : ''}</span>
                <ChevronRight className="w-5 h-5 text-emerald-300" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MainLayout>
  );
}
