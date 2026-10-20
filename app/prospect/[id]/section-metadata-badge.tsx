import { AlertTriangle, Clock } from 'lucide-react';
import { isSectionOutdated, type SectionName } from '@/lib/section-versions';
import type { SectionMetadata } from '@/lib/section-versions';

interface Props {
  section: SectionName;
  metadata?: SectionMetadata;
}

export function SectionMetadataBadge({ section, metadata }: Props) {
  if (!metadata) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-slate-400">
        <Clock className="w-3 h-3" />
        Nog niet gegenereerd
      </div>
    );
  }

  const isOutdated = isSectionOutdated(metadata, section);
  const updatedAt = new Date(metadata.updated_at);
  const formattedDate = updatedAt.toLocaleString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <div className="inline-flex items-center gap-3 text-xs flex-wrap">
      <span className="inline-flex items-center gap-1 text-emerald-200/70">
        <Clock className="w-3 h-3" />
        Laatst bijgewerkt: {formattedDate}
      </span>
      {isOutdated && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-900/60 text-amber-200 border border-amber-600/50">
          <AlertTriangle className="w-3 h-3" />
          Verouderd – vernieuwen?
        </span>
      )}
      {metadata.kb_version && (
        <span className="text-emerald-200/50">
          KB versie: {metadata.kb_version}
        </span>
      )}
    </div>
  );
}
