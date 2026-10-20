import { Users, AlertTriangle, Award, ClipboardCheck, ExternalLink, Lightbulb } from 'lucide-react';
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
  const klanteisen = onderzoek.klanteisen || { 
    klanttypen: [], 
    concrete_tenders: [], 
    tendertreffers: [],
    eisen: [],
    aanknopingspunten: [],
  };
  
  let sectionMetadata: any = dossier.section_metadata;
  if (typeof sectionMetadata === 'string') {
    try { sectionMetadata = JSON.parse(sectionMetadata); } catch { sectionMetadata = {}; }
  }
  sectionMetadata = sectionMetadata || {};
  const metadata = sectionMetadata.klanteisen;

  // Use new structure if available, fall back to old
  const tendertreffers = klanteisen.tendertreffers || klanteisen.concrete_tenders || [];
  const eisen = klanteisen.eisen || [];
  const aanknopingspunten = klanteisen.aanknopingspunten || [];
  const hasNewStructure = eisen.length > 0 || aanknopingspunten.length > 0;
  
  // For backwards compat: merge old structure
  const merged = hasNewStructure ? [] : mergeKlanteisen(
    klanteisen.klanttypen || [],
    klanteisen.concrete_tenders || [],
    dossier
  );

  // Empty state
  if (!hasNewStructure && (!klanteisen.klanttypen || klanteisen.klanttypen.length === 0) && eisen.length === 0) {
    return (
      <section id="klanteisen" className="scroll-mt-24 rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Aanknopingspunten voor het gesprek</h2>
              <p className="text-sm text-emerald-200/70">Wat uw klanten gaan vragen · Peildatum: {PEILDATUM}</p>
            </div>
          </div>
          <SectionRefreshButton clientId={clientId} section="klanteisen" label="Klanteisen ophalen" />
        </div>
        <p className="text-emerald-100/70 italic mb-3">
          Nog niet geanalyseerd. Klik op '↻ Vernieuw Klanteisen ophalen' om klanttypen te detecteren en eisen te matchen.
        </p>
        <SectionMetadataBadge section="klanteisen" metadata={metadata} />
      </section>
    );
  }

  function getNiveauBadge(niveau: string) {
    if (niveau === 'KICK-OUT') {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-900/60 text-red-100 border border-red-600/50">KICK-OUT</span>;
    } else if (niveau === 'GUNNINGSVOORDEEL') {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-amber-900/60 text-amber-100 border border-amber-600/50">GUNNINGSVOORDEEL</span>;
    } else if (niveau.includes('VRAGENLIJST') || niveau.includes('CONTRACTEIS')) {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-sky-900/60 text-sky-100 border border-sky-600/50">CONTRACTEIS/VRAGENLIJST</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-slate-700/60 text-slate-200 border border-slate-600/50">{niveau}</span>;
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
  
  function getUrgentieBadge(urgentie: string) {
    if (urgentie === 'hoog') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-900/60 text-red-100 border border-red-600/50">HOOG</span>;
    } else if (urgentie === 'middel') {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-900/60 text-amber-100 border border-amber-600/50">MIDDEL</span>;
    } else {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-800/60 text-emerald-100 border border-emerald-600/50">LAAG</span>;
    }
  }

  // Sort eisen: KICK-OUT ontbreekt first, then GUNNINGSVOORDEEL ontbreekt, then rest
  const sortedEisen = [...eisen].sort((a: any, b: any) => {
    const scoreA = (a.niveau === 'KICK-OUT' && a.status === 'ontbreekt') ? 0 :
                   (a.niveau === 'GUNNINGSVOORDEEL' && a.status === 'ontbreekt') ? 1 :
                   (a.status === 'ontbreekt') ? 2 : 3;
    const scoreB = (b.niveau === 'KICK-OUT' && b.status === 'ontbreekt') ? 0 :
                   (b.niveau === 'GUNNINGSVOORDEEL' && b.status === 'ontbreekt') ? 1 :
                   (b.status === 'ontbreekt') ? 2 : 3;
    return scoreA - scoreB;
  });
  
  // Sort aanknopingspunten: urgentie hoog first
  const sortedAanknopingspunten = [...aanknopingspunten].sort((a: any, b: any) => {
    const urgentieOrder: Record<string, number> = { hoog: 0, middel: 1, laag: 2 };
    return (urgentieOrder[a.urgentie] || 3) - (urgentieOrder[b.urgentie] || 3);
  });

  return (
    <section id="klanteisen" className="scroll-mt-24 rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-emerald-800/50 border border-emerald-700/50">
              <Users className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Aanknopingspunten voor het gesprek</h2>
              <p className="text-sm text-emerald-200/70">
                Wat uw klanten gaan vragen · Peildatum: {PEILDATUM} · <span className="italic">{INDICATIEF_LABEL}</span>
              </p>
            </div>
          </div>
          <div className="ml-16">
            <SectionMetadataBadge section="klanteisen" metadata={metadata} />
          </div>
        </div>
        <SectionRefreshButton clientId={clientId} section="klanteisen" label="Analyseren" />
      </div>

      <div className="space-y-6">
        {/* TENDERTREFFERS at the very top */}
        {tendertreffers.length > 0 && (
          <div className="rounded-xl bg-indigo-950/60 border border-indigo-600/40 p-5">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Concrete tendertreffers
            </h3>
            <p className="text-sm text-indigo-100/80 mb-3">
              Deze eisen zijn daadwerkelijk gesteld in recente tenders van uw klanttypen:
            </p>
            <div className="space-y-3">
              {tendertreffers.map((t: any, idx: number) => (
                <div key={idx} className="rounded-lg bg-indigo-900/40 border border-indigo-700/40 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex-1">
                      <a 
                        href={t.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-white font-semibold hover:text-indigo-200 underline"
                      >
                        {t.tender_titel || t.tender}
                      </a>
                      <p className="text-sm text-indigo-200/70 mt-1">
                        {t.opdrachtgever}
                        {t.datum && <> · {new Date(t.datum).toLocaleDateString('nl-NL')}</>}
                        {t.relevant_voor_klanttype && <> · {t.relevant_voor_klanttype}</>}
                      </p>
                    </div>
                    {getNiveauBadge(t.niveau)}
                  </div>
                  <p className="text-sm text-indigo-50">
                    <strong>Gestelde eis:</strong> {t.eis_gesteld || t.eis}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* WAT UW KLANTEN GAAN VRAGEN - eisen per klanttype */}
        {hasNewStructure ? (
          <>
            <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-5">
              <h3 className="text-lg font-bold text-white mb-4">Wat uw klanten gaan vragen</h3>
              <div className="space-y-3">
                {sortedEisen.map((eis: any, idx: number) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-4 border ${
                      eis.status === 'ontbreekt' && eis.niveau === 'KICK-OUT' 
                        ? 'bg-red-950/50 border-red-700/50' 
                        : 'bg-emerald-800/40 border-emerald-600/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-white">{eis.eis}</h4>
                          {getNiveauBadge(eis.niveau)}
                          {getStatusChip(eis.status)}
                        </div>
                        <p className="text-xs text-emerald-200/70">
                          {eis.klanttype}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className={`text-sm font-medium ${
                        eis.status === 'ontbreekt' ? 'text-red-100' :
                        eis.status === 'onbekend' ? 'text-amber-100' :
                        'text-green-100'
                      }`}>
                        {eis.gevolg}
                      </p>

                      {eis.bewijs && (
                        <p className="text-xs text-emerald-200/70">
                          <strong>Bewijs:</strong> {eis.bewijs}
                        </p>
                      )}

                      <p className="text-sm text-white">
                        <strong>Actie:</strong> {eis.bewijsactie}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Old structure compatibility */
          merged.map((kt, idx) => (
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
            </div>
          ))
        )}
        
        {/* AANKNOPINGSPUNTEN */}
        {sortedAanknopingspunten.length > 0 && (
          <div className="rounded-xl bg-sky-950/60 border border-sky-600/40 p-5">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Andere aanknopingspunten
            </h3>
            <div className="space-y-3">
              {sortedAanknopingspunten.map((punt: any, idx: number) => (
                <div key={idx} className="rounded-lg bg-sky-900/40 border border-sky-700/40 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <h4 className="font-semibold text-white flex-1">{punt.punt}</h4>
                    {getUrgentieBadge(punt.urgentie)}
                  </div>
                  <p className="text-sm text-sky-100 mb-2">
                    <strong>Gevolg:</strong> {punt.gevolg}
                  </p>
                  <p className="text-sm text-sky-50">
                    <strong>Actie:</strong> {punt.actie}
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
