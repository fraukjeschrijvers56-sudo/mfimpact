'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { SectionName } from '@/lib/section-versions';

interface Props {
  clientId: number;
  section: SectionName;
  label?: string;
  className?: string;
}

export function SectionRefreshButton({ clientId, section, label, className }: Props) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRefresh = async () => {
    if (!confirm(`Weet je zeker dat je ${label || 'dit onderdeel'} wilt vernieuwen?`)) {
      return;
    }

    setRefreshing(true);
    setProgress(0);

    try {
      const response = await fetch(`/api/clients/${clientId}/sections/${section}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Vernieuwen mislukt');

      const data = await response.json();
      const jobId = data.jobId;

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(pollInterval);
          setRefreshing(false);
          alert('Vernieuwen duurt langer dan verwacht. Probeer de pagina te verversen.');
          return;
        }

        try {
          const statusResponse = await fetch(
            `/api/clients/${clientId}/sections/${section}?jobId=${jobId}`
          );
          const job = await statusResponse.json();

          setProgress(job.progress || 0);

          if (job.status === 'done') {
            clearInterval(pollInterval);
            setRefreshing(false);
            router.refresh();
          } else if (job.status === 'error') {
            clearInterval(pollInterval);
            setRefreshing(false);
            alert(`Fout bij vernieuwen: ${job.error_message || 'Onbekende fout'}`);
          }
        } catch (error) {
          console.error('Poll error:', error);
        }
      }, 1000);
    } catch (error) {
      setRefreshing(false);
      alert(error instanceof Error ? error.message : 'Vernieuwen mislukt');
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className={className || 'inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-cyan-700/60 text-cyan-100 hover:bg-cyan-600 disabled:opacity-50 font-medium'}
      title={`↻ Vernieuw ${label || 'dit onderdeel'}`}
      aria-label={`Vernieuw ${label || 'dit onderdeel'}`}
    >
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? `${progress}%` : `↻ Vernieuw ${label || 'dit onderdeel'}`}
    </button>
  );
}
