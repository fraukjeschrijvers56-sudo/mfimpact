import { Users, AlertTriangle, Award, ClipboardCheck, ExternalLink } from 'lucide-react';
import { mergeKlanteisen, PEILDATUM, INDICATIEF_LABEL, type EisNiveau } from '@/lib/klanteisen';
import { Bronnen } from './parts';
import { SectionRefreshButton } from './section-refresh-button';
import { SectionMetadataBadge } from './section-metadata-badge';

interface Props {
  clientId: number;
  dossier: any;
}

export function KlanteisenSection({ clientId, dossier }: Props) {
  const onderzoek = dossier.onderzoek || dossier;
  const klanteisen = onderzoek.klanteisen || { klanttypen: [], concrete_tenders: [] };
  
  let sectionMetadata: any = dossier.section_metadata;
  if (typeof sectionMetadata === 'string') {
    try { sectionMetadata = JSON.parse(sectionMetadata); } catch { sectionMetadata = {}; }
  }
  sectionMetadata = sectionMetadata || {};
  const metadata = sectionMetadata.klanteisen;

  if (!klanteisen.klanttypen || klanteisen.klanttypen.length === 0) {
    return (
      <section id="klanteisen" className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Wat uw klanten gaan vragen</h2>
              <p className="text-sm text-emerald-200/70">Klanttype-specifieke eisen</p>
            </div>
          </div>
          <SectionRefreshButton clientId={clientId} section="klanteisen" label="Klanteisen ophalen" />
        </div>
        <p className="text-emerald-100/70 italic mb-3">Geen klanttypen gedetecteerd in onderzoek.</p>
        <SectionMetadataBadge section="klanteisen" metadata={metadata} />
      </section>
    );
  }

  const merged = mergeKlanteisen(
    klanteisen.klanttypen,
    klanteisen.concrete_tenders || [],
    dossier
  );

  function getNiveauBadge(niveau: EisNiveau) {
    if (niveau === 'KICK-OUT') {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-900/60 text-red-100 border border-red-600/50">KICK-OUT</span>;
    } else if (niveau === 'GUNNINGSVOORDEEL') {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-900/60 text-amber-100 border border-amber-600/50">GUNNINGSVOORDEEL</span>;
    } else {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-sky-900/60 text-sky-100 border border-sky-600/50">VRAGENLIJST/CONTRACTEIS</span>;
    }
  }

  function getStatusChip(status: 'aanwezig' | 'ontbreekt' | 'onbekend') {
    if (status === 'aanwezig') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900/60 text-green-200 border border-green-600/50">✓ Aanwezig</span>;
    } else if (status === 'ontbreekt') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/60 text-red-200 border border-red-600/50">✗ Ontbreekt</span>;
    } else {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/60 text-slate-200 border border-slate-500/50">? Onbekend</span>;
    }
  }

  const concreteTenders = klanteisen.concrete_tenders || [];

  return (
    <section id="klanteisen" className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Wat uw klanten gaan vragen</h2>
              <p className="text-sm text-emerald-200/70">
                Peildatum: {PEILDATUM} · <span className="italic">{INDICATIEF_LABEL}</span>
              </p>
            </div>
          </div>
          <div className="ml-16">
            <SectionMetadataBadge section="klanteisen" metadata={metadata} />
          </div>
        </div>
        <SectionRefreshButton clientId={clientId} section="klanteisen" label="Klanteisen ophalen" />
      </div>

      <div className="space-y-6">
        {merged.map((kt, idx) => (
          <div key={idx} className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-5">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white mb-2">{kt.klanttype}</h3>
              <p className="text-sm text-emerald-100/80 mb-2">
                <strong>Onderbouwing:</strong> {kt.detected.onderbouwing}
              </p>
              <Bronnen bronnen={kt.detected.bronnen} />
            </div>

            <div className="space-y-4">
              {kt.eisen.map((eisStatus, eisIdx) => (
                <div
                  key={eisIdx}
                  className="rounded-lg bg-emerald-800/40 border border-emerald-600/40 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-white">{eisStatus.eis.eis}</h4>
                        {getNiveauBadge(eisStatus.eis.niveau)}
                        {getStatusChip(eisStatus.status)}
                      </div>
                      <p className="text-sm text-emerald-100/70 mb-1">
                        <strong>Gevraagd door:</strong> {eisStatus.eis.gevraagd_door}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-emerald-100/90">
                    <strong>Toelichting:</strong> {eisStatus.eis.toelichting}
                  </p>

                  <div className={`p-3 rounded ${
                    eisStatus.status === 'ontbreekt' ? 'bg-red-950/50 border border-red-700/50' :
                    eisStatus.status === 'onbekend' ? 'bg-amber-950/50 border border-amber-700/50' :
                    'bg-green-950/50 border border-green-700/50'
                  }`}>
                    <p className={`text-sm font-medium ${
                      eisStatus.status === 'ontbreekt' ? 'text-red-100' :
                      eisStatus.status === 'onbekend' ? 'text-amber-100' :
                      'text-green-100'
                    }`}>
                      <strong>Gevolg:</strong> {eisStatus.gevolg}
                    </p>
                  </div>

                  {eisStatus.bewijs && (
                    <p className="text-xs text-emerald-200/70">
                      <strong>Bewijs:</strong> {eisStatus.bewijs}
                    </p>
                  )}

                  <p className="text-sm text-white">
                    <strong>Bewijsactie:</strong> {eisStatus.bewijsactie}
                  </p>

                  <a
                    href={eisStatus.eis.bron_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-300 hover:text-white underline underline-offset-2"
                  >
                    Bron: {new URL(eisStatus.eis.bron_url).hostname}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>

            {/* Concrete tenders for this klanttype */}
            {concreteTenders.filter((t: any) => {
              // Match tenders to klanttype by keywords
              const opdrachtgever = (t.opdrachtgever || '').toLowerCase();
              const klanttypeLC = kt.klanttype.toLowerCase();
              if (klanttypeLC.includes('rijksoverheid') && (opdrachtgever.includes('rijk') || opdrachtgever.includes('ministerie'))) return true;
              if (klanttypeLC.includes('infra') && (opdrachtgever.includes('rijkswaterstaat') || opdrachtgever.includes('prorail') || opdrachtgever.includes('provincie'))) return true;
              if (klanttypeLC.includes('gemeente') && opdrachtgever.includes('gemeente')) return true;
              return false;
            }).length > 0 && (
              <div className="mt-4 pt-4 border-t border-emerald-600/40">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Concrete tenders van deze klanttypen
                </h4>
                <div className="space-y-2">
                  {concreteTenders.filter((t: any) => {
                    const opdrachtgever = (t.opdrachtgever || '').toLowerCase();
                    const klanttypeLC = kt.klanttype.toLowerCase();
                    if (klanttypeLC.includes('rijksoverheid') && (opdrachtgever.includes('rijk') || opdrachtgever.includes('ministerie'))) return true;
                    if (klanttypeLC.includes('infra') && (opdrachtgever.includes('rijkswaterstaat') || opdrachtgever.includes('prorail') || opdrachtgever.includes('provincie'))) return true;
                    if (klanttypeLC.includes('gemeente') && opdrachtgever.includes('gemeente')) return true;
                    return false;
                  }).map((t: any, tIdx: number) => (
                    <div key={tIdx} className="rounded bg-emerald-800/30 border border-emerald-700/30 p-3">
                      <p className="text-sm text-white">
                        <strong>Concreet:</strong> In tender <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:text-white underline">{t.tender}</a> van {t.opdrachtgever} werd <strong>{t.eis}</strong> geëist ({t.niveau})
                        {t.datum && <> · {new Date(t.datum).toLocaleDateString('nl-NL')}</>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Unmatched tenders */}
        {concreteTenders.filter((t: any) => {
          const opdrachtgever = (t.opdrachtgever || '').toLowerCase();
          return !merged.some(kt => {
            const klanttypeLC = kt.klanttype.toLowerCase();
            if (klanttypeLC.includes('rijksoverheid') && (opdrachtgever.includes('rijk') || opdrachtgever.includes('ministerie'))) return true;
            if (klanttypeLC.includes('infra') && (opdrachtgever.includes('rijkswaterstaat') || opdrachtgever.includes('prorail') || opdrachtgever.includes('provincie'))) return true;
            if (klanttypeLC.includes('gemeente') && opdrachtgever.includes('gemeente')) return true;
            return false;
          });
        }).length > 0 && (
          <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-5">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Overige gevonden tenders
            </h3>
            <div className="space-y-2">
              {concreteTenders.filter((t: any) => {
                const opdrachtgever = (t.opdrachtgever || '').toLowerCase();
                return !merged.some(kt => {
                  const klanttypeLC = kt.klanttype.toLowerCase();
                  if (klanttypeLC.includes('rijksoverheid') && (opdrachtgever.includes('rijk') || opdrachtgever.includes('ministerie'))) return true;
                  if (klanttypeLC.includes('infra') && (opdrachtgever.includes('rijkswaterstaat') || opdrachtgever.includes('prorail') || opdrachtgever.includes('provincie'))) return true;
                  if (klanttypeLC.includes('gemeente') && opdrachtgever.includes('gemeente')) return true;
                  return false;
                });
              }).map((t: any, tIdx: number) => (
                <div key={tIdx} className="rounded bg-emerald-800/30 border border-emerald-700/30 p-3">
                  <p className="text-sm text-white">
                    <strong>Tender:</strong> <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:text-white underline">{t.tender}</a> van {t.opdrachtgever} eiste <strong>{t.eis}</strong> ({t.niveau})
                    {t.datum && <> · {new Date(t.datum).toLocaleDateString('nl-NL')}</>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
