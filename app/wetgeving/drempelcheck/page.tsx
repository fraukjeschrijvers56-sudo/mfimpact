'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/app/components/MainLayout';
import GlassWindow from '@/app/components/GlassWindow';

export default function DrempelcheckPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/klanten/list')
      .then(r => r.json())
      .then(data => setClients(data));
  }, []);

  const handleCheck = async () => {
    if (!selectedClient) return;
    
    setLoading(true);
    const response = await fetch(`/api/wetgeving/drempelcheck/${selectedClient}`);
    const data = await response.json();
    setResults(data);
    setLoading(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header in glass card for readability */}
        <GlassWindow>
          <div>
            <h1 className="text-3xl font-bold text-white">Drempelcheck</h1>
            <p className="mt-2 text-white/70">
              Controleer welke wetgeving direct of indirect van toepassing is op een klant
            </p>
          </div>
        </GlassWindow>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecteer klant
              </label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="block w-full md:w-96 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="">-- Kies een klant --</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.naam}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleCheck}
              disabled={!selectedClient || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Controleren...' : 'Uitvoeren'}
            </button>
          </div>
        </div>

        {results && (
          <>
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Klantgegevens</h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Aantal medewerkers</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">{results.client.aantal_medewerkers || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Omzet</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {results.client.omzet ? `€ ${results.client.omzet.toLocaleString('nl-NL')}` : '-'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Balanstotaal</dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {results.client.balanstotaal ? `€ ${results.client.balanstotaal.toLocaleString('nl-NL')}` : '-'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-2">Wetgeving & drempels</h2>
              {results.summary && <p className="text-sm font-medium text-gray-800 mb-4">{results.summary}</p>}
              <div className="space-y-3">
                {(results.items || []).map((item: any) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{item.category || item.naam}</h3>
                      <span
                        className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: item.color,
                          color: item.status === 'te_onderzoeken' ? '#1A1A1A' : '#FFFFFF',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {(item.reasons || []).join(' · ') || item.reason}
                    </p>
                    {item.source && <p className="text-xs text-gray-500 mt-1">Bron: {item.source}</p>}
                    {item.needed && <p className="text-sm text-amber-800 mt-1">{item.needed}</p>}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Interpretatie:</strong> {results.disclaimer || 'Indicatief, geen juridisch advies'}
                {results.referenceDate ? ` · peildatum ${results.referenceDate}` : ''}.
                Raadpleeg altijd de officiële bronnen voor definitieve bepaling van toepasselijkheid.
              </p>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
