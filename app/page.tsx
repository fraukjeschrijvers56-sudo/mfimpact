'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/app/components/MainLayout';
import { Globe, MapPin, Loader2, Check, AlertTriangle, Search, Building2, FileSearch, Scale, Sparkles } from 'lucide-react';

type StepKey = 'crawl' | 'full' | 'dossier' | 'mvo_register' | 'claims';
type StepState = 'wachten' | 'bezig' | 'klaar' | 'waarschuwing' | 'fout';

const STEPS: Array<{ key: StepKey; label: string; detail: string; icon: any; fatal: boolean }> = [
  { key: 'crawl', label: 'Website verkennen', detail: "Homepage, over ons, duurzaamheid, vacatures, voorwaarden en meer", icon: Globe, fatal: false },
  { key: 'full', label: 'Bedrijfsprofiel opbouwen', detail: 'Naam, KvK, sector, producten, afnemers en certificaten met bronnen', icon: Building2, fatal: true },
  { key: 'dossier', label: 'Diepteonderzoek op het web', detail: 'KvK, certificaatregisters, nieuws, LinkedIn, VSME B1–B11, claims en gaten (duurt het langst)', icon: FileSearch, fatal: false },
  { key: 'mvo_register', label: 'MVO-register controleren', detail: 'Zoekt bedrijf in database.mvo-register.nl', icon: Search, fatal: false },
  { key: 'claims', label: 'Duurzaamheidsclaims toetsen', detail: 'Claims op de website tegen ECGT en ACM Leidraad', icon: Scale, fatal: false },
];

function fmt(ms: number) {
  const s = Math.round(ms / 1000);
  return s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`;
}

function IntakeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState('');
  const [city, setCity] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [states, setStates] = useState<Record<StepKey, StepState>>({ crawl: 'wachten', full: 'wachten', dossier: 'wachten', mvo_register: 'wachten', claims: 'wachten' });
  const [notes, setNotes] = useState<Partial<Record<StepKey, string>>>({});
  const [durations, setDurations] = useState<Partial<Record<StepKey, number>>>({});
  const [activeStart, setActiveStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  const [reanalyzeId, setReanalyzeId] = useState<string | null>(null);
  const startRef = useRef<number>(0);

  // Handle reanalyze query params
  useEffect(() => {
    const reanalyze = searchParams.get('reanalyze');
    const urlParam = searchParams.get('url');
    const cityParam = searchParams.get('city');
    if (reanalyze && urlParam && cityParam) {
      setReanalyzeId(reanalyze);
      setUrl(decodeURIComponent(urlParam));
      setCity(decodeURIComponent(cityParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const callStep = async (step: StepKey, clientId?: number) => {
    const res = await fetch('/api/analyze-website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, city, step, clientId }),
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = { error: `HTTP ${res.status}${res.status === 504 ? ' (tijdslimiet bereikt)' : ''}` };
    }
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  };

  const start = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!url.trim() || !city.trim() || running) return;
    setError('');
    setDone(false);
    setNotes({});
    setDurations({});
    setStates({ crawl: 'wachten', full: 'wachten', dossier: 'wachten', mvo_register: 'wachten', claims: 'wachten' });
    setRunning(true);
    startRef.current = Date.now();

    let clientId: number | undefined = reanalyzeId ? parseInt(reanalyzeId) : undefined;
    for (const s of STEPS) {
      const t0 = Date.now();
      setActiveStart(t0);
      setStates((p) => ({ ...p, [s.key]: 'bezig' }));
      try {
        const data = await callStep(s.key, clientId);
        let note = '';
        if (s.key === 'crawl') note = `${data.pagesFound ?? 0} pagina's gevonden`;
        if (s.key === 'full') {
          clientId = data.clientId;
          note = data.companyData?.naam ? `${data.companyData.naam}` : 'Profiel aangemaakt';
        }
        if (s.key === 'dossier') note = `${data.webbronnen ?? 0} webbronnen geraadpleegd`;
        if (s.key === 'mvo_register') note = data.status === 'geregistreerd' ? `${data.matches ?? 0} match(es) gevonden` : data.status === 'niet_gevonden' ? 'Niet geregistreerd' : 'Kon niet controleren';
        if (s.key === 'claims') note = `${data.claims?.length ?? 0} claims gevonden`;
        setNotes((p) => ({ ...p, [s.key]: note }));
        setStates((p) => ({ ...p, [s.key]: 'klaar' }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Onbekende fout';
        setNotes((p) => ({ ...p, [s.key]: msg }));
        if (s.fatal || (!clientId && s.key !== 'crawl')) {
          setStates((p) => ({ ...p, [s.key]: 'fout' }));
          setError(`${s.label} mislukt: ${msg}`);
          setDurations((p) => ({ ...p, [s.key]: Date.now() - t0 }));
          setRunning(false);
          setActiveStart(null);
          return;
        }
        setStates((p) => ({ ...p, [s.key]: 'waarschuwing' }));
      }
      setDurations((p) => ({ ...p, [s.key]: Date.now() - t0 }));
    }

    setActiveStart(null);
    setRunning(false);
    setDone(true);
    if (clientId) {
      // Clear query params and navigate
      router.push(`/prospect/${clientId}`);
      router.refresh();
    }
  };

  const showProgress = running || done || Object.values(states).some((s) => s !== 'wachten');

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto pt-6 md:pt-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/40 text-emerald-200 text-sm">
            <Sparkles className="w-4 h-4" /> AI-diepteonderzoek met bronnen
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow">
            {reanalyzeId ? 'Opnieuw onderzoeken' : 'Nieuwe prospect'}
          </h1>
          <p className="text-lg text-emerald-50/90">
            {reanalyzeId
              ? 'Het volledige onderzoek wordt opnieuw uitgevoerd en het dossier wordt bijgewerkt.'
              : 'Vul de website en de hoofdvestigingsplaats in. De rest zoeken wij uit.'}
          </p>
        </div>

        <form onSubmit={start} className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-2xl backdrop-blur-xl p-6 md:p-8 space-y-5">
          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-white mb-2">Website van de prospect</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
              <input
                id="url"
                type="text"
                inputMode="url"
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="bijv. www.bedrijf.nl"
                disabled={running}
                className="w-full pl-12 pr-4 py-4 text-lg rounded-xl bg-white text-slate-900 placeholder-slate-400 border-2 border-transparent focus:border-emerald-400 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-semibold text-white mb-2">Hoofdvestigingsplaats</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-300" />
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="bijv. Utrecht"
                disabled={running}
                className="w-full pl-12 pr-4 py-4 text-lg rounded-xl bg-white text-slate-900 placeholder-slate-400 border-2 border-transparent focus:border-emerald-400 focus:outline-none disabled:opacity-60"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!url.trim() || !city.trim() || running}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-lg font-semibold bg-emerald-400 text-emerald-950 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {running ? 'Onderzoek loopt…' : 'Start onderzoek'}
          </button>
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/80 border border-red-400/50 text-red-100 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-300" />
              <span>{error}</span>
            </div>
          )}
        </form>

        {showProgress && (
          <div className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-2xl backdrop-blur-xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">Voortgang</h2>
              {startRef.current > 0 && (
                <span className="text-sm text-emerald-200 tabular-nums">Totaal {fmt((running ? now : Date.now()) - startRef.current)}</span>
              )}
            </div>
            <ol className="space-y-4">
              {STEPS.map((s, i) => {
                const st = states[s.key];
                const Icon = s.icon;
                const dur = st === 'bezig' && activeStart ? now - activeStart : durations[s.key];
                return (
                  <li key={s.key} className={`flex items-start gap-4 p-4 rounded-xl border ${st === 'bezig' ? 'bg-emerald-800/50 border-emerald-400/60' : 'bg-emerald-900/40 border-emerald-700/40'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      st === 'klaar' ? 'bg-emerald-400 text-emerald-950' :
                      st === 'bezig' ? 'bg-white text-emerald-900' :
                      st === 'waarschuwing' ? 'bg-amber-400 text-amber-950' :
                      st === 'fout' ? 'bg-red-500 text-white' : 'bg-emerald-800 text-emerald-300'}`}>
                      {st === 'klaar' ? <Check className="w-5 h-5" /> :
                       st === 'bezig' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                       st === 'waarschuwing' || st === 'fout' ? <AlertTriangle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-white">Stap {i + 1}: {s.label}</p>
                        {dur !== undefined && <span className="text-sm text-emerald-200 tabular-nums">{fmt(dur)}</span>}
                      </div>
                      <p className="text-sm text-emerald-100/80">{s.detail}</p>
                      {notes[s.key] && (
                        <p className={`text-sm mt-1 ${st === 'waarschuwing' ? 'text-amber-200' : st === 'fout' ? 'text-red-200' : 'text-emerald-200'}`}>
                          {st === 'waarschuwing' ? 'Overgeslagen: ' : ''}{notes[s.key]}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            {running && <p className="mt-5 text-sm text-emerald-100/80">Het volledige onderzoek duurt meestal 3 tot 6 minuten. Laat dit venster open.</p>}
            {done && <p className="mt-5 text-sm text-emerald-100">Klaar! Het prospectoverzicht wordt geopend…</p>}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
      </MainLayout>
    }>
      <IntakeForm />
    </Suspense>
  );
}
