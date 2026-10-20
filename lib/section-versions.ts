import crypto from 'crypto';
import { PEILDATUM as KLANTEISEN_PEILDATUM } from './klanteisen';

export const SECTION_NAMES = [
  'profiel',
  'vsme',
  'certificaten',
  'claimcheck',
  'klanteisen',
  'tenders',
] as const;

export type SectionName = typeof SECTION_NAMES[number];

// Version hashes for prompt files (update when prompts change)
const PROMPT_VERSIONS: Record<SectionName, string> = {
  profiel: 'v1.0',
  vsme: 'v1.0',
  certificaten: 'v1.0',
  claimcheck: 'v1.0',
  klanteisen: KLANTEISEN_PEILDATUM, // Use KB peildatum as version
  tenders: 'v1.0',
};

export function getPromptVersion(section: SectionName): string {
  return PROMPT_VERSIONS[section];
}

export function getSectionDisplayName(section: SectionName): string {
  const names: Record<SectionName, string> = {
    profiel: 'Profiel',
    vsme: 'VSME B1–B11',
    certificaten: 'Certificaten & Registers',
    claimcheck: 'Claimcheck',
    klanteisen: 'Wat uw klanten gaan vragen',
    tenders: 'Tenders & Projecten',
  };
  return names[section];
}

export interface SectionMetadata {
  updated_at: string;
  prompt_version: string;
  kb_version?: string;
  status: 'done' | 'error' | 'outdated';
  error_message?: string;
}

export function isSectionOutdated(
  metadata: SectionMetadata | undefined,
  section: SectionName
): boolean {
  if (!metadata) return true;
  const currentVersion = getPromptVersion(section);
  return metadata.prompt_version !== currentVersion;
}

export function createSectionMetadata(section: SectionName): SectionMetadata {
  return {
    updated_at: new Date().toISOString(),
    prompt_version: getPromptVersion(section),
    kb_version: section === 'klanteisen' ? KLANTEISEN_PEILDATUM : undefined,
    status: 'done',
  };
}

export function updateSectionMetadata(
  existingMetadata: Record<string, SectionMetadata> | undefined,
  section: SectionName,
  updates: Partial<SectionMetadata>
): Record<string, SectionMetadata> {
  const metadata = existingMetadata || {};
  metadata[section] = {
    ...(metadata[section] || createSectionMetadata(section)),
    ...updates,
    updated_at: new Date().toISOString(),
  };
  return metadata;
}
