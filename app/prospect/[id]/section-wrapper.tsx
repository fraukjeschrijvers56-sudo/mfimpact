import { ReactNode } from 'react';
import { SectionRefreshButton } from './section-refresh-button';
import { SectionMetadataBadge } from './section-metadata-badge';
import type { SectionName } from '@/lib/section-versions';

interface Props {
  clientId: number;
  section: SectionName;
  sectionMetadata?: any;
  refreshLabel?: string;
  children: ReactNode;
  className?: string;
}

export function SectionWrapper({ clientId, section, sectionMetadata, refreshLabel, children, className }: Props) {
  const metadata = sectionMetadata?.[section];

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          {children}
        </div>
        <SectionRefreshButton 
          clientId={clientId} 
          section={section} 
          label={refreshLabel}
        />
      </div>
      <SectionMetadataBadge section={section} metadata={metadata} />
    </div>
  );
}
