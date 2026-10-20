'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, RefreshCw, FileText } from 'lucide-react';
import { useState } from 'react';

export function ProspectActions({ client }: { client: any }) {
  const router = useRouter();
  const [generatingReport, setGeneratingReport] = useState(false);

  const generateReport = async (format: 'docx' | 'pptx' | 'pdf') => {
    setGeneratingReport(true);
    try {
      const response = await fetch(`/api/clients/${client.id}/rapport?format=${format}`);
      if (!response.ok) throw new Error('Failed to generate report');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport-${client.naam || 'prospect'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const deleteProspect = async () => {
    if (!confirm('Weet je het zeker? Deze prospect wordt permanent verwijderd.')) {
      return;
    }

    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Verwijderen mislukt');
      router.push('/prospects');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Verwijderen mislukt');
    }
  };

  const reAnalyze = async () => {
    if (!client.website_url || !client.plaats) {
      alert('Website-URL en plaats zijn vereist om volledig opnieuw te onderzoeken');
      return;
    }

    if (
      !confirm(
        `VOLLEDIG opnieuw onderzoeken voor ${client.naam}?\n\nDit start een volledige analyse met alle secties (web onderzoek → profiel → VSME → certificaten → claimcheck → klanteisen → tenders).\n\nDe huidige versie wordt bewaard. Dit kan enkele minuten duren.\n\nTip: gebruik de '↻ Vernieuw' knoppen per sectie voor snellere updates van specifieke onderdelen.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/clients/${client.id}/rerun`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start full rerun');
      }

      const data = await response.json();
      alert(`Volledig heronderzoek gestart! ${data.sections.length} secties worden nu verwerkt. Vernieuw de pagina over enkele minuten.`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start full rerun');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/prospect/${client.id}/edit`}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600/60 text-amber-50 hover:bg-amber-500 font-medium"
        title="Bewerken"
        aria-label="Bewerken"
      >
        <Pencil className="w-4 h-4" /> Bewerken
      </Link>
      
      <div className="relative">
        <button
          onClick={() => generateReport('docx')}
          disabled={generatingReport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-700/60 text-indigo-100 hover:bg-indigo-600 font-medium disabled:opacity-50 w-full"
          title="Rapport opstellen (Word)"
          aria-label="Rapport opstellen"
        >
          <FileText className="w-4 h-4" /> {generatingReport ? 'Genereren...' : 'Rapport opstellen'}
        </button>
        {!generatingReport && (
          <div className="absolute top-full left-0 right-0 mt-1 hidden group-hover:block z-10">
            <div className="bg-emerald-900 rounded-lg shadow-lg border border-emerald-700 p-1">
              <button
                onClick={() => generateReport('docx')}
                className="w-full text-left px-3 py-1 text-sm text-white hover:bg-emerald-800 rounded"
              >
                Word (.docx)
              </button>
              <button
                onClick={() => generateReport('pptx')}
                className="w-full text-left px-3 py-1 text-sm text-white hover:bg-emerald-800 rounded"
              >
                PowerPoint (.pptx)
              </button>
              <button
                onClick={() => generateReport('pdf')}
                className="w-full text-left px-3 py-1 text-sm text-white hover:bg-emerald-800 rounded"
              >
                PDF (.pdf)
              </button>
            </div>
          </div>
        )}
      </div>
      
      <button
        onClick={reAnalyze}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-700/60 text-violet-100 hover:bg-violet-600 font-medium"
        title="Volledig opnieuw onderzoeken (alle secties)"
        aria-label="Volledig opnieuw onderzoeken"
      >
        <RefreshCw className="w-4 h-4" /> Volledig opnieuw onderzoeken
      </button>
      <button
        onClick={deleteProspect}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-700/70 text-red-100 hover:bg-red-600 font-medium"
        title="Verwijderen"
        aria-label="Verwijderen"
      >
        <Trash2 className="w-4 h-4" /> Verwijderen
      </button>
    </div>
  );
}
