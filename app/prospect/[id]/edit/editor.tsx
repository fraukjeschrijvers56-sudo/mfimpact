'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/app/components/MainLayout';
import { nl, isUnknown, labelize } from '@/lib/format';
import {
  Save,
  X,
  ArrowLeft,
  Trash2,
  Plus,
  Pencil,
  Check,
  AlertTriangle,
} from 'lucide-react';

interface DossierItem {
  [key: string]: any;
}

export function ProspectEditor({ client }: { client: any }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Parse dossier
  let dossier: any = client.dossier;
  if (typeof dossier === 'string') {
    try {
      dossier = JSON.parse(dossier);
    } catch {
      dossier = {};
    }
  }
  dossier = dossier && typeof dossier === 'object' ? dossier : {};
  const onderzoek: any = dossier.onderzoek ?? (dossier.profiel || dossier.vsme_basic ? dossier : {});

  // Basic fields
  const [naam, setNaam] = useState(client.naam || '');
  const [website, setWebsite] = useState(client.website_url || '');
  const [plaats, setPlaats] = useState(client.plaats || '');
  const [sector, setSector] = useState(client.sector || '');
  const [kvk, setKvk] = useState(client.kvk || '');
  const [samenvatting, setSamenvatting] = useState(onderzoek.samenvatting || '');

  // Dossier arrays
  const [personen, setPersonen] = useState<DossierItem[]>(
    Array.isArray(onderzoek.personen) ? onderzoek.personen : []
  );
  const [certificaten, setCertificaten] = useState<DossierItem[]>(
    Array.isArray(onderzoek.certificaten) ? onderzoek.certificaten : []
  );
  const [nieuws, setNieuws] = useState<DossierItem[]>(
    Array.isArray(onderzoek.nieuws) ? onderzoek.nieuws : []
  );
  const [gaten, setGaten] = useState<DossierItem[]>(
    Array.isArray(onderzoek.gaten) ? onderzoek.gaten : []
  );
  const [claims, setClaims] = useState<DossierItem[]>(
    Array.isArray(onderzoek.claims) ? onderzoek.claims : []
  );
  const [kansen, setKansen] = useState<string[]>(
    Array.isArray(onderzoek.kansen_gesprek) ? onderzoek.kansen_gesprek : []
  );

  const [editingSection, setEditingSection] = useState<string | null>(null);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const updatedDossier = {
        ...dossier,
        onderzoek: {
          ...onderzoek,
          samenvatting,
          personen,
          certificaten,
          nieuws,
          gaten,
          claims,
          kansen_gesprek: kansen,
        },
        _handmatig_aangepast: true,
      };

      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          naam,
          website_url: website,
          plaats,
          sector,
          kvk,
          dossier: updatedDossier,
        }),
      });

      if (!res.ok) throw new Error('Opslaan mislukt');
      router.push(`/prospect/${client.id}`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const deleteProspect = async () => {
    if (!confirm('Weet je het zeker? Deze prospect wordt permanent verwijderd.')) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Verwijderen mislukt');
      router.push('/prospects');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Verwijderen mislukt');
      setDeleting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-emerald-950/90 border border-emerald-500/40 shadow-2xl backdrop-blur-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Prospect bewerken</h1>
                <p className="text-emerald-100/70 text-sm">
                  {dossier._handmatig_aangepast && (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Handmatig aangepast
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={deleteProspect}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-500/80 text-white hover:bg-red-500 disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Bezig...' : 'Verwijderen'}
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-400 text-emerald-950 hover:bg-emerald-300 disabled:opacity-50 font-semibold inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1">Naam</label>
              <input
                type="text"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1">Website</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1">Plaats</label>
              <input
                type="text"
                value={plaats}
                onChange={(e) => setPlaats(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1">Sector</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-white mb-1">KvK-nummer</label>
              <input
                type="text"
                value={kvk}
                onChange={(e) => setKvk(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-white mb-1">Samenvatting</label>
              <textarea
                value={samenvatting}
                onChange={(e) => setSamenvatting(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {/* Dossier sections */}
        <EditableSection
          title="Aanknopingspunten voor het gesprek"
          items={kansen}
          onAdd={() => setKansen([...kansen, ''])}
          onEdit={(i, val) => {
            const updated = [...kansen];
            updated[i] = val;
            setKansen(updated);
          }}
          onDelete={(i) => setKansen(kansen.filter((_, idx) => idx !== i))}
          renderItem={(item, i) => (
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const updated = [...kansen];
                updated[i] = e.target.value;
                setKansen(updated);
              }}
              className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
            />
          )}
        />

        <EditableArraySection
          title="Personen"
          items={personen}
          setItems={setPersonen}
          fields={['naam', 'functie', 'url']}
        />

        <EditableArraySection
          title="Certificaten"
          items={certificaten}
          setItems={setCertificaten}
          fields={['naam', 'niveau', 'geldig_tot', 'geverifieerd_in_register']}
        />

        <EditableArraySection
          title="Nieuws"
          items={nieuws}
          setItems={setNieuws}
          fields={['titel', 'datum', 'samenvatting', 'url']}
        />

        <EditableArraySection
          title="Gaten"
          items={gaten}
          setItems={setGaten}
          fields={['onderdeel', 'prioriteit', 'waarom', 'bewijsactie']}
        />

        <EditableArraySection
          title="Claims"
          items={claims}
          setItems={setClaims}
          fields={['citaat', 'type', 'beoordeling', 'toelichting', 'url']}
        />
      </div>
    </MainLayout>
  );
}

function EditableSection({
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
  renderItem,
}: {
  title: string;
  items: any[];
  onAdd: () => void;
  onEdit: (index: number, value: any) => void;
  onDelete: (index: number) => void;
  renderItem: (item: any, index: number) => React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700/60 text-white hover:bg-emerald-600 text-sm"
        >
          <Plus className="w-4 h-4" /> Toevoegen
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-emerald-100/70 text-sm italic">Nog geen items</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1">{renderItem(item, i)}</div>
            <button
              onClick={() => onDelete(i)}
              className="p-2 rounded-lg bg-red-800/60 text-red-100 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableArraySection({
  title,
  items,
  setItems,
  fields,
}: {
  title: string;
  items: DossierItem[];
  setItems: (items: DossierItem[]) => void;
  fields: string[];
}) {
  const addItem = () => {
    const newItem: DossierItem = {};
    fields.forEach((f) => (newItem[f] = ''));
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <button
          onClick={addItem}
          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700/60 text-white hover:bg-emerald-600 text-sm"
        >
          <Plus className="w-4 h-4" /> Toevoegen
        </button>
      </div>
      <div className="space-y-4">
        {items.length === 0 && (
          <p className="text-emerald-100/70 text-sm italic">Nog geen items</p>
        )}
        {items.map((item, i) => (
          <div
            key={i}
            className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-700/40"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <p className="text-xs font-semibold uppercase text-emerald-300">
                Item {i + 1}
              </p>
              <button
                onClick={() => deleteItem(i)}
                className="p-1 rounded bg-red-800/60 text-red-100 hover:bg-red-700"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fields.map((field) => (
                <div key={field} className={field === 'samenvatting' || field === 'waarom' || field === 'bewijsactie' || field === 'toelichting' ? 'md:col-span-2' : ''}>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">
                    {labelize(field)}
                  </label>
                  {(field === 'samenvatting' || field === 'waarom' || field === 'bewijsactie' || field === 'toelichting') ? (
                    <textarea
                      value={item[field] || ''}
                      onChange={(e) => updateItem(i, field, e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={item[field] || ''}
                      onChange={(e) => updateItem(i, field, e.target.value)}
                      className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
