'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { nl, hostOf } from '@/lib/format';
import { getDisplayText } from '@/lib/field-normalizer';
import {
  ChevronRight,
  Plus,
  Search,
  Eye,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

interface Prospect {
  id: number;
  naam: string;
  website_url?: string;
  plaats?: string;
  sector?: string;
  created_at?: string;
  dossier?: any;
}

export function ProspectsClient({ initialProspects }: { initialProspects: Prospect[] }) {
  const router = useRouter();
  const [prospects, setProspects] = useState(initialProspects);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<number | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filteredProspects = prospects.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    // Use getDisplayText to handle field objects
    return (
      getDisplayText(p.naam).toLowerCase().includes(q) ||
      getDisplayText(p.sector).toLowerCase().includes(q) ||
      getDisplayText(p.plaats).toLowerCase().includes(q) ||
      hostOf(p.website_url || '').toLowerCase().includes(q)
    );
  });

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProspects.map((p) => p.id)));
    }
  };

  const deleteProspect = async (id: number) => {
    if (!confirm('Weet je het zeker? Deze actie kan niet ongedaan worden gemaakt.')) {
      return;
    }

    setDeleting(id);
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Verwijderen mislukt');
      setProspects((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Verwijderen mislukt');
    } finally {
      setDeleting(null);
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Weet je het zeker? ${selectedIds.size} prospect(en) worden verwijderd.`)) {
      return;
    }

    setBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/clients/${id}`, { method: 'DELETE' })
        )
      );
      setProspects((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } catch (error) {
      alert('Bulk verwijderen mislukt');
    } finally {
      setBulkDeleting(false);
    }
  };

  const reAnalyze = async (prospect: Prospect) => {
    if (!prospect.website_url || !prospect.plaats) {
      alert('Website-URL en plaats zijn vereist om opnieuw te onderzoeken');
      return;
    }

    if (
      !confirm(
        `Opnieuw onderzoeken voor ${prospect.naam}? Dit kan enkele minuten duren en overschrijft het huidige dossier.`
      )
    ) {
      return;
    }

    router.push(
      `/?reanalyze=${prospect.id}&url=${encodeURIComponent(prospect.website_url)}&city=${encodeURIComponent(prospect.plaats)}`
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-white">Eerdere prospects</h1>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400 text-emerald-950 font-semibold hover:bg-emerald-300"
          >
            <Plus className="w-4 h-4" /> Nieuwe prospect
          </Link>
        </div>

        {/* Search and bulk actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-300" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Zoek op naam, sector, plaats of website..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-emerald-900/60 text-white placeholder-emerald-300/50 border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/80 text-white font-semibold hover:bg-red-500 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {bulkDeleting ? 'Bezig...' : `${selectedIds.size} verwijderen`}
            </button>
          )}
        </div>

        {/* Select all */}
        {filteredProspects.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all"
              checked={selectedIds.size === filteredProspects.length && filteredProspects.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-emerald-600 bg-emerald-900/60 text-emerald-400 focus:ring-emerald-500"
            />
            <label htmlFor="select-all" className="text-sm text-emerald-100 cursor-pointer">
              Selecteer alles ({filteredProspects.length})
            </label>
          </div>
        )}
      </div>

      {/* Prospects list */}
      <div className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl divide-y divide-emerald-800/70 overflow-hidden">
        {filteredProspects.length === 0 && (
          <div className="p-5 text-emerald-100">
            {searchQuery ? 'Geen prospects gevonden.' : 'Nog geen prospects onderzocht.'}
          </div>
        )}
        {filteredProspects.map((r) => {
          let dossier: any = r.dossier;
          if (typeof dossier === 'string') {
            try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
          }
          dossier = dossier && typeof dossier === 'object' ? dossier : {};
          const mvoRegister: any = dossier.mvo_register || null;
          
          return (
            <div
              key={r.id}
              className="flex items-center gap-4 p-4 hover:bg-emerald-900/60 transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(r.id)}
                onChange={() => toggleSelect(r.id)}
                className="w-4 h-4 rounded border-emerald-600 bg-emerald-900/60 text-emerald-400 focus:ring-emerald-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{getDisplayText(r.naam)}</p>
                  {mvoRegister && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      mvoRegister.status === 'geregistreerd' ? 'bg-green-900/60 text-green-200 border border-green-600/50' :
                      mvoRegister.status === 'niet_gevonden' ? 'bg-red-900/60 text-red-200 border border-red-600/50' :
                      'bg-amber-900/60 text-amber-200 border border-amber-600/50'
                    }`}>
                      {mvoRegister.status === 'geregistreerd' && <img src="/mvo-good.png" alt="" className="w-3 h-3" />}
                      {mvoRegister.status === 'niet_gevonden' && <img src="/mvo-bad.png" alt="" className="w-3 h-3" />}
                      MVO
                    </span>
                  )}
                </div>
                <p className="text-sm text-emerald-100/80 truncate">
                  {r.website_url ? hostOf(r.website_url) : 'website onbekend'} · {getDisplayText(r.plaats)} ·{' '}
                  {getDisplayText(r.sector)}
                </p>
              </div>
              <span className="text-xs text-emerald-200/80 tabular-nums hidden sm:block">
                {r.created_at
                  ? new Date(r.created_at).toLocaleDateString('nl-NL', {
                      timeZone: 'Europe/Amsterdam',
                    })
                  : ''}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  href={`/prospect/${r.id}`}
                  className="p-2 rounded-lg bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700 transition-colors"
                  title="Bekijken"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  href={`/prospect/${r.id}/edit`}
                  className="p-2 rounded-lg bg-emerald-800/60 text-emerald-100 hover:bg-emerald-700 transition-colors"
                  title="Bewerken"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => reAnalyze(r)}
                  className="p-2 rounded-lg bg-sky-800/60 text-sky-100 hover:bg-sky-700 transition-colors"
                  title="Opnieuw onderzoeken"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteProspect(r.id)}
                  disabled={deleting === r.id}
                  className="p-2 rounded-lg bg-red-800/60 text-red-100 hover:bg-red-700 transition-colors disabled:opacity-50"
                  title="Verwijderen"
                >
                  {deleting === r.id ? (
                    <X className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
