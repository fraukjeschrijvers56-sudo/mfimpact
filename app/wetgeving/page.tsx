'use client';

import { useState, useEffect } from 'react';
import MainLayout from '../components/MainLayout';
import GlassWindow from '../components/GlassWindow';
import Link from 'next/link';

export default function WetgevingPage() {
  const [legislation, setLegislation] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    type: '',
    niveau: '',
    search: '',
  });

  useEffect(() => {
    fetch('/api/wetgeving')
      .then(r => r.json())
      .then(data => setLegislation(data));
  }, []);

  const filteredLegislation = legislation.filter(item => {
    if (filter.type && item.type !== filter.type) return false;
    if (filter.niveau && item.niveau !== filter.niveau) return false;
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      if (!item.naam.toLowerCase().includes(searchLower) &&
          !item.drempels?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    return true;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header in glass card for readability */}
        <GlassWindow>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Wetgeving & drempels</h1>
              <p className="mt-2 text-white/70">Overzicht van relevante regelgeving voor Nederlandse MKB</p>
            </div>
            <Link
              href="/wetgeving/drempelcheck"
              className="bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 font-medium transition-colors"
            >
              Drempelcheck uitvoeren
            </Link>
          </div>
        </GlassWindow>

        <div className="bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="">Alle types</option>
                <option value="hard law">Hard law</option>
                <option value="soft law">Soft law</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Niveau
              </label>
              <select
                value={filter.niveau}
                onChange={(e) => setFilter({ ...filter, niveau: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="">Alle niveaus</option>
                <option value="EU">EU</option>
                <option value="NL">NL</option>
                <option value="internationaal">Internationaal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zoeken
              </label>
              <input
                type="text"
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                placeholder="Zoek in naam of drempels..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg divide-y">
          {filteredLegislation.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{item.naam}</h3>
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${
                      item.type === 'hard law' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.type}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                      {item.niveau}
                    </span>
                    {item.te_verifieren === 1 && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
                        Te verifiëren
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <span className="ml-2 text-gray-600">{item.status}</span>
                      {item.peildatum && (
                        <span className="ml-2 text-gray-500">(peildatum: {new Date(item.peildatum).toLocaleDateString('nl-NL')})</span>
                      )}
                    </div>
                    
                    {item.drempels && (
                      <div>
                        <span className="font-medium text-gray-700">Drempels:</span>
                        <span className="ml-2 text-gray-600">{item.drempels}</span>
                      </div>
                    )}
                    
                    {item.doorwerking && (
                      <div>
                        <span className="font-medium text-gray-700">Indirecte doorwerking:</span>
                        <span className="ml-2 text-gray-600">{item.doorwerking}</span>
                      </div>
                    )}
                    
                    {item.bronlink && (
                      <div>
                        <a 
                          href={item.bronlink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          Bron →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredLegislation.length === 0 && (
            <div className="p-6 text-center text-gray-500">
              Geen wetgeving gevonden met de huidige filters.
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Let op:</strong> Items gemarkeerd als "Te verifiëren" zijn gebaseerd op beschikbare informatie 
            maar moeten nog worden geverifieerd tegen officiële bronnen. Controleer altijd de meest actuele regelgeving.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
