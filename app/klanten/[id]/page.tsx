import MainLayout from '@/app/components/MainLayout';
import Link from 'next/link';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';

export default async function KlantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  
  if (!client) {
    notFound();
  }

  const statuses = db.prepare('SELECT * FROM client_status WHERE client_id = ? ORDER BY id').all(id);
  const evidence = db.prepare('SELECT * FROM evidence_items WHERE client_id = ? ORDER BY datum DESC').all(id);
  const gaps = db.prepare('SELECT * FROM gap_items WHERE client_id = ? ORDER BY created_at DESC').all(id);

  const statusMap: Record<string, any> = {};
  statuses.forEach((s: any) => {
    statusMap[s.stap] = s;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'voltooid': 'bg-green-100 text-green-800',
      'in-behandeling': 'bg-yellow-100 text-yellow-800',
      'nog-niet-gestart': 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      'hoog': 'bg-red-100 text-red-800',
      'middel': 'bg-orange-100 text-orange-800',
      'laag': 'bg-blue-100 text-blue-800',
    };
    return styles[priority] || 'bg-gray-100 text-gray-800';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{(client as any).naam}</h1>
            <p className="mt-2 text-gray-600">Klantdossier en voortgang</p>
          </div>
          <div className="flex space-x-3">
            <Link
              href={`/scan?client=${id}`}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 font-medium"
            >
              Scan starten
            </Link>
            <Link
              href={`/klanten/${id}/edit`}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
            >
              Bewerken
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Klantgegevens</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">KvK-nummer</dt>
              <dd className="mt-1 text-sm text-gray-900">{(client as any).kvk || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sector</dt>
              <dd className="mt-1 text-sm text-gray-900">{(client as any).sector || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Aantal medewerkers</dt>
              <dd className="mt-1 text-sm text-gray-900">{(client as any).aantal_medewerkers || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Omzet</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {(client as any).omzet ? `€ ${(client as any).omzet.toLocaleString('nl-NL')}` : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Balanstotaal</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {(client as any).balanstotaal ? `€ ${(client as any).balanstotaal.toLocaleString('nl-NL')}` : '-'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Belangrijkste afnemers</dt>
              <dd className="mt-1 text-sm text-gray-900">{(client as any).afnemers || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Banken</dt>
              <dd className="mt-1 text-sm text-gray-900">{(client as any).banken || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tenders</dt>
              <dd className="mt-1 text-sm text-gray-900">{(client as any).tenders || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Processtatus</h2>
          <div className="space-y-3">
            {[
              { key: 'scan', label: 'Scan' },
              { key: 'gatanalyse', label: 'Gatanalyse' },
              { key: 'bewijspakket', label: 'Bewijspakket' },
              { key: 'claimcheck', label: 'Claimcheck' },
              { key: 'jaarlijkse-update', label: 'Jaarlijkse update' },
            ].map(step => {
              const status = statusMap[step.key];
              return (
                <div key={step.key} className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">{step.label}</span>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadge(status?.status || 'nog-niet-gestart')}`}>
                      {status?.status || 'nog-niet-gestart'}
                    </span>
                    {status?.notitie && (
                      <span className="text-sm text-gray-500">{status.notitie}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Bewijsstukken ({evidence.length})</h2>
            <Link
              href={`/klanten/${id}/evidence/nieuw`}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              + Toevoegen
            </Link>
          </div>
          {evidence.length > 0 ? (
            <div className="space-y-3">
              {evidence.map((item: any) => (
                <div key={item.id} className="border rounded p-3">
                  <div className="flex justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium">{item.titel}</h3>
                      <p className="text-sm text-gray-500">{item.type}</p>
                      {item.link_notitie && (
                        <p className="text-sm text-gray-600 mt-1">{item.link_notitie}</p>
                      )}
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      {item.datum && <div>Datum: {new Date(item.datum).toLocaleDateString('nl-NL')}</div>}
                      {item.geldig_tot && (
                        <div className="text-orange-600">Geldig tot: {new Date(item.geldig_tot).toLocaleDateString('nl-NL')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nog geen bewijsstukken toegevoegd.</p>
          )}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Geïdentificeerde gaps ({gaps.filter((g: any) => g.status === 'open').length} open)</h2>
          {gaps.length > 0 ? (
            <div className="space-y-3">
              {gaps.map((gap: any) => (
                <div key={gap.id} className="border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{gap.gap_title}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityBadge(gap.priority)}`}>
                          {gap.priority}
                        </span>
                      </div>
                      {gap.suggested_evidence && (
                        <p className="text-sm text-gray-600 mt-1">💡 {gap.suggested_evidence}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded ${gap.status === 'open' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>
                      {gap.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nog geen gaps geïdentificeerd. Start een scan om gaps te ontdekken.</p>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
