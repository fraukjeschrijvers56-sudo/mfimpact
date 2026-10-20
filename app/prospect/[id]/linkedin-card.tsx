'use client';

import { useState } from 'react';
import { Link2, Pencil, Check, X, ExternalLink } from 'lucide-react';
import {
  parseLinkedInData,
  normalizeLinkedInUrl,
  linkedInTypeLabel,
  detectLinkedInType,
  type LinkedInData,
  type LinkedInType,
} from '@/lib/linkedin';
import { SectionWrapper } from './section-wrapper';
import { Section } from './parts';

export function LinkedInCard({ clientId, data, sectionMetadata }: { clientId: number; data: any; sectionMetadata: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Parse LinkedIn data
  const linkedinData = parseLinkedInData(data);
  
  const [url, setUrl] = useState(linkedinData?.url || '');
  const [type, setType] = useState<LinkedInType>(linkedinData?.type || 'bedrijfspagina');
  const [naam, setNaam] = useState(linkedinData?.naam || '');

  const handleSave = async () => {
    setSaving(true);
    try {
      // Normalize URL
      const normalizedUrl = normalizeLinkedInUrl(url);
      if (!normalizedUrl) {
        alert('Ongeldige LinkedIn-URL. Gebruik alleen linkedin.com/company/ of /in/ URLs.');
        setSaving(false);
        return;
      }

      // Detect type from URL if not manually set
      const detectedType = detectLinkedInType(normalizedUrl);
      if (!detectedType) {
        alert('LinkedIn-URL moet beginnen met /company/ of /in/');
        setSaving(false);
        return;
      }

      // Build new LinkedIn data object
      const newLinkedInData: LinkedInData = {
        url: normalizedUrl,
        type: detectedType,
        naam: detectedType === 'eigenaar' ? naam : undefined,
        status: 'handmatig ingevoerd',
      };

      // Fetch current dossier
      const getRes = await fetch(`/api/clients/${clientId}`);
      if (!getRes.ok) throw new Error('Ophalen mislukt');
      const client = await getRes.json();

      let dossier = client.dossier;
      if (typeof dossier === 'string') {
        try {
          dossier = JSON.parse(dossier);
        } catch {
          dossier = {};
        }
      }

      // Update onderzoek.profiel.linkedin
      const onderzoek = dossier.onderzoek || (dossier.profiel || dossier.vsme_basic ? dossier : {});
      const profiel = onderzoek.profiel || {};
      
      profiel.linkedin = newLinkedInData;
      onderzoek.profiel = profiel;
      dossier.onderzoek = onderzoek;

      // Track edited field
      let editedFields = client.edited_fields || [];
      if (typeof editedFields === 'string') {
        try {
          editedFields = JSON.parse(editedFields);
        } catch {
          editedFields = [];
        }
      }
      if (!editedFields.includes('onderzoek.profiel.linkedin')) {
        editedFields.push('onderzoek.profiel.linkedin');
      }

      // Save
      const saveRes = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dossier,
          edited_fields: editedFields,
        }),
      });

      if (!saveRes.ok) throw new Error('Opslaan mislukt');

      // Refresh page
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUrl(linkedinData?.url || '');
    setType(linkedinData?.type || 'bedrijfspagina');
    setNaam(linkedinData?.naam || '');
    setIsEditing(false);
  };

  // Determine display state
  const notFound = !linkedinData || linkedinData.status === 'niet gevonden';
  const displayLabel = linkedInTypeLabel(linkedinData);

  return (
    <SectionWrapper clientId={clientId} section="profiel" sectionMetadata={sectionMetadata} refreshLabel="Profiel">
      <Section
        id="linkedin"
        title="LinkedIn (bedrijf of eigenaar)"
        icon={<Link2 className="w-5 h-5" />}
      >
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-1">
                LinkedIn-URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  // Auto-detect type when URL changes
                  const detected = detectLinkedInType(e.target.value);
                  if (detected) setType(detected);
                }}
                placeholder="https://www.linkedin.com/company/... of /in/..."
                className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-xs text-emerald-200/70 mt-1">
                Alleen /company/ of /in/ URLs worden geaccepteerd
              </p>
            </div>

            {type === 'eigenaar' && (
              <div>
                <label className="block text-sm font-semibold text-white mb-1">
                  Naam eigenaar
                </label>
                <input
                  type="text"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Naam van de eigenaar"
                  className="w-full px-3 py-2 rounded-lg bg-emerald-900/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !url}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 font-medium"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {notFound ? (
                <div className="text-slate-300 italic">
                  onbekend – LinkedIn-pagina niet gevonden via zoekopdracht
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-300 font-medium text-sm">
                      {displayLabel}
                    </span>
                    {linkedinData?.status === 'handmatig ingevoerd' && (
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-600/80 text-sky-100">
                        aangepast
                      </span>
                    )}
                  </div>
                  {linkedinData?.url && (
                    <a
                      href={linkedinData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-white hover:text-emerald-300 underline underline-offset-2 break-all"
                    >
                      {linkedinData.url}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  )}
                  {linkedinData?.bron && (
                    <p className="text-xs text-emerald-200/70">
                      Bron: {linkedinData.bron}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex-shrink-0 p-2 rounded-lg bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700"
              title="Bewerken"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
      </Section>
    </SectionWrapper>
  );
}
