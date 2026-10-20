'use client';

import { Info } from 'lucide-react';
import type { LegalSourceDisplay } from '@/lib/wetgeving-types';
import { ECGT_CLAIMCHECK } from '@/lib/ecgt-source';

const LINK_CLASS: Record<'dark' | 'light', string> = {
  dark: 'text-emerald-200 hover:text-white underline underline-offset-2',
  light: 'text-teal-700 hover:text-teal-900 underline underline-offset-2',
};

export function WetgevingLegalLinks({
  legal,
  variant = 'dark',
}: {
  legal?: LegalSourceDisplay | null;
  variant?: 'dark' | 'light';
}) {
  if (!legal) return null;
  const link = LINK_CLASS[variant];
  const muted = variant === 'dark' ? 'text-emerald-200/80' : 'text-gray-600';
  const showNote = Boolean(legal.opmerking) || legal.geverifieerd === false;

  return (
    <div className={`mt-1.5 space-y-0.5 text-xs ${muted}`}>
      {legal.normGeenWet && (
        <p className="font-semibold uppercase tracking-wide">norm, geen wet</p>
      )}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <a href={legal.urlArtikel} target="_blank" rel="noopener noreferrer" className={link}>
          Bron: {legal.bronLabel}
        </a>
        {legal.toelichtingUrl && (
          <a href={legal.toelichtingUrl} target="_blank" rel="noopener noreferrer" className={link}>
            Toelichting
          </a>
        )}
        {showNote && legal.opmerking && (
          <span
            className="inline-flex items-center text-current"
            title={legal.opmerking}
            aria-label={legal.opmerking}
          >
            <Info className="w-3.5 h-3.5" />
          </span>
        )}
      </p>
      {legal.wijzigingen.map((w) => (
        <p key={`${w.label}-${w.url}`}>
          Gewijzigd door:{' '}
          <a href={w.url} target="_blank" rel="noopener noreferrer" className={link}>
            {w.label}
          </a>
        </p>
      ))}
    </div>
  );
}

export function EcgtLegalBanner({ variant = 'light' }: { variant?: 'dark' | 'light' }) {
  const link = LINK_CLASS[variant];
  const box =
    variant === 'dark'
      ? 'rounded-lg border border-emerald-700/40 bg-emerald-900/40 p-3 text-sm text-emerald-50'
      : 'rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900';

  return (
    <div className={box}>
      <p>
        ECGT geldt vanaf <strong>{ECGT_CLAIMCHECK.appliesFrom}</strong> (Richtlijn 2024/825; NL BW 6:193g).
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        <a href={ECGT_CLAIMCHECK.urlArtikel} target="_blank" rel="noopener noreferrer" className={link}>
          Bron: {ECGT_CLAIMCHECK.bronLabel}
        </a>
        <a href={ECGT_CLAIMCHECK.toelichtingUrl} target="_blank" rel="noopener noreferrer" className={link}>
          Toelichting
        </a>
      </p>
    </div>
  );
}
