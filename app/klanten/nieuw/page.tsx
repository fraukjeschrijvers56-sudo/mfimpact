'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/app/components/MainLayout';

export default function NieuweKlantPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    naam: '',
    kvk: '',
    sector: '',
    aantal_medewerkers: '',
    omzet: '',
    balanstotaal: '',
    afnemers: '',
    banken: '',
    tenders: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const response = await fetch('/api/klanten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      const { id } = await response.json();
      router.push(`/klanten/${id}`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <MainLayout>
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Nieuwe klant</h1>
          <p className="mt-2 text-gray-600">Maak een nieuw klantdossier aan</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Bedrijfsnaam *
              </label>
              <input
                type="text"
                name="naam"
                required
                value={formData.naam}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                KvK-nummer
              </label>
              <input
                type="text"
                name="kvk"
                value={formData.kvk}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sector
              </label>
              <input
                type="text"
                name="sector"
                value={formData.sector}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Aantal medewerkers
              </label>
              <input
                type="number"
                name="aantal_medewerkers"
                value={formData.aantal_medewerkers}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Omzet (€)
              </label>
              <input
                type="number"
                name="omzet"
                value={formData.omzet}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Balanstotaal (€)
              </label>
              <input
                type="number"
                name="balanstotaal"
                value={formData.balanstotaal}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Belangrijkste afnemers/inkopers
              </label>
              <textarea
                name="afnemers"
                rows={2}
                value={formData.afnemers}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Banken
              </label>
              <textarea
                name="banken"
                rows={2}
                value={formData.banken}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Tenders
              </label>
              <textarea
                name="tenders"
                rows={2}
                value={formData.tenders}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Opslaan
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}
