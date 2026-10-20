import Link from 'next/link';
import MainLayout from '@/app/components/MainLayout';
import { checkAllThresholds, ESG_DISCLAIMER, ESG_REFERENCE_DATE } from '@/lib/esg-thresholds';
import { nl, isUnknown, labelize, hostOf, isUrl } from '@/lib/format';
import { extractDisplayValue, getDisplayText } from '@/lib/field-normalizer';
import {
  Building2, Globe, MapPin, FileText, ShieldCheck, Link2, Leaf, Award, Megaphone, AlertOctagon,
  Newspaper, Users, Briefcase, HelpCircle, Lightbulb, Scale, Layers, ListChecks, Search, Plus,
  Pencil, Trash2, RefreshCw,
} from 'lucide-react';
import { Section, Badge, Bronnen, Waarde, FieldGrid, FieldRow, Generic, SourceLink, Stat } from './parts';
import { ProspectActions } from './actions';
import { MvoRegisterCard } from './mvo-register-card';
import { LinkedInCard } from './linkedin-card';
import { KlanteisenSection } from './klanteisen-section';
import { VersionHistory } from './version-history';
import { SectionWrapper } from './section-wrapper';


const VSME_TITLES: Record<string, string> = {
  B1: 'Grondslag en opzet rapport', B2: 'Beleid en praktijken duurzaamheid', B3: 'Energie en broeikasgassen (scope 1 en 2)',
  B4: 'Verontreiniging', B5: 'Biodiversiteit', B6: 'Water', B7: 'Grondstoffen, circulariteit, afval', B8: 'Personeel',
  B9: 'Gezondheid en veiligheid', B10: 'Beloning, cao, opleiding', B11: 'Corruptie en omkoping',
};

const KNOWN_KEYS = ['samenvatting', 'profiel', 'ketenrisico', 'ketenrisico_signalen', 'vsme_basic', 'vsme', 'extra', 'certificaten', 'nieuws', 'tenders_projecten', 'tenders', 'personen', 'claims', 'gaten', 'kansen_gesprek', 'twijfelachtig', 'doorzochte_bronnen'];

function asArray(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => (x && typeof x === 'object' ? { naam: k, ...(x as any) } : { naam: k, waarde: x }));
  return [];
}

function fieldValue(f: any): any {
  if (f && typeof f === 'object' && !Array.isArray(f)) return f.waarde ?? f.value;
  return f;
}

export function ProspectView({ client }: { client: any }) {
  let dossier: any = client.dossier;
  if (typeof dossier === 'string') {
    try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
  }
  dossier = dossier && typeof dossier === 'object' ? dossier : {};
  // Older records stored the research dossier at top level
  const onderzoek: any = dossier.onderzoek ?? (dossier.profiel || dossier.vsme_basic ? dossier : null);
  const basis: any = dossier.basis || null;
  const mvoRegister: any = dossier.mvo_register || null;
  const webbronnen: Array<{ url: string; title?: string }> = Array.isArray(dossier.onderzoek_webbronnen) ? dossier.onderzoek_webbronnen : [];
  const paginas: string[] = Array.isArray(dossier.website?.paginas) ? dossier.website.paginas : [];
  const ruleClaims: any[] = Array.isArray(dossier.claimcheck) ? dossier.claimcheck : [];

  // Extract section metadata
  let sectionMetadata: any = client.section_metadata;
  if (typeof sectionMetadata === 'string') {
    try { sectionMetadata = JSON.parse(sectionMetadata); } catch { sectionMetadata = {}; }
  }
  sectionMetadata = sectionMetadata || {};

  const profiel = onderzoek?.profiel || {};
  const vsme = onderzoek?.vsme_basic || onderzoek?.vsme || null;
  const ketenrisico = onderzoek?.ketenrisico || onderzoek?.ketenrisico_signalen || null;
  const certificaten = asArray(onderzoek?.certificaten);
  const nieuws = asArray(onderzoek?.nieuws);
  const tenders = asArray(onderzoek?.tenders_projecten || onderzoek?.tenders);
  const personen = asArray(onderzoek?.personen);
  const claims = asArray(onderzoek?.claims);
  const gaten = asArray(onderzoek?.gaten);
  const kansen = Array.isArray(onderzoek?.kansen_gesprek) ? onderzoek.kansen_gesprek : [];
  const twijfel = asArray(onderzoek?.twijfelachtig);
  const doorzocht: string[] = Array.isArray(onderzoek?.doorzochte_bronnen) ? onderzoek.doorzochte_bronnen : [];
  const overig = onderzoek ? Object.keys(onderzoek).filter((k) => !KNOWN_KEYS.includes(k)) : [];

  const website = client.website_url || dossier.website?.url || null;
  // Use extractDisplayValue to get clean values from field objects
  const naam = !isUnknown(fieldValue(profiel.handelsnaam)) ? getDisplayText(profiel.handelsnaam) : getDisplayText(client.naam);
  const kvk = !isUnknown(fieldValue(profiel.kvk_nummer)) ? getDisplayText(profiel.kvk_nummer) : getDisplayText(client.kvk);
  const sector = !isUnknown(fieldValue(profiel.sector)) ? getDisplayText(profiel.sector) : getDisplayText(client.sector);
  const plaats = !isUnknown(fieldValue(profiel.hoofdvestiging)) ? getDisplayText(profiel.hoofdvestiging) : getDisplayText(client.plaats);
  const samenvatting = getDisplayText(onderzoek?.samenvatting || basis?.beschrijving);

  const allClaims = [...claims, ...ruleClaims];
  const roodCount = claims.filter((c) => String(c.beoordeling).toLowerCase() === 'rood').length + ruleClaims.filter((c) => c.color === 'red').length;
  const hoogGaten = gaten.filter((g) => String(g.prioriteit).toLowerCase() === 'hoog').length;
  const vsmeEntries = vsme && typeof vsme === 'object' ? Object.entries(vsme) : [];
  const vsmeAanwezig = vsmeEntries.filter(([, v]: any) => String(v?.status).toLowerCase() === 'aanwezig').length;

  const fteNum = typeof client.aantal_medewerkers === 'number' ? client.aantal_medewerkers : undefined;
  const omzetNum = typeof client.omzet === 'number' ? client.omzet : undefined;
  const products: string[] = Array.isArray(basis?.producten) ? basis.producten : [];
  const thresholds = checkAllThresholds({ aantal_medewerkers: fteNum, omzet: omzetNum, sector: client.sector || undefined, products });
  const thresholdList = [thresholds.csrd, thresholds.valueChainCap, thresholds.csddd, thresholds.euTaxonomy, thresholds.eudr, thresholds.cbam, thresholds.nlEnergySaving, thresholds.co2Prestatieladder];

  const nav = [
    ['profiel', 'Profiel'], ['klanteisen', 'Wat uw klanten gaan vragen'], ['vsme', 'VSME B1–B11'], ['ketenrisico', 'Ketenrisico & wetgeving'],
    ['certificaten', 'Certificaten'], ['claims', 'Claims'], ['gaten', 'Gaten'], ['nieuws', 'Nieuws & projecten'], ['personen', 'Personen'], ['bronnen', 'Bronnen'],
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* HERO */}
        <section className="rounded-2xl bg-emerald-950/90 border border-emerald-500/40 shadow-2xl backdrop-blur-xl p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">Prospectoverzicht</p>
              <h1 className="text-3xl md:text-4xl font-bold text-white break-words">{naam}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-emerald-50">
                {website && <span className="inline-flex items-center gap-1.5"><Globe className="w-4 h-4 text-emerald-300" /><SourceLink url={website} label={hostOf(website)} /></span>}
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-300" />{plaats}</span>
                <span className="inline-flex items-center gap-1.5"><Building2 className="w-4 h-4 text-emerald-300" />{sector}</span>
                <span className="inline-flex items-center gap-1.5"><FileText className="w-4 h-4 text-emerald-300" />KvK {kvk}</span>
                {!isUnknown(client.aantal_medewerkers) && <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-300" />{getDisplayText(client.aantal_medewerkers)} medewerkers</span>}
                {!isUnknown(client.omzet) && <span>Omzet € {getDisplayText(client.omzet)}</span>}
              </div>
              {!isUnknown(samenvatting) && <p className="text-lg leading-relaxed text-white/95 max-w-4xl">{samenvatting}</p>}
            </div>
            <div className="flex flex-col gap-4 self-start min-w-[280px]">
              <div className="flex flex-col gap-2">
                <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-400 text-emerald-950 font-semibold hover:bg-emerald-300">
                  <Plus className="w-4 h-4" /> Nieuwe prospect
                </Link>
                <ProspectActions client={client} />
              </div>
              <VersionHistory clientId={client.id} />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 mt-6">
            <Stat label="Webbronnen" value={webbronnen.length + doorzocht.length} />
            <Stat label="Pagina's gelezen" value={paginas.length} />
            <Stat label="VSME aanwezig" value={vsmeEntries.length ? `${vsmeAanwezig}/${vsmeEntries.length}` : 'onbekend'} tone="good" />
            <Stat label="Certificaten" value={certificaten.length || (basis?.certificaten?.length ?? 0)} />
            <Stat label="Rode claims" value={roodCount} tone={roodCount ? 'bad' : 'default'} />
            <Stat label="Gaten (hoog)" value={`${gaten.length} (${hoogGaten})`} tone={hoogGaten ? 'warn' : 'default'} />
            {mvoRegister && (
              <div className="rounded-xl bg-emerald-900/50 border border-emerald-600/40 p-3 flex flex-col items-center justify-center gap-1">
                <div className="flex items-center gap-1.5">
                  {mvoRegister.status === 'geregistreerd' && <img src="/mvo-good.png" alt="" className="w-5 h-5" />}
                  {mvoRegister.status === 'niet_gevonden' && <img src="/mvo-bad.png" alt="" className="w-5 h-5" />}
                  <span className={`text-xs font-semibold uppercase tracking-wider ${
                    mvoRegister.status === 'geregistreerd' ? 'text-green-300' :
                    mvoRegister.status === 'niet_gevonden' ? 'text-red-300' :
                    'text-amber-300'
                  }`}>MVO-register</span>
                </div>
                <p className={`text-lg font-bold ${
                  mvoRegister.status === 'geregistreerd' ? 'text-green-200' :
                  mvoRegister.status === 'niet_gevonden' ? 'text-red-200' :
                  'text-amber-200'
                }`}>
                  {mvoRegister.status === 'geregistreerd' ? '✓ Ja' :
                   mvoRegister.status === 'niet_gevonden' ? '✗ Nee' :
                   '? Onbekend'}
                </p>
              </div>
            )}
          </div>
          <nav className="flex flex-wrap gap-2 mt-6">
            {nav.map(([href, label]) => (
              <a key={href} href={`#${href}`} className="text-sm px-3 py-1.5 rounded-full bg-emerald-800/80 text-white hover:bg-emerald-700 border border-emerald-600/50">{label}</a>
            ))}
          </nav>
        </section>

        {!onderzoek && (
          <section className="rounded-2xl bg-amber-950/90 border border-amber-400/50 p-5 text-amber-50">
            <p className="font-semibold">Het diepteonderzoek is (nog) niet beschikbaar voor deze prospect.</p>
            <p className="text-sm mt-1">Hieronder staat alles uit de website-analyse. {dossier.onderzoek_fout ? `Reden: ${nl(dossier.onderzoek_fout)}` : ''}</p>
            {dossier.onderzoek_ruwe_tekst && (
              <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Ruwe onderzoekstekst tonen</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs bg-black/30 p-3 rounded-lg max-h-96 overflow-auto">{dossier.onderzoek_ruwe_tekst}</pre>
              </details>
            )}
          </section>
        )}

        {/* MVO-REGISTER */}
        <MvoRegisterCard clientId={client.id} data={mvoRegister} />

        {/* LINKEDIN */}
        <LinkedInCard clientId={client.id} data={profiel.linkedin} sectionMetadata={sectionMetadata} />

        {/* KLANTEISEN - merged with aanknopingspunten */}
        <KlanteisenSection clientId={client.id} dossier={dossier} />

        {/* PROFIEL */}
        <SectionWrapper clientId={client.id} section="profiel" sectionMetadata={sectionMetadata} refreshLabel="Profiel">
          <Section id="profiel" title="Bedrijfsprofiel" icon={<Building2 className="w-5 h-5" />}>
            {Object.keys(profiel).length > 0 ? (
              <>
                <FieldGrid obj={profiel} cols={3} skip={['omzet', 'aantal_medewerkers', 'balanstotaal', 'belangrijkste_klanten_referenties'].filter((k) => isUnknown(fieldValue(profiel[k])))} />
                {/* Show belangrijkste klanten/referenties prominently if present */}
                {!isUnknown(fieldValue(profiel.belangrijkste_klanten_referenties)) && (
                  <div className="mt-4 pt-4 border-t border-emerald-700/50">
                    <FieldRow label="Belangrijkste klanten / referenties" field={profiel.belangrijkste_klanten_referenties} />
                  </div>
                )}
              </>
            ) : <p className="text-slate-300 italic">Geen profiel uit het diepteonderzoek. <button className="text-emerald-300 hover:text-white underline font-medium">Nu genereren</button></p>}
          </Section>
        </SectionWrapper>

        {/* BASIS (website-analyse) */}
        {basis && (
          <Section id="basis" title="Website-analyse (snelle scan)" icon={<Search className="w-5 h-5" />}>
            <dl className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <FieldRow label="Naam" field={basis.naam} />
              <FieldRow label="KvK-nummer" field={{ waarde: basis.kvk, bronnen: basis.kvk_source ? [{ url: basis.kvk_source }] : [] }} />
              <FieldRow label="Sector" field={{ waarde: basis.sector, bronnen: basis.sector_source ? [{ url: basis.sector_source }] : [] }} />
              <FieldRow label="Producten / diensten" field={{ waarde: basis.producten, bronnen: basis.producten_source ? [{ url: basis.producten_source }] : [] }} />
              <FieldRow label="Belangrijkste afnemers" field={{ waarde: basis.belangrijkste_afnemers, bronnen: basis.afnemers_source ? [{ url: basis.afnemers_source }] : [] }} />
              <FieldRow label="Certificaten" field={{ waarde: basis.certificaten, bronnen: basis.certificaten_source ? [{ url: basis.certificaten_source }] : [] }} />
              {!isUnknown(basis.aantal_medewerkers) && <FieldRow label="Aantal medewerkers" field={{ waarde: basis.aantal_medewerkers, bronnen: basis.aantal_medewerkers_source ? [{ url: basis.aantal_medewerkers_source, citaat: basis.aantal_medewerkers_quote }] : [] }} />}
              {!isUnknown(basis.omzet) && <FieldRow label="Omzet" field={{ waarde: basis.omzet, bronnen: basis.omzet_source ? [{ url: basis.omzet_source }] : [] }} />}
              <FieldRow label="Betrouwbaarheid" field={{ waarde: basis.confidence }} />
            </dl>
            {!isUnknown(basis.beschrijving) && <p className="mt-4 text-white/95 leading-relaxed">{nl(basis.beschrijving)}</p>}
          </Section>
        )}

        {/* VSME */}
        <SectionWrapper clientId={client.id} section="vsme" sectionMetadata={sectionMetadata} refreshLabel="VSME & gaten">
          <Section id="vsme" title="VSME Basic B1–B11" icon={<ListChecks className="w-5 h-5" />} count={vsmeEntries.length}>
            {vsmeEntries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {vsmeEntries.map(([code, v]: any) => (
                  <div key={code} className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-white"><span className="text-emerald-300">{code}</span> {v?.titel || VSME_TITLES[code] || ''}</p>
                      <Badge value={v?.status} />
                    </div>
                    {v && typeof v === 'object' ? <>
                      <p className="text-sm text-emerald-50/95"><Waarde v={v.samenvatting ?? v.waarde} /></p>
                      <Bronnen bronnen={v.bronnen} />
                    </> : <Waarde v={v} />}
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-300 italic">onbekend. <button className="text-emerald-300 hover:text-white underline font-medium">Nu genereren</button></p>}
          </Section>
        </SectionWrapper>

        {/* KETENRISICO + WETGEVING */}
        <div id="ketenrisico" className="grid grid-cols-1 xl:grid-cols-2 gap-6 scroll-mt-24">
          <Section title="Ketenrisico-signalen" icon={<Link2 className="w-5 h-5" />}>
            {ketenrisico ? <FieldGrid obj={ketenrisico} /> : <p className="text-slate-300 italic">onbekend</p>}
          </Section>
          <Section title="Wetgeving & drempels (indicatief)" icon={<Scale className="w-5 h-5" />}>
            <p className="text-sm text-emerald-100/80 mb-3">MKB-categorie: <span className="font-semibold text-white">{nl(thresholds.mkbCategory.category)}</span> ({nl(thresholds.mkbCategory.reason)})</p>
            <ul className="space-y-2">
              {thresholdList.map((t, i) => (
                <li key={i} className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-white">{t.category}</span>
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">{t.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-emerald-50/90">{t.reasons.join(' · ')}</p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-emerald-200/70 mt-3">{ESG_DISCLAIMER} · peildatum {new Date(ESG_REFERENCE_DATE).toLocaleDateString('nl-NL')}</p>
          </Section>
        </div>

        {/* EXTRA */}
        {onderzoek?.extra && (
          <Section id="extra" title="Beleid, verslaglegging en CO2" icon={<Leaf className="w-5 h-5" />}>
            <FieldGrid obj={onderzoek.extra} cols={3} />
          </Section>
        )}

        {/* CERTIFICATEN */}
        <SectionWrapper clientId={client.id} section="certificaten" sectionMetadata={sectionMetadata} refreshLabel="Certificaten">
          <Section id="certificaten" title="Certificaten & keurmerken" icon={<Award className="w-5 h-5" />} count={certificaten.length}>
            {certificaten.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {certificaten.map((c: any, i: number) => {
                  // Support both old and new field names
                  const naam = c.naam ?? c.waarde;
                  const niveau = c.niveau_of_score ?? c.niveau;
                  const geldigTot = c.geldig_tot;
                  const platform = c.platform;
                  const verificatie = c.verificatie; // 'register' | 'zelf_gepubliceerd'
                  const status = c.status; // 'gevonden' | 'niet_gevonden_in_register'
                  const oudGeverifieerd = c.geverifieerd_in_register; // backwards compatibility
                  
                  // Determine verification badge
                  let verificationBadge = null;
                  if (verificatie === 'register' || oudGeverifieerd === 'ja') {
                    verificationBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/60 text-green-200 border border-green-600/50">in register geverifieerd</span>;
                  } else if (verificatie === 'zelf_gepubliceerd') {
                    verificationBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-900/60 text-amber-200 border border-amber-600/50">zelf gepubliceerd, niet geverifieerd</span>;
                  } else if (status === 'niet_gevonden_in_register') {
                    verificationBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-400">niet gevonden in register</span>;
                  } else if (oudGeverifieerd === 'nee') {
                    verificationBadge = <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-400">niet geverifieerd</span>;
                  }
                  
                  return (
                    <div key={i} className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-semibold text-white">{nl(naam)}</p>
                            {platform && <p className="text-xs text-emerald-200/70">{platform}</p>}
                          </div>
                          {verificationBadge}
                        </div>
                        {(niveau || geldigTot) && (
                          <p className="text-sm text-emerald-50/90">
                            {niveau && <>Niveau: {nl(niveau)}</>}
                            {niveau && geldigTot && <> · </>}
                            {geldigTot && <>Geldig tot: {nl(geldigTot)}</>}
                          </p>
                        )}
                        <Bronnen bronnen={c.bronnen} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : basis?.certificaten?.length ? <Waarde v={basis.certificaten} /> : <p className="text-slate-300 italic">Geen certificaten gevonden. <button className="text-emerald-300 hover:text-white underline font-medium">Nu genereren</button></p>}
          </Section>
        </SectionWrapper>

        {/* CLAIMS */}
        <SectionWrapper clientId={client.id} section="claimcheck" sectionMetadata={sectionMetadata} refreshLabel="Claims">
          <Section id="claims" title="Duurzaamheidsclaims (ECGT / ACM)" icon={<Megaphone className="w-5 h-5" />} count={allClaims.length}>
          {allClaims.length > 0 ? (
            <div className="space-y-3">
              {claims.map((c: any, i: number) => (
                <div key={`d${i}`} className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge value={c.beoordeling} />
                    {!isUnknown(c.type) && <span className="text-xs px-2 py-0.5 rounded bg-emerald-800 text-white">{nl(c.type)}</span>}
                    {isUrl(c.url) && <span className="text-xs"><SourceLink url={c.url} /></span>}
                  </div>
                  <p className="italic text-white">“{nl(c.citaat ?? c.claim)}”</p>
                  {!isUnknown(c.toelichting) && <p className="text-sm text-emerald-50/90 mt-1">{nl(c.toelichting)}</p>}
                  {!isUnknown(c.herschrijfvoorstel) && <p className="text-sm mt-2 rounded-lg bg-emerald-800/60 p-2"><span className="font-semibold text-emerald-300">Herschrijfvoorstel: </span>{nl(c.herschrijfvoorstel)}</p>}
                </div>
              ))}
              {ruleClaims.map((c: any, i: number) => (
                <div key={`r${i}`} className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge value={c.color} />
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-800 text-white">regelcheck: {nl(c.matched_rule)}</span>
                  </div>
                  <p className="italic text-white">“{nl(c.claim_text)}”</p>
                  <p className="text-sm text-emerald-50/90 mt-1">{nl(c.reason)}</p>
                  {!isUnknown(c.rewrite_suggestion) && <p className="text-sm mt-2 rounded-lg bg-emerald-800/60 p-2"><span className="font-semibold text-emerald-300">Herschrijfvoorstel: </span>{nl(c.rewrite_suggestion)}</p>}
                  {!isUnknown(c.legal_basis) && <p className="text-xs text-emerald-200/70 mt-1">Basis: {nl(c.legal_basis)}</p>}
                </div>
              ))}
            </div>
          ) : <p className="text-slate-300 italic">Geen milieu- of duurzaamheidsclaims gevonden. <button className="text-emerald-300 hover:text-white underline font-medium">Nu genereren</button></p>}
          </Section>
        </SectionWrapper>

        {/* GATEN */}
        <SectionWrapper clientId={client.id} section="vsme" sectionMetadata={sectionMetadata} refreshLabel="Gaten">
          <Section id="gaten" title="Gaten en bewijsacties" icon={<AlertOctagon className="w-5 h-5" />} count={gaten.length}>
            {gaten.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[...gaten].sort((a, b) => ['hoog', 'middel', 'laag'].indexOf(String(a.prioriteit).toLowerCase()) - ['hoog', 'middel', 'laag'].indexOf(String(b.prioriteit).toLowerCase())).map((g: any, i: number) => (
                  <div key={i} className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-white">{nl(g.onderdeel ?? g.naam)}</p>
                      <Badge value={g.prioriteit} />
                    </div>
                    {!isUnknown(g.waarom) && <p className="text-sm text-emerald-50/90">{nl(g.waarom)}</p>}
                    {!isUnknown(g.bewijsactie) && <p className="text-sm mt-2 rounded-lg bg-emerald-800/60 p-2"><span className="font-semibold text-emerald-300">Bewijsactie: </span>{nl(g.bewijsactie)}</p>}
                  </div>
                ))}
              </div>
            ) : <p className="text-slate-300 italic">onbekend. <button className="text-emerald-300 hover:text-white underline font-medium">Nu genereren</button></p>}
          </Section>
        </SectionWrapper>

        {/* NIEUWS + TENDERS */}
        <div id="nieuws" className="grid grid-cols-1 xl:grid-cols-2 gap-6 scroll-mt-24">
          <Section title="Nieuws" icon={<Newspaper className="w-5 h-5" />} count={nieuws.length}>
            {nieuws.length > 0 ? (
              <ul className="space-y-3">
                {nieuws.map((n: any, i: number) => (
                  <li key={i} className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 p-3">
                    <p className="font-semibold text-white">{isUrl(n.url) ? <a href={n.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{nl(n.titel)}</a> : nl(n.titel)}</p>
                    <p className="text-xs text-emerald-200/80">{nl(n.datum)}{isUrl(n.url) ? ` · ${hostOf(n.url)}` : ''}</p>
                    {!isUnknown(n.samenvatting) && <p className="text-sm text-emerald-50/90 mt-1">{nl(n.samenvatting)}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-slate-300 italic">Geen nieuws gevonden.</p>}
          </Section>
          <SectionWrapper clientId={client.id} section="tenders" sectionMetadata={sectionMetadata} refreshLabel="Tenders">
            <Section title="Tenders & projecten" icon={<Briefcase className="w-5 h-5" />} count={tenders.length}>
              {tenders.length > 0 ? (
                <ul className="space-y-3">
                  {tenders.map((t: any, i: number) => (
                    <li key={i} className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 p-3">
                      <p className="font-semibold text-white">{nl(t.titel ?? t.naam)}</p>
                      <p className="text-sm text-emerald-50/90">Opdrachtgever: {nl(t.opdrachtgever)} · {nl(t.datum)}</p>
                      {isUrl(t.url) && <p className="text-xs mt-1"><SourceLink url={t.url} /></p>}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-slate-300 italic">Geen tenders of projecten gevonden. <button className="text-emerald-300 hover:text-white underline font-medium">Nu genereren</button></p>}
            </Section>
          </SectionWrapper>
        </div>

        {/* PERSONEN */}
        <Section id="personen" title="Personen" icon={<Users className="w-5 h-5" />} count={personen.length}>
          {personen.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {personen.map((p: any, i: number) => (
                <div key={i} className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-3">
                  <p className="font-semibold text-white">{nl(p.naam)}</p>
                  <p className="text-sm text-emerald-50/90">{nl(p.functie)}</p>
                  {isUrl(p.url) && <p className="text-xs mt-1"><SourceLink url={p.url} /></p>}
                </div>
              ))}
            </div>
          ) : <p className="text-slate-300 italic">Geen personen gevonden.</p>}
        </Section>

        {/* TWIJFELACHTIG */}
        {twijfel.length > 0 && (
          <Section id="twijfel" title="Twijfelachtig (niet meegenomen)" icon={<HelpCircle className="w-5 h-5" />} count={twijfel.length}>
            <ul className="space-y-3">
              {twijfel.map((t: any, i: number) => (
                <li key={i} className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 p-3">
                  <p className="font-semibold text-white">{nl(t.gegeven ?? t.naam)}</p>
                  <p className="text-sm text-emerald-50/90">{nl(t.reden)}</p>
                  <Bronnen bronnen={t.bronnen} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* OVERIG */}
        {overig.length > 0 && (
          <Section id="overig" title="Overige gevonden gegevens" icon={<Layers className="w-5 h-5" />}>
            <div className="space-y-4">
              {overig.map((k) => (
                <div key={k}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-300 mb-1">{labelize(k)}</h3>
                  <Generic value={onderzoek[k]} />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* BRONNEN */}
        <Section id="bronnen" title="Alle bronnen" icon={<ShieldCheck className="w-5 h-5" />} count={webbronnen.length + doorzocht.length + paginas.length}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-white mb-2">Geciteerd door het onderzoek ({webbronnen.length})</h3>
              <ul className="space-y-1">{webbronnen.map((b, i) => <li key={i}><SourceLink url={b.url} label={b.title || hostOf(b.url)} /></li>)}</ul>
              {webbronnen.length === 0 && <p className="text-slate-300 italic">onbekend</p>}
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Doorzochte bronnen ({doorzocht.length})</h3>
              <ul className="space-y-1">{doorzocht.map((u, i) => <li key={i}>{isUrl(u) ? <SourceLink url={u} label={u} /> : nl(u)}</li>)}</ul>
              {doorzocht.length === 0 && <p className="text-slate-300 italic">onbekend</p>}
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Gelezen websitepagina&apos;s ({paginas.length})</h3>
              <ul className="space-y-1">{paginas.map((u, i) => <li key={i}><SourceLink url={u} label={u} /></li>)}</ul>
              {paginas.length === 0 && <p className="text-slate-300 italic">onbekend</p>}
            </div>
          </div>
          {dossier.web_research_tekst && (
            <details className="mt-5">
              <summary className="cursor-pointer font-semibold text-white">Webonderzoek (volledige tekst)</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-emerald-50 bg-black/30 p-3 rounded-lg max-h-[32rem] overflow-auto">{String(dossier.web_research_tekst).replace(/\bunknown\b/gi, 'onbekend')}</pre>
            </details>
          )}
          <p className="text-xs text-emerald-200/70 mt-4">
            {dossier.onderzoek_op ? `Onderzocht op ${new Date(dossier.onderzoek_op).toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })}` : ''}
            {dossier.onderzoek_model ? ` · model ${dossier.onderzoek_model}` : ''} · {ESG_DISCLAIMER}
          </p>
        </Section>
      </div>
    </MainLayout>
  );
}
