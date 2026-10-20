'use client';

import { useState } from 'react';
import { Lightbulb, Clock, AlertCircle, MessageCircle, Plus, Trash2, Edit2, Check, X, GripVertical } from 'lucide-react';
import { SectionWrapper } from './section-wrapper';
import { Section } from './parts';
import { SectionRefreshButton } from './section-refresh-button';

interface GesprekData {
  agenda?: Array<{ punt: string; minuten: number }>;
  aannames?: Array<{ aanname: string; onderbouwing: string; te_verifieren_vraag: string }>;
  vragen?: {
    klanten_tenders?: string[];
    mvo_praktijk_data?: string[];
    ambitie?: string[];
    budget_tijdlijn?: string[];
    besluitvorming?: string[];
  };
  next_steps?: Array<{ stap: string; eigenaar: string; termijn: string }>;
}

const DEFAULT_NEXT_STEPS = [
  { stap: 'Kennismakingsgesprek en vaststellen behoeften klant', eigenaar: 'beiden', termijn: 'week 1' },
  { stap: 'NDA tekenen', eigenaar: 'beiden', termijn: 'week 1' },
  { stap: 'Informatie delen door klant — checklist: energiedata, personeelsdata, beleid, certificaten, klant- en tendereisen', eigenaar: 'klant', termijn: 'week 2' },
  { stap: 'Scope en behoeften bepalen', eigenaar: 'MF Impact', termijn: 'week 2' },
  { stap: 'Offerte sturen', eigenaar: 'MF Impact', termijn: 'week 3' },
  { stap: 'Start traject en bewijspakket', eigenaar: 'beiden', termijn: 'na akkoord' },
];

const VRAAG_CATEGORIES: Record<string, string> = {
  klanten_tenders: 'Klanten & Tenders',
  mvo_praktijk_data: 'MVO-praktijk & Data',
  ambitie: 'Ambitie',
  budget_tijdlijn: 'Budget & Tijdlijn',
  besluitvorming: 'Besluitvorming',
};

export function GesprekSection({ clientId, gesprek, sectionMetadata }: { clientId: number; gesprek: GesprekData | null; sectionMetadata: any }) {
  const metadata = sectionMetadata?.gesprek;
  const isEmpty = !gesprek || Object.keys(gesprek).length === 0;

  if (isEmpty) {
    return (
      <SectionWrapper clientId={clientId} section="gesprek" sectionMetadata={sectionMetadata} refreshLabel="Gesprek voorbereiden">
        <Section
          id="gesprek"
          title="Aanknopingspunten voor het gesprek"
          icon={<Lightbulb className="w-5 h-5" />}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <p className="text-emerald-100/70">
              Nog niet gegenereerd. Gebruik '↻ Vernieuw Gesprek voorbereiden' om een gespreksplan te maken.
            </p>
            <SectionRefreshButton clientId={clientId} section="gesprek" label="Nu genereren" />
          </div>
        </Section>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper clientId={clientId} section="gesprek" sectionMetadata={sectionMetadata} refreshLabel="Gesprek voorbereiden">
      <Section
        id="gesprek"
        title="Aanknopingspunten voor het gesprek"
        icon={<Lightbulb className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Agenda */}
          {gesprek.agenda && gesprek.agenda.length > 0 && (
            <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-5">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Agenda
              </h3>
              <div className="space-y-2">
                {gesprek.agenda.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-emerald-800/40 border border-emerald-600/40">
                    <span className="text-white">{item.punt}</span>
                    <span className="text-emerald-300 font-semibold text-sm">{item.minuten} min</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aannames */}
          {gesprek.aannames && gesprek.aannames.length > 0 && (
            <div className="rounded-xl bg-amber-950/60 border border-amber-600/40 p-5">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Aannames
              </h3>
              <div className="space-y-3">
                {gesprek.aannames.map((item, idx) => (
                  <div key={idx} className="rounded-lg bg-amber-900/40 border border-amber-700/40 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded bg-amber-700/60 text-amber-100 flex-shrink-0">
                        aanname
                      </span>
                      <p className="text-white font-semibold">{item.aanname}</p>
                    </div>
                    <p className="text-sm text-amber-100">
                      <strong>Onderbouwing:</strong> {item.onderbouwing}
                    </p>
                    <p className="text-sm text-amber-50">
                      <strong>Te verifiëren:</strong> {item.te_verifieren_vraag}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vragen */}
          {gesprek.vragen && Object.keys(gesprek.vragen).some(k => gesprek.vragen![k as keyof typeof gesprek.vragen]?.length) && (
            <div className="rounded-xl bg-sky-950/60 border border-sky-600/40 p-5">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Vragen
              </h3>
              <div className="space-y-4">
                {Object.entries(gesprek.vragen).map(([category, questions]) => {
                  if (!questions || !Array.isArray(questions) || questions.length === 0) return null;
                  return (
                    <div key={category}>
                      <h4 className="text-md font-semibold text-sky-200 mb-2">
                        {VRAAG_CATEGORIES[category] || category}
                      </h4>
                      <ul className="space-y-1">
                        {questions.map((q, idx) => (
                          <li key={idx} className="text-sm text-sky-50 pl-4 before:content-['•'] before:mr-2">
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Section>
    </SectionWrapper>
  );
}

export function NextStepsCard({ clientId, nextSteps: initialSteps }: { clientId: number; nextSteps: Array<{ stap: string; eigenaar: string; termijn: string }> | null }) {
  const [steps, setSteps] = useState(initialSteps || DEFAULT_NEXT_STEPS);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ stap: '', eigenaar: '', termijn: '' });
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get current dossier
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

      const onderzoek = dossier.onderzoek || {};
      const gesprek = onderzoek.gesprek || {};
      gesprek.next_steps = steps;
      onderzoek.gesprek = gesprek;
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
      if (!editedFields.includes('onderzoek.gesprek.next_steps')) {
        editedFields.push('onderzoek.gesprek.next_steps');
      }

      const saveRes = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossier, edited_fields: editedFields }),
      });

      if (!saveRes.ok) throw new Error('Opslaan mislukt');

      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Opslaan mislukt');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (index: number) => {
    setEditing(index);
    setEditForm(steps[index]);
  };

  const handleSaveEdit = () => {
    if (!editForm.stap || !editForm.eigenaar || !editForm.termijn) {
      alert('Alle velden zijn verplicht');
      return;
    }
    const newSteps = [...steps];
    newSteps[editing!] = editForm;
    setSteps(newSteps);
    setEditing(null);
    setEditForm({ stap: '', eigenaar: '', termijn: '' });
  };

  const handleDelete = (index: number) => {
    if (!confirm('Weet je zeker dat je deze stap wilt verwijderen?')) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (!editForm.stap || !editForm.eigenaar || !editForm.termijn) {
      alert('Alle velden zijn verplicht');
      return;
    }
    setSteps([...steps, editForm]);
    setAdding(false);
    setEditForm({ stap: '', eigenaar: '', termijn: '' });
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSteps.length) return;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps);
  };

  return (
    <section id="next-steps" className="scroll-mt-24 rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">Next steps</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-700/60 text-white hover:bg-emerald-600 text-sm"
          >
            <Plus className="w-4 h-4" /> Toevoegen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={idx} className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 p-4">
            {editing === idx ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-200 mb-1">Stap</label>
                  <input
                    type="text"
                    value={editForm.stap}
                    onChange={(e) => setEditForm({ ...editForm, stap: e.target.value })}
                    className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-200 mb-1">Eigenaar</label>
                    <input
                      type="text"
                      value={editForm.eigenaar}
                      onChange={(e) => setEditForm({ ...editForm, eigenaar: e.target.value })}
                      placeholder="beiden / klant / MF Impact"
                      className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-200 mb-1">Termijn</label>
                    <input
                      type="text"
                      value={editForm.termijn}
                      onChange={(e) => setEditForm({ ...editForm, termijn: e.target.value })}
                      placeholder="week 1 / direct / na akkoord"
                      className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-sm"
                  >
                    <Check className="w-3 h-3" /> Opslaan
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600 text-sm"
                  >
                    <X className="w-3 h-3" /> Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => moveStep(idx, 'up')}
                    disabled={idx === 0}
                    className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <GripVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-emerald-300 font-bold text-sm flex-shrink-0">{idx + 1}.</span>
                    <p className="text-white">{step.stap}</p>
                  </div>
                  <div className="flex gap-4 text-xs text-emerald-200/70">
                    <span><strong>Eigenaar:</strong> {step.eigenaar}</span>
                    <span><strong>Termijn:</strong> {step.termijn}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(idx)}
                    className="p-1 rounded bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1 rounded bg-red-800/60 text-red-100 hover:bg-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {adding && (
          <div className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">Stap</label>
              <input
                type="text"
                value={editForm.stap}
                onChange={(e) => setEditForm({ ...editForm, stap: e.target.value })}
                className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Eigenaar</label>
                <input
                  type="text"
                  value={editForm.eigenaar}
                  onChange={(e) => setEditForm({ ...editForm, eigenaar: e.target.value })}
                  placeholder="beiden / klant / MF Impact"
                  className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Termijn</label>
                <input
                  type="text"
                  value={editForm.termijn}
                  onChange={(e) => setEditForm({ ...editForm, termijn: e.target.value })}
                  placeholder="week 1 / direct / na akkoord"
                  className="w-full px-2 py-1 text-sm rounded bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 text-sm"
              >
                <Check className="w-3 h-3" /> Toevoegen
              </button>
              <button
                onClick={() => {
                  setAdding(false);
                  setEditForm({ stap: '', eigenaar: '', termijn: '' });
                }}
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-700 text-white hover:bg-slate-600 text-sm"
              >
                <X className="w-3 h-3" /> Annuleren
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
