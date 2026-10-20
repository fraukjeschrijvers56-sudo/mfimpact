/**
 * Klanteisen Knowledge Base
 * Indicatief – controleer aanbestedingsstukken
 */

export const PEILDATUM = '2026-10-20';
export const INDICATIEF_LABEL = 'Indicatief – controleer aanbestedingsstukken';

export type EisNiveau = 'KICK-OUT' | 'GUNNINGSVOORDEEL' | 'VRAGENLIJST/CONTRACTEIS';

export interface KlantEis {
  id: string;
  klanttype: string;
  eis: string;
  gevraagd_door: string;
  niveau: EisNiveau;
  toelichting: string;
  bron_url: string;
  scan_koppeling: string; // which dossier field proves it
}

export const KLANTEISEN_KB: KlantEis[] = [
  // Rijksoverheid & ZBO's
  {
    id: 'rijk-isv',
    klanttype: 'Rijksoverheid & ZBO\'s',
    eis: 'ISV Internationale Sociale Voorwaarden',
    gevraagd_door: 'Rijksoverheid bij risicocategorieën (textiel, ICT-hardware, natuursteen, voeding, bouwmaterialen)',
    niveau: 'KICK-OUT',
    toelichting: 'Ketenverantwoordelijkheid en OESO due diligence + risicoanalyse verplicht. Niet accepteren = uitsluiting.',
    bron_url: 'https://www.pianoo.nl/nl/themas/maatschappelijk-verantwoord-inkopen-duurzaam-inkopen-mvi/internationale-sociale-voorwaarden-isv',
    scan_koppeling: 'extra.gedragscode_leveranciers,ketenrisico',
  },
  {
    id: 'rijk-mvi-minimum',
    klanttype: 'Rijksoverheid & ZBO\'s',
    eis: 'MVI-criteria minimumeisen',
    gevraagd_door: 'Rijksoverheid',
    niveau: 'KICK-OUT',
    toelichting: 'Minimumeisen uit mvicriteria.nl zijn verplicht; niet voldoen = uitsluiting.',
    bron_url: 'https://www.mvicriteria.nl/',
    scan_koppeling: 'vsme_basic,certificaten',
  },
  {
    id: 'rijk-mvi-gunning',
    klanttype: 'Rijksoverheid & ZBO\'s',
    eis: 'MVI-criteria gunningsvoordeel',
    gevraagd_door: 'Rijksoverheid',
    niveau: 'GUNNINGSVOORDEEL',
    toelichting: 'Overige MVI-gunningscriteria geven punten bij gunning.',
    bron_url: 'https://www.mvicriteria.nl/',
    scan_koppeling: 'vsme_basic,certificaten',
  },
  {
    id: 'rijk-uea',
    klanttype: 'Rijksoverheid & ZBO\'s',
    eis: 'Uitsluitingsgronden Aanbestedingswet (UEA) + Gedragsverklaring Aanbesteden',
    gevraagd_door: 'Rijksoverheid',
    niveau: 'KICK-OUT',
    toelichting: 'Integriteit en governance: veroordeling of overtreding = uitsluiting.',
    bron_url: 'https://www.pianoo.nl/nl/inkoopproces/fase-1-voorbereiden/uitsluitingsgronden',
    scan_koppeling: 'vsme_basic.B11',
  },

  // Infra/GWW/bouw
  {
    id: 'infra-co2ladder',
    klanttype: 'Infra/GWW/bouw (RWS, ProRail, provincies, gemeenten, waterschappen)',
    eis: 'CO2-Prestatieladder',
    gevraagd_door: 'RWS, ProRail, provincies, gemeenten, waterschappen',
    niveau: 'GUNNINGSVOORDEEL',
    toelichting: 'Fictieve korting op inschrijving (per niveau). Soms KICK-OUT als minimumniveau geëist.',
    bron_url: 'https://www.co2-prestatieladder.nl/',
    scan_koppeling: 'certificaten[platform=SKAO/CO2-Prestatieladder]',
  },
  {
    id: 'infra-mki',
    klanttype: 'Infra/GWW/bouw (RWS, ProRail, provincies, gemeenten, waterschappen)',
    eis: 'MKI/DuboCalc',
    gevraagd_door: 'Opdrachtgevers infra/bouw',
    niveau: 'GUNNINGSVOORDEEL',
    toelichting: 'Milieu Kosten Indicator voor bouwmaterialen geeft gunningsvoordeel.',
    bron_url: 'https://www.rivm.nl/milieubelasting-bouwproducten',
    scan_koppeling: 'extra.co2_footprint',
  },
  {
    id: 'infra-social-return',
    klanttype: 'Infra/GWW/bouw (RWS, ProRail, provincies, gemeenten, waterschappen)',
    eis: 'Social return (vaak 5% loonsom)',
    gevraagd_door: 'Opdrachtgevers infra/bouw',
    niveau: 'VRAGENLIJST/CONTRACTEIS',
    toelichting: 'Contracteis: percentage van loonsom aan mensen met arbeidsbelemmeringen.',
    bron_url: 'https://www.pianoo.nl/nl/themas/maatschappelijk-verantwoord-inkopen-duurzaam-inkopen-mvi/social-return',
    scan_koppeling: 'vsme_basic.B8,extra.sociaal_beleid',
  },
  {
    id: 'infra-iso-vca',
    klanttype: 'Infra/GWW/bouw (RWS, ProRail, provincies, gemeenten, waterschappen)',
    eis: 'ISO 14001/9001, VCA, VGM geschiktheidseis',
    gevraagd_door: 'Opdrachtgevers infra/bouw',
    niveau: 'KICK-OUT',
    toelichting: 'Kwaliteit, veiligheid, milieu certificering als geschiktheidseis.',
    bron_url: 'https://www.pianoo.nl/nl/inkoopproces/fase-1-voorbereiden/geschiktheidseisen',
    scan_koppeling: 'certificaten[ISO 14001,ISO 9001,VCA]',
  },

  // Gemeenten/provincies algemeen
  {
    id: 'gemeente-mvi',
    klanttype: 'Gemeenten/provincies algemeen',
    eis: 'MVI-beleid, circulaire criteria, Inkopen met Impact',
    gevraagd_door: 'Gemeenten en provincies',
    niveau: 'GUNNINGSVOORDEEL',
    toelichting: 'Lokaal MVI-beleid, circulariteit en sociale impact geven gunningspunten.',
    bron_url: 'https://www.pianoo.nl/nl/themas/maatschappelijk-verantwoord-inkopen-duurzaam-inkopen-mvi',
    scan_koppeling: 'vsme_basic.B7,extra',
  },
  {
    id: 'gemeente-social-return',
    klanttype: 'Gemeenten/provincies algemeen',
    eis: 'Social return',
    gevraagd_door: 'Gemeenten en provincies',
    niveau: 'VRAGENLIJST/CONTRACTEIS',
    toelichting: 'Contracteis: lokale werkgelegenheid en arbeidsparticipatie.',
    bron_url: 'https://www.pianoo.nl/nl/themas/maatschappelijk-verantwoord-inkopen-duurzaam-inkopen-mvi/social-return',
    scan_koppeling: 'vsme_basic.B8,extra.sociaal_beleid',
  },

  // Grote private klanten
  {
    id: 'private-coc',
    klanttype: 'Grote private klanten (CSRD/CSDDD-plichtig of internationaal)',
    eis: 'Supplier Code of Conduct tekenen',
    gevraagd_door: 'Grote ondernemingen',
    niveau: 'VRAGENLIJST/CONTRACTEIS',
    toelichting: 'Weigering = klant kwijt. Gedragscode met ESG-eisen ondertekenen is voorwaarde voor levering.',
    bron_url: 'https://www.pianoo.nl/nl/themas/maatschappelijk-verantwoord-inkopen-duurzaam-inkopen-mvi/ketenverantwoordelijkheid',
    scan_koppeling: 'extra.gedragscode_leveranciers',
  },
  {
    id: 'private-vsme',
    klanttype: 'Grote private klanten (CSRD/CSDDD-plichtig of internationaal)',
    eis: 'ESG-vragenlijst (VSME-data)',
    gevraagd_door: 'Grote ondernemingen',
    niveau: 'VRAGENLIJST/CONTRACTEIS',
    toelichting: 'VSME-data verplicht voor value chain cap. Maximale VSME-vragenlijst: CO2 scope 1+2, personeel, veiligheid.',
    bron_url: 'https://www.efrag.org/en/activities/VSME',
    scan_koppeling: 'vsme_basic',
  },
  {
    id: 'private-ecovadis',
    klanttype: 'Grote private klanten (CSRD/CSDDD-plichtig of internationaal)',
    eis: 'EcoVadis-beoordeling/minimumscore',
    gevraagd_door: 'Grote ondernemingen',
    niveau: 'KICK-OUT',
    toelichting: 'Bij onboarding soms EcoVadis-minimumscore geëist (bijv. Bronze of hoger).',
    bron_url: 'https://ecovadis.com/',
    scan_koppeling: 'certificaten[platform=EcoVadis]',
  },
  {
    id: 'private-sbti',
    klanttype: 'Grote private klanten (CSRD/CSDDD-plichtig of internationaal)',
    eis: 'SBTi-doelen of verzoek',
    gevraagd_door: 'Grote ondernemingen',
    niveau: 'GUNNINGSVOORDEEL',
    toelichting: 'Science Based Targets initiative: aantoonbaar klimaatdoel geeft voorkeur.',
    bron_url: 'https://sciencebasedtargets.org/',
    scan_koppeling: 'certificaten[platform=SBTi],extra.co2_doelen',
  },
  {
    id: 'private-bank-esg',
    klanttype: 'Grote private klanten (CSRD/CSDDD-plichtig of internationaal)',
    eis: 'Banken/financiers ESG-vragenlijst bij krediet',
    gevraagd_door: 'Banken en financiers',
    niveau: 'VRAGENLIJST/CONTRACTEIS',
    toelichting: 'ESG-data verplicht bij kredietaanvraag.',
    bron_url: 'https://www.nvb.nl/themas/duurzaamheid/',
    scan_koppeling: 'vsme_basic',
  },

  // Consumentenmarkt
  {
    id: 'consumer-claims',
    klanttype: 'Consumentenmarkt',
    eis: 'Groene claims ECGT + ACM Leidraad',
    gevraagd_door: 'ACM (handhaving)',
    niveau: 'KICK-OUT',
    toelichting: 'WETTELIJK risico sinds 27-09-2026: ondeugdelijke groene claim = boete. Link naar claimcheck.',
    bron_url: 'https://www.acm.nl/nl/publicaties/leidraad-duurzaamheidsclaims',
    scan_koppeling: 'claims',
  },
];

export interface DetectedKlanttype {
  type: string;
  onderbouwing: string;
  bronnen: Array<{ url: string; citaat: string }>;
}

export interface ConcreteTender {
  opdrachtgever: string;
  tender: string;
  eis: string;
  niveau: string;
  url: string;
  datum: string | null;
}

export interface KlanteisStatus {
  eis: KlantEis;
  status: 'aanwezig' | 'ontbreekt' | 'onbekend';
  bewijs?: string;
  bewijsactie: string;
  gevolg: string;
}

export interface KlanttypeEisen {
  klanttype: string;
  detected: DetectedKlanttype;
  eisen: KlanteisStatus[];
}

/**
 * Merge KB eisen with prospect dossier to compute status
 */
export function mergeKlanteisen(
  detectedKlanttypen: DetectedKlanttype[],
  concreteTenders: ConcreteTender[],
  dossier: any
): KlanttypeEisen[] {
  const result: KlanttypeEisen[] = [];

  for (const detected of detectedKlanttypen) {
    const kbEisen = KLANTEISEN_KB.filter((e) => e.klanttype === detected.type);
    const eisenStatuses: KlanteisStatus[] = [];

    for (const eis of kbEisen) {
      const status = computeEisStatus(eis, dossier);
      eisenStatuses.push(status);
    }

    result.push({
      klanttype: detected.type,
      detected,
      eisen: eisenStatuses,
    });
  }

  return result;
}

function computeEisStatus(eis: KlantEis, dossier: any): KlanteisStatus {
  const koppeling = eis.scan_koppeling;
  let status: 'aanwezig' | 'ontbreekt' | 'onbekend' = 'onbekend';
  let bewijs = '';

  const onderzoek = dossier.onderzoek || dossier;
  const certificaten = Array.isArray(onderzoek.certificaten) ? onderzoek.certificaten : [];
  const vsme = onderzoek.vsme_basic || onderzoek.vsme || {};
  const extra = onderzoek.extra || {};
  const mvoRegister = dossier.mvo_register || null;

  // Parse scan_koppeling and check dossier
  if (koppeling.includes('certificaten')) {
    // e.g. certificaten[platform=EcoVadis] or certificaten[ISO 14001]
    const match = koppeling.match(/certificaten\[(.+?)\]/);
    if (match) {
      const query = match[1];
      const found = certificaten.some((c: any) => {
        const naam = c.naam || c.platform || '';
        const platform = c.platform || '';
        return naam.includes(query) || platform.includes(query) || query.split(',').some((q: string) => naam.includes(q.trim()));
      });
      if (found) {
        status = 'aanwezig';
        bewijs = `Certificaat gevonden: ${query}`;
      } else {
        status = 'ontbreekt';
      }
    }
  } else if (koppeling.includes('vsme_basic')) {
    // e.g. vsme_basic.B8 or vsme_basic
    const moduleMatch = koppeling.match(/vsme_basic\.([A-Z0-9]+)/);
    if (moduleMatch) {
      const module = moduleMatch[1];
      if (vsme[module]?.status === 'aanwezig') {
        status = 'aanwezig';
        bewijs = `VSME ${module} aanwezig`;
      } else {
        status = 'ontbreekt';
      }
    } else {
      // Check overall VSME coverage
      const modules = Object.keys(vsme).filter((k) => k.startsWith('B'));
      const aanwezig = modules.filter((k) => vsme[k]?.status === 'aanwezig').length;
      if (aanwezig >= modules.length / 2) {
        status = 'aanwezig';
        bewijs = `VSME ${aanwezig}/${modules.length} modules aanwezig`;
      } else if (aanwezig > 0) {
        status = 'onbekend';
        bewijs = `VSME ${aanwezig}/${modules.length} modules aanwezig (onvoldoende)`;
      } else {
        status = 'ontbreekt';
      }
    }
  } else if (koppeling.includes('extra.')) {
    const field = koppeling.replace('extra.', '');
    const value = extra[field];
    if (value && value.waarde && value.waarde !== 'onbekend' && value.waarde !== 'None') {
      status = 'aanwezig';
      bewijs = `${field} aanwezig`;
    } else if (value && value.status === 'onbekend') {
      status = 'onbekend';
    } else {
      status = 'ontbreekt';
    }
  } else if (koppeling.includes('ketenrisico')) {
    const ketenrisico = onderzoek.ketenrisico || onderzoek.ketenrisico_signalen;
    if (ketenrisico) {
      status = 'aanwezig';
      bewijs = 'Ketenrisico-analyse aanwezig';
    } else {
      status = 'ontbreekt';
    }
  } else if (koppeling.includes('claims')) {
    const claims = Array.isArray(onderzoek.claims) ? onderzoek.claims : [];
    if (claims.length > 0) {
      const roodCount = claims.filter((c: any) => c.beoordeling === 'rood').length;
      if (roodCount > 0) {
        status = 'ontbreekt';
        bewijs = `${roodCount} rode claims gevonden (risico)`;
      } else {
        status = 'aanwezig';
        bewijs = `${claims.length} claims gecontroleerd`;
      }
    } else {
      status = 'onbekend';
    }
  }

  // Construct gevolg sentence
  const gevolg = constructGevolgSentence(eis, status);

  // Construct bewijsactie
  let bewijsactie = '';
  if (status === 'ontbreekt') {
    bewijsactie = `Actie: ${eis.eis} realiseren en documenteren`;
  } else if (status === 'onbekend') {
    bewijsactie = `Actie: onderzoek of ${eis.eis} aanwezig is en documenteer`;
  } else {
    bewijsactie = 'Aanwezig: zorg dat bewijs up-to-date is';
  }

  return {
    eis,
    status,
    bewijs,
    bewijsactie,
    gevolg,
  };
}

function constructGevolgSentence(eis: KlantEis, status: 'aanwezig' | 'ontbreekt' | 'onbekend'): string {
  const klanttype = eis.klanttype;
  const eisNaam = eis.eis;
  const niveau = eis.niveau;

  let gevolg = '';
  if (status === 'ontbreekt') {
    if (niveau === 'KICK-OUT') {
      gevolg = `${klanttype} eist ${eisNaam}; u heeft dat niet; gevolg: uitsluiting van aanbesteding.`;
    } else if (niveau === 'GUNNINGSVOORDEEL') {
      gevolg = `${klanttype} waardeert ${eisNaam}; u heeft dat niet; gevolg: minder kans op gunning.`;
    } else {
      gevolg = `${klanttype} verwacht ${eisNaam}; u heeft dat niet; gevolg: contract/onboarding vertraagd of geweigerd.`;
    }
  } else if (status === 'onbekend') {
    gevolg = `${klanttype} eist ${eisNaam}; onbekend of u dit heeft; gevolg: risico op uitsluiting of vertraging.`;
  } else {
    gevolg = `${klanttype} eist ${eisNaam}; u heeft dit; gevolg: voldoet aan eis.`;
  }

  return gevolg;
}
