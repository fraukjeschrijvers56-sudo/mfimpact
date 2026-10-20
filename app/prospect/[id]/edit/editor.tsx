'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/app/components/MainLayout';
import { nl, isUnknown, labelize } from '@/lib/format';
import {
  extractDisplayValue,
  normalizeFieldObject,
  normalizeDossier,
} from '@/lib/field-normalizer';
import {
  parseLinkedInData,
  normalizeLinkedInUrl,
  detectLinkedInType,
  type LinkedInType,
} from '@/lib/linkedin';
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
  const profiel: any = onderzoek.profiel || {};

  // Basic fields - extract display values from field objects
  const [naam, setNaam] = useState(String(extractDisplayValue(client.naam) || ''));
  const [website, setWebsite] = useState(String(extractDisplayValue(client.website_url) || ''));
  const [plaats, setPlaats] = useState(String(extractDisplayValue(client.plaats) || ''));
  const [sector, setSector] = useState(String(extractDisplayValue(client.sector) || ''));
  const [kvk, setKvk] = useState(String(extractDisplayValue(client.kvk) || ''));
  const [samenvatting, setSamenvatting] = useState(String(extractDisplayValue(onderzoek.samenvatting) || ''));

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

  // LinkedIn state
  const linkedinData = parseLinkedInData(profiel.linkedin);
  const [linkedinUrl, setLinkedinUrl] = useState(linkedinData?.url || '');
  const [linkedinType, setLinkedinType] = useState<LinkedInType>(linkedinData?.type || 'bedrijfspagina');
  const [linkedinNaam, setLinkedinNaam] = useState(linkedinData?.naam || '');

  const [editingSection, setEditingSection] = useState<string | null>(null);

  const saveChanges = async () => {
    setSaving(true);
    try {
      // Track edited field paths
      const editedFields: string[] = [];
      
      // Check if basic fields changed
      if (naam !== String(extractDisplayValue(client.naam) || '')) {
        editedFields.push('naam');
      }
      if (website !== String(extractDisplayValue(client.website_url) || '')) {
        editedFields.push('website_url');
      }
      if (plaats !== String(extractDisplayValue(client.plaats) || '')) {
        editedFields.push('plaats');
      }
      if (sector !== String(extractDisplayValue(client.sector) || '')) {
        editedFields.push('sector');
      }
      if (kvk !== String(extractDisplayValue(client.kvk) || '')) {
        editedFields.push('kvk');
      }
      
      // Check if onderzoek fields changed
      if (samenvatting !== String(extractDisplayValue(onderzoek.samenvatting) || '')) {
        editedFields.push('onderzoek.samenvatting');
      }
      
      // Check array fields - mark as edited if length or content changed
      const originalPersonen = Array.isArray(onderzoek.personen) ? onderzoek.personen : [];
      if (JSON.stringify(personen) !== JSON.stringify(originalPersonen)) {
        editedFields.push('onderzoek.personen');
      }
      
      const originalCertificaten = Array.isArray(onderzoek.certificaten) ? onderzoek.certificaten : [];
      if (JSON.stringify(certificaten) !== JSON.stringify(originalCertificaten)) {
        editedFields.push('onderzoek.certificaten');
      }
      
      const originalNieuws = Array.isArray(onderzoek.nieuws) ? onderzoek.nieuws : [];
      if (JSON.stringify(nieuws) !== JSON.stringify(originalNieuws)) {
        editedFields.push('onderzoek.nieuws');
      }
      
      const originalGaten = Array.isArray(onderzoek.gaten) ? onderzoek.gaten : [];
      if (JSON.stringify(gaten) !== JSON.stringify(originalGaten)) {
        editedFields.push('onderzoek.gaten');
      }
      
      const originalClaims = Array.isArray(onderzoek.claims) ? onderzoek.claims : [];
      if (JSON.stringify(claims) !== JSON.stringify(originalClaims)) {
        editedFields.push('onderzoek.claims');
      }
      
      const originalKansen = Array.isArray(onderzoek.kansen_gesprek) ? onderzoek.kansen_gesprek : [];
      if (JSON.stringify(kansen) !== JSON.stringify(originalKansen)) {
        editedFields.push('onderzoek.kansen_gesprek');
      }
      
      // Check if LinkedIn changed
      const originalLinkedinData = parseLinkedInData(profiel.linkedin);
      const currentLinkedinUrl = normalizeLinkedInUrl(linkedinUrl);
      const originalLinkedinUrl = originalLinkedinData?.url || '';
      if (currentLinkedinUrl !== originalLinkedinUrl || linkedinNaam !== (originalLinkedinData?.naam || '')) {
        editedFields.push('onderzoek.profiel.linkedin');
      }

      // Merge with existing edited_fields
      let existingEditedFields: string[] = client.edited_fields || [];
      if (typeof existingEditedFields === 'string') {
        try {
          existingEditedFields = JSON.parse(existingEditedFields);
        } catch {
          existingEditedFields = [];
        }
      }
      const allEditedFields = Array.from(new Set([...existingEditedFields, ...editedFields]));

      // Build LinkedIn data object
      const normalizedLinkedinUrl = normalizeLinkedInUrl(linkedinUrl);
      const linkedinDataToSave = normalizedLinkedinUrl ? {
        url: normalizedLinkedinUrl,
        type: detectLinkedInType(normalizedLinkedinUrl) || linkedinType,
        naam: linkedinType === 'eigenaar' ? linkedinNaam : undefined,
        status: 'handmatig ingevoerd' as const,
      } : profiel.linkedin;

      const updatedDossier = normalizeDossier({
        ...dossier,
        onderzoek: {
          ...onderzoek,
          samenvatting: samenvatting || onderzoek.samenvatting,
          profiel: {
            ...profiel,
            linkedin: linkedinDataToSave,
          },
          personen,
          certificaten,
          nieuws,
          gaten,
          claims,
          kansen_gesprek: kansen,
        },
        _handmatig_aangepast: true,
      });

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
          edited_fields: allEditedFields,
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
                className="px-4 py-2 rounded-lg bg-red-700/70 text-red-100 hover:bg-red-600 disabled:opacity-50 inline-flex items-center gap-2 font-medium"
                title="Verwijderen"
                aria-label="Verwijderen"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Bezig...' : 'Verwijderen'}
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-emerald-400 text-emerald-950 hover:bg-emerald-300 disabled:opacity-50 font-semibold inline-flex items-center gap-2"
                title="Opslaan"
                aria-label="Opslaan"
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

          {/* LinkedIn section */}
          <div className="mt-4 pt-4 border-t border-emerald-700/50">
            <h3 className="text-sm font-semibold text-emerald-300 mb-3 uppercase tracking-wide">LinkedIn (bedrijf of eigenaar)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-white mb-1">LinkedIn-URL</label>
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => {
                    setLinkedinUrl(e.target.value);
                    // Auto-detect type
                    const detected = detectLinkedInType(e.target.value);
                    if (detected) setLinkedinType(detected);
                  }}
                  placeholder="https://www.linkedin.com/company/... of /in/..."
                  className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                />
                <p className="text-xs text-emerald-200/70 mt-1">
                  Alleen /company/ (bedrijfspagina) of /in/ (eigenaar) URLs
                </p>
              </div>
              {linkedinType === 'eigenaar' && (
                <div>
                  <label className="block text-sm font-semibold text-white mb-1">Naam eigenaar</label>
                  <input
                    type="text"
                    value={linkedinNaam}
                    onChange={(e) => setLinkedinNaam(e.target.value)}
                    placeholder="Naam van de eigenaar"
                    className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}
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
          fields={['platform', 'naam', 'niveau_of_score', 'niveau', 'geldig_tot', 'verificatie', 'status', 'geverifieerd_in_register']}
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
