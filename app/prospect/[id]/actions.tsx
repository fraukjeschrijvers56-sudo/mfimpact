'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, RefreshCw } from 'lucide-react';

export function ProspectActions({ client }: { client: any }) {
  const router = useRouter();

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

  const reAnalyze = () => {
    if (!client.website_url || !client.plaats) {
      alert('Website-URL en plaats zijn vereist om opnieuw te onderzoeken');
      return;
    }

    if (
      !confirm(
        `Opnieuw onderzoeken voor ${client.naam}? Dit kan enkele minuten duren en overschrijft het huidige dossier.`
      )
    ) {
      return;
    }

    router.push(
      `/?reanalyze=${client.id}&url=${encodeURIComponent(client.website_url)}&city=${encodeURIComponent(client.plaats)}`
    );
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
      <button
        onClick={reAnalyze}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-700/60 text-violet-100 hover:bg-violet-600 font-medium"
        title="Opnieuw onderzoeken"
        aria-label="Opnieuw onderzoeken"
      >
        <RefreshCw className="w-4 h-4" /> Opnieuw onderzoeken
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
