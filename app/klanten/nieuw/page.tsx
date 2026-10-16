'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/app/components/MainLayout';
import GlassWindow from '@/app/components/GlassWindow';
import { Globe, Check, AlertTriangle, Info, Download } from 'lucide-react';
import { ESG_DISCLAIMER, ESG_REFERENCE_DATE } from '@/lib/esg-thresholds';

type AnalysisStep = 'idle' | 'crawling' | 'researching' | 'extracting' | 'scanning' | 'thresholds' | 'claims' | 'complete' | 'error';

interface CompanyData {
  naam: string;
  kvk: string | null;
  kvk_source: string | null;
  sector: string;
  sector_source: string | null;
  aantal_medewerkers: number | 'onbekend';
  aantal_medewerkers_source: string | null;
  aantal_medewerkers_quote: string | null;
  omzet: number | 'onbekend';
  omzet_source: string | null;
  balanstotaal: number | 'onbekend';
  belangrijkste_afnemers: string[] | null;
  afnemers_source: string | null;
  producten: string[] | null;
  producten_source: string | null;
  certificaten: string[] | null;
  certificaten_source: string | null;
  beschrijving: string | null;
  confidence: 'hoog' | 'middel' | 'laag';
}

export default function NieuweKlantPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [city, setCity] = useState('');
  const [step, setStep] = useState<AnalysisStep>('idle');
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);

  const runAnalysis = async () => {
    if (!url) {
      setError('Voer een website URL in');
      return;
    }
    
    if (!city) {
      setError('Voer de hoofdvestigingsplaats in');
      return;
    }

    setError('');
    setStep('crawling');

    try {
      // Step 1: Full initial analysis with deep research
      setStep('extracting');
      const extractRes = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, city, step: 'full' }),
      });

      if (!extractRes.ok) {
        const err = await extractRes.json();
        const errorMsg = err.error || 'Analyse mislukt';
        const failedStep = err.step || 'extracting';
        console.error(`Analysis failed at step ${failedStep}:`, errorMsg, err.details);
        throw new Error(`Fout bij ${failedStep}: ${errorMsg}`);
      }

      const extractData = await extractRes.json();
      setClientId(extractData.clientId);
      setCompanyData(extractData.companyData);
      
      // Never block for confirmation - continue directly
      await continueAnalysis(extractData.clientId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Er is een fout opgetreden';
      console.error('Full analysis error:', errorMessage, err);
      setError(errorMessage);
      setStep('error');
    }
  };

  const continueAnalysis = async (cId: number) => {
    try {
      // Step 2: Scan (VSME B1-B11) - non-fatal
      try {
        setStep('scanning');
        const scanRes = await fetch('/api/analyze-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, city, step: 'scan', clientId: cId }),
        });
        if (!scanRes.ok) {
          const err = await scanRes.json();
          console.error('Scan step failed (continuing):', err);
        }
      } catch (scanErr) {
        console.error('Scan step error (continuing):', scanErr);
      }

      // Step 3: Threshold check - non-fatal
      try {
        setStep('thresholds');
        const thresholdRes = await fetch('/api/analyze-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, city, step: 'threshold', clientId: cId }),
        });
        if (!thresholdRes.ok) {
          const err = await thresholdRes.json();
          console.error('Threshold step failed (continuing):', err);
        }
      } catch (thresholdErr) {
        console.error('Threshold step error (continuing):', thresholdErr);
      }

      // Step 4: Claim check - non-fatal
      try {
        setStep('claims');
        const claimsRes = await fetch('/api/analyze-website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, city, step: 'claims', clientId: cId }),
        });
        if (!claimsRes.ok) {
          const err = await claimsRes.json();
          console.error('Claims step failed (continuing):', err);
        }
      } catch (claimsErr) {
        console.error('Claims step error (continuing):', claimsErr);
      }

      setStep('complete');
      
      // Redirect to client detail page after 2 seconds
      setTimeout(() => {
        router.push(`/klanten/${cId}`);
      }, 2000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analyse mislukt';
      console.error('Continue analysis error:', errorMessage, err);
      setError(errorMessage);
      setStep('error');
    }
  };


  const getStepStatus = (currentStep: AnalysisStep, checkStep: AnalysisStep) => {
    const steps: AnalysisStep[] = ['crawling', 'researching', 'extracting', 'scanning', 'thresholds', 'claims', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    const checkIndex = steps.indexOf(checkStep);
    
    if (currentIndex === -1) return 'pending';
    if (currentIndex === checkIndex) return 'active';
    if (currentIndex > checkIndex) return 'complete';
    return 'pending';
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Nieuwe klant analyseren</h1>
          <p className="text-teal-200 text-lg">Voer website URL en vestigingsplaats in - AI doet deep research</p>
        </div>

        {/* Disclaimer */}
        <GlassWindow>
          <div className="flex items-start space-x-3 text-sm">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">{ESG_DISCLAIMER}</p>
              <p className="text-teal-200/70 mt-1">Peildatum: {new Date(ESG_REFERENCE_DATE).toLocaleDateString('nl-NL')}</p>
            </div>
          </div>
        </GlassWindow>

        {/* Input Fields */}
        <GlassWindow>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Website URL *
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="bijv. https://bedrijf.nl"
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    disabled={step !== 'idle' && step !== 'error'}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Hoofdvestigingsplaats *
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="bijv. Amsterdam, Rotterdam"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                  disabled={step !== 'idle' && step !== 'error'}
                />
              </div>
            </div>
            
            <button
              onClick={runAnalysis}
              disabled={!url || !city || (step !== 'idle' && step !== 'error')}
              className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {step !== 'idle' && step !== 'error' ? 'Deep research bezig...' : 'Start deep analyse'}
            </button>

            {error && (
              <div className="flex items-start space-x-2 p-3 bg-red-500/20 border border-red-400/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}
          </div>
        </GlassWindow>

        {/* Progress Steps */}
        {step !== 'idle' && step !== 'error' && (
          <GlassWindow title="Analyse voortgang">
            <div className="space-y-3">
              {[
                { step: 'crawling', label: 'Website crawlen (meerdere pagina\'s)', icon: Globe },
                { step: 'researching', label: 'Web research (KvK, LinkedIn, nieuws)', icon: Info },
                { step: 'extracting', label: 'Bedrijfsgegevens extraheren met bronnen', icon: Info },
                { step: 'scanning', label: 'MVO-scan (VSME B1-B11)', icon: Check },
                { step: 'thresholds', label: 'Drempelcheck (CSRD, CSDDD, etc.)', icon: Check },
                { step: 'claims', label: 'Claimcheck (ECGT + ACM)', icon: Check },
              ].map(({ step: s, label, icon: Icon }) => {
                const status = getStepStatus(step, s as AnalysisStep);
                return (
                  <div key={s} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      status === 'complete' ? 'bg-green-500/20 border-green-400' :
                      status === 'active' ? 'bg-teal-500/20 border-teal-400 animate-pulse' :
                      'bg-white/5 border-white/20'
                    } border`}>
                      <Icon className={`w-4 h-4 ${
                        status === 'complete' ? 'text-green-400' :
                        status === 'active' ? 'text-teal-300' :
                        'text-white/40'
                      }`} />
                    </div>
                    <span className={`text-sm ${
                      status === 'complete' ? 'text-green-300' :
                      status === 'active' ? 'text-white font-medium' :
                      'text-teal-200/50'
                    }`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassWindow>
        )}

        {/* No confirmation screen - flow continues automatically */}

        {/* Complete */}
        {step === 'complete' && (
          <GlassWindow>
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-500/20 border-2 border-green-400 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Analyse voltooid!</h3>
                <p className="text-teal-200 mt-2">Het klantdossier is aangemaakt. U wordt doorgestuurd...</p>
              </div>
            </div>
          </GlassWindow>
        )}
      </div>
    </MainLayout>
  );
}
