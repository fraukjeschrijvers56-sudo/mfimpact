'use client';

import { useState, useEffect } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Version {
  id: number;
  version_timestamp: string;
  section_name: string | null;
  change_reason: string | null;
  created_at: string;
}

interface Props {
  clientId: number;
}

export function VersionHistory({ clientId }: Props) {
  const router = useRouter();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    fetchVersions();
  }, [clientId]);

  const fetchVersions = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreVersion = async (versionId: number, timestamp: string) => {
    if (!confirm(`Weet je zeker dat je deze versie wilt herstellen?\n\nDatum: ${new Date(timestamp).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}\n\nLET OP: Dit overschrijft de huidige data (handmatig aangepaste velden blijven behouden).`)) {
      return;
    }

    setRestoring(versionId);
    try {
      const response = await fetch(`/api/clients/${clientId}/versions/${versionId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Herstellen mislukt');

      alert('Versie succesvol hersteld');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Herstellen mislukt');
    } finally {
      setRestoring(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-4">
        <p className="text-sm text-emerald-100/70">Versies laden...</p>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-4">
        <div className="flex items-center gap-2 mb-2">
          <History className="w-4 h-4 text-emerald-300" />
          <h3 className="text-sm font-semibold text-white">Versiegeschiedenis</h3>
        </div>
        <p className="text-xs text-emerald-100/70 italic">Geen eerdere versies beschikbaar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-emerald-300" />
        <h3 className="text-sm font-semibold text-white">Versiegeschiedenis</h3>
        <span className="text-xs text-emerald-200/50">({versions.length} versies)</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {versions.slice(0, 10).map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between gap-2 p-2 rounded bg-emerald-800/30 border border-emerald-700/30"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white">
                {new Date(version.version_timestamp).toLocaleString('nl-NL', {
                  timeZone: 'Europe/Amsterdam',
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
              {version.section_name && (
                <p className="text-xs text-emerald-200/70">Sectie: {version.section_name}</p>
              )}
              {version.change_reason && (
                <p className="text-xs text-emerald-200/50 truncate">{version.change_reason}</p>
              )}
            </div>
            <button
              onClick={() => restoreVersion(version.id, version.version_timestamp)}
              disabled={restoring === version.id}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-cyan-700/60 text-cyan-100 hover:bg-cyan-600 disabled:opacity-50"
              title="Herstel deze versie"
            >
              <RotateCcw className="w-3 h-3" />
              {restoring === version.id ? '...' : 'Herstel'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
