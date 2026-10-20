export type NextStep = {
  stap: string;
  eigenaar: string;
  termijn: string;
  checklist?: string[];
};

const BASE_INFO_CHECKLIST = [
  'Energiedata',
  'Personeelsdata',
  'Beleid',
  'Certificaten',
  'Klant- en tendereisen',
];

export const DEFAULT_NEXT_STEPS: NextStep[] = [
  { stap: 'Kennismakingsgesprek en vaststellen behoeften klant', eigenaar: 'beiden', termijn: 'week 1' },
  { stap: 'NDA tekenen', eigenaar: 'beiden', termijn: 'week 1' },
  {
    stap: 'Informatie delen door klant — checklist: energiedata, personeelsdata, beleid, certificaten, klant- en tendereisen',
    eigenaar: 'klant',
    termijn: 'week 2',
    checklist: BASE_INFO_CHECKLIST,
  },
  { stap: 'Scope en behoeften bepalen', eigenaar: 'MF Impact', termijn: 'week 2' },
  { stap: 'Offerte sturen', eigenaar: 'MF Impact', termijn: 'week 3' },
  { stap: 'Start traject en bewijspakket', eigenaar: 'beiden', termijn: 'na akkoord' },
];

/** Default next steps plus TE ONDERZOEKEN document requests. Does not touch saved/manual steps. */
export function getDefaultNextSteps(documentRequests: string[] = []): NextStep[] {
  const extra = documentRequests.filter(Boolean);
  const checklist = [...BASE_INFO_CHECKLIST];
  extra.forEach((item) => {
    if (!checklist.includes(item)) checklist.push(item);
  });
  return DEFAULT_NEXT_STEPS.map((step) =>
    step.checklist
      ? {
          ...step,
          stap: extra.length
            ? `Informatie delen door klant — Delen van informatie (${checklist.length} stukken)`
            : step.stap,
          checklist,
        }
      : step
  );
}
