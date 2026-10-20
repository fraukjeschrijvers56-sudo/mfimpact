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

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    // Simple toast implementation - could be enhanced with a toast library
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
      type === 'success' ? 'bg-green-600' : 
      type === 'error' ? 'bg-red-600' : 
      'bg-blue-600'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  };

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

      // Poll for completion (up to 5 minutes)
      let attempts = 0;
      const maxAttempts = 150; // 5 minutes (150 * 2s = 300s)
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
          clearInterval(pollInterval);
          setRefreshing(false);
          showToast('Vernieuwen duurt langer dan verwacht. De verwerking loopt mogelijk nog. Ververs de pagina over een minuut.', 'info');
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
            showToast('Vernieuwen voltooid!', 'success');
            router.refresh();
          } else if (job.status === 'error') {
            clearInterval(pollInterval);
            setRefreshing(false);
            showToast(`Fout: ${job.error_message || 'Onbekende fout'}`, 'error');
          }
        } catch (error) {
          console.error('Poll error:', error);
        }
      }, 2000); // Poll every 2 seconds
    } catch (error) {
      setRefreshing(false);
      showToast(error instanceof Error ? error.message : 'Vernieuwen mislukt', 'error');
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className={className || 'inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-cyan-700/60 text-cyan-100 hover:bg-cyan-600 disabled:opacity-50 font-medium'}
      title={`↻ ${label || 'dit onderdeel'}`}
      aria-label={`↻ ${label || 'dit onderdeel'}`}
    >
      <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? `${progress}%` : `↻ ${label || 'dit onderdeel'}`}
    </button>
  );
}
