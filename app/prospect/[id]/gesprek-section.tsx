'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';
import { getDefaultNextSteps, type NextStep } from '@/lib/default-next-steps';

export function NextStepsCard({
  clientId,
  nextSteps: initialSteps,
  documentRequests = [],
}: {
  clientId: number;
  nextSteps: NextStep[] | null;
  documentRequests?: string[];
}) {
  const hasSavedSteps = Array.isArray(initialSteps) && initialSteps.length > 0;
  const baseline = hasSavedSteps ? initialSteps : getDefaultNextSteps(documentRequests);
  const [steps, setSteps] = useState(baseline);
  const [editing, setEditing] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ stap: '', eigenaar: '', termijn: '' });
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const dirty = useMemo(() => JSON.stringify(steps) !== JSON.stringify(baseline), [steps, baseline]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

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
    newSteps[editing!] = { ...steps[editing!], ...editForm };
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
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-600 text-white hover:bg-sky-500 text-sm"
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
      {dirty && (
        <div className="mb-3 rounded-lg border border-amber-500/60 bg-amber-950/70 px-3 py-2 text-sm text-amber-100">
          Niet-opgeslagen wijzigingen. Klik op Opslaan om ze te bewaren.
        </div>
      )}

      {hasSavedSteps && documentRequests.length > 0 && (
        <div className="mb-4 rounded-lg border border-sky-600/40 bg-sky-950/50 p-4">
          <h3 className="text-sm font-bold text-sky-100 mb-2">Delen van informatie</h3>
          <p className="text-xs text-sky-200/80 mb-2">
            Op basis van openstaande wetgevingsvragen (niet-opgeslagen; overschrijft handmatige next steps niet):
          </p>
          <ul className="space-y-1">
            {documentRequests.map((req, idx) => (
              <li key={idx} className="text-sm text-sky-50 pl-4 before:content-['•'] before:mr-2">
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-teal-600 text-white hover:bg-teal-500 text-sm"
                  >
                    <Check className="w-3 h-3" /> Bevestigen
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
                    type="button"
                    onClick={() => moveStep(idx, 'up')}
                    disabled={idx === 0}
                    aria-label="Omhoog"
                    className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(idx, 'down')}
                    disabled={idx === steps.length - 1}
                    aria-label="Omlaag"
                    className="text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
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
                  {step.checklist && step.checklist.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {step.checklist.map((item, cidx) => (
                        <li key={cidx} className="text-sm text-emerald-50 pl-4 before:content-['•'] before:mr-2">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(idx)}
                    className="p-1 rounded bg-amber-600 text-white hover:bg-amber-500"
                    aria-label="Bewerken"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1 rounded bg-red-700 text-white hover:bg-red-600"
                    aria-label="Verwijderen"
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
                className="inline-flex items-center gap-1 px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-sm"
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
