'use client';

import { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import GlassWindow from '../components/GlassWindow';

export default function ClaimcheckPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [claimText, setClaimText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/klanten/list')
      .then(r => r.json())
      .then(data => setClients(data));
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetch(`/api/claimcheck/${selectedClient}`)
        .then(r => r.json())
        .then(data => setHistory(data));
    }
  }, [selectedClient]);

  const handleCheck = async () => {
    if (!claimText.trim()) {
      alert('Voer eerst een claim in');
      return;
    }

    setLoading(true);

    const response = await fetch('/api/claimcheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        client_id: selectedClient || null,
        claim_text: claimText 
      }),
    });

    const data = await response.json();
    setResult(data);
    setLoading(false);

    // Refresh history if client selected
    if (selectedClient) {
      const historyResponse = await fetch(`/api/claimcheck/${selectedClient}`);
      const historyData = await historyResponse.json();
      setHistory(historyData);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'green': return 'bg-green-100 border-green-500 text-green-900';
      case 'orange': return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'red': return 'bg-red-100 border-red-500 text-red-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'green': return '✓';
      case 'orange': return '⚠';
      case 'red': return '✗';
      default: return '?';
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'green': return 'Geen directe risico\'s gedetecteerd';
      case 'orange': return 'Enkele risico\'s geïdentificeerd - nuancering aanbevolen';
      case 'red': return 'Hoog risico - substantiële aanpassing noodzakelijk';
      default: return 'Onbekend';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header in glass card for readability */}
        <GlassWindow>
          <div>
            <h1 className="text-3xl font-bold text-white">Claimcheck</h1>
            <p className="mt-2 text-white/70">
              Controleer groene claims op greenwashing-risico's
            </p>
          </div>
        </GlassWindow>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Klant (optioneel - voor koppeling aan dossier)
            </label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              className="block w-full md:w-96 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            >
              <option value="">-- Geen klant geselecteerd --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.naam}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Claim tekst
            </label>
            <textarea
              value={claimText}
              onChange={(e) => setClaimText(e.target.value)}
              rows={6}
              placeholder="Plak hier de te controleren claim of marketingtekst..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
            />
          </div>

          <button
            onClick={handleCheck}
            disabled={loading || !claimText.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Controleren...' : 'Claim controleren'}
          </button>
        </div>

        {result && (
          <div className={`border-l-4 rounded-lg p-6 ${getResultColor(result.result)}`}>
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-4xl">{getResultIcon(result.result)}</span>
              <div>
                <h2 className="text-xl font-bold">Resultaat</h2>
                <p className="text-sm">{getResultText(result.result)}</p>
              </div>
            </div>

            {result.risks && result.risks.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="font-semibold text-lg">Geïdentificeerde risico's:</h3>
                {result.risks.map((risk: any, index: number) => (
                  <div key={index} className="bg-white bg-opacity-70 rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityBadge(risk.severity)}`}>
                            {risk.severity === 'high' ? 'Hoog' : risk.severity === 'medium' ? 'Middel' : 'Laag'}
                          </span>
                          <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                            "{risk.match}"
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-900">{risk.risk}</p>
                        <p className="text-sm text-gray-700 mt-2">
                          <strong>💡 Suggestie:</strong> {risk.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.suggestions && (
              <div className="mt-6">
                <h3 className="font-semibold text-lg mb-2">Verbeterde versie:</h3>
                <div className="bg-white bg-opacity-70 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{result.suggestions}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {selectedClient && history.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Eerdere checks voor deze klant</h2>
            <div className="space-y-3">
              {history.map((check: any) => (
                <div key={check.id} className="border rounded p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 line-clamp-2">{check.claim_text}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          check.result === 'green' ? 'bg-green-100 text-green-800' :
                          check.result === 'orange' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {check.result}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(check.created_at).toLocaleDateString('nl-NL')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Over de claimcheck</h3>
          <p className="text-sm text-blue-800">
            Deze tool controleert claims op basis van veelvoorkomende greenwashing-patronen en best practices 
            uit de conceptversie van de EU Green Claims Directive. Het is een eerste screening; juridische 
            toetsing en volledige onderbouwing blijven noodzakelijk. Let op vage termen, absolute claims 
            zonder scope, en compensatieclaims zonder reductie-inspanningen.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
