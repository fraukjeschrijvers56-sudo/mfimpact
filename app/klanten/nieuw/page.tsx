'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/app/components/MainLayout';
import GlassWindow from '@/app/components/GlassWindow';
import { Globe, Check, AlertTriangle, Info, Download } from 'lucide-react';
import { ESG_DISCLAIMER, ESG_REFERENCE_DATE } from '@/lib/esg-thresholds';

type AnalysisStep = 'idle' | 'fetching' | 'extracting' | 'scanning' | 'thresholds' | 'claims' | 'complete' | 'error';

interface CompanyData {
  naam: string;
  kvk: string | null;
  sector: string;
  aantal_medewerkers: number | 'onbekend';
  omzet: number | 'onbekend';
  balanstotaal: number | 'onbekend';
  belangrijkste_afnemers?: string[];
  producten?: string[];
  confidence: 'hoog' | 'middel' | 'laag';
}

export default function NieuweKlantPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<AnalysisStep>('idle');
  const [error, setError] = useState('');
  const [clientId, setClientId] = useState<number | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  
  // Editable fields for confirmation
  const [editedData, setEditedData] = useState<Partial<CompanyData>>({});

  const runAnalysis = async () => {
    if (!url) {
      setError('Voer een website URL in');
      return;
    }

    setError('');
    setStep('fetching');

    try {
      // Step 1: Full initial analysis
      setStep('extracting');
      const extractRes = await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, step: 'full' }),
      });

      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error || 'Analyse mislukt');
      }

      const extractData = await extractRes.json();
      setClientId(extractData.clientId);
      setCompanyData(extractData.companyData);
      setNeedsConfirmation(extractData.needsConfirmation);

      // If data needs confirmation, pause here
      if (extractData.needsConfirmation) {
        setStep('idle');
        setEditedData(extractData.companyData);
        return;
      }

      // Continue with analysis
      await continueAnalysis(extractData.clientId);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
      setStep('error');
    }
  };

  const continueAnalysis = async (cId: number) => {
    try {
      // Step 2: Scan (VSME B1-B11)
      setStep('scanning');
      await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, step: 'scan', clientId: cId }),
      });

      // Step 3: Threshold check
      setStep('thresholds');
      await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, step: 'threshold', clientId: cId }),
      });

      // Step 4: Claim check
      setStep('claims');
      await fetch('/api/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, step: 'claims', clientId: cId }),
      });

      setStep('complete');
      
      // Redirect to client detail page after 2 seconds
      setTimeout(() => {
        router.push(`/klanten/${cId}`);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analyse mislukt');
      setStep('error');
    }
  };

  const confirmAndContinue = async () => {
    if (!clientId) return;

    // Update client with confirmed data
    await fetch('/api/klanten', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: clientId,
        ...editedData
      }),
    });

    setNeedsConfirmation(false);
    await continueAnalysis(clientId);
  };

  const getStepStatus = (currentStep: AnalysisStep, checkStep: AnalysisStep) => {
    const steps: AnalysisStep[] = ['fetching', 'extracting', 'scanning', 'thresholds', 'claims', 'complete'];
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
          <p className="text-teal-200 text-lg">Voer alleen de website URL in - AI doet de rest</p>
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

        {/* URL Input */}
        <GlassWindow>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Website URL
              </label>
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-300" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="bijv. https://bedrijf.nl of bedrijf.nl"
                    className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                    disabled={step !== 'idle' && step !== 'error'}
                  />
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={!url || (step !== 'idle' && step !== 'error')}
                  className="px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {step !== 'idle' && step !== 'error' ? 'Bezig...' : 'Analyseren'}
                </button>
              </div>
            </div>

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
                { step: 'fetching', label: 'Website ophalen', icon: Globe },
                { step: 'extracting', label: 'Bedrijfsgegevens extraheren', icon: Info },
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

        {/* Confirmation needed */}
        {needsConfirmation && companyData && (
          <GlassWindow title="Bevestig gegevens">
            <div className="space-y-4">
              <div className="bg-amber-500/20 border border-amber-400/30 rounded-lg p-4">
                <p className="text-amber-200 text-sm">
                  Sommige gegevens konden niet worden gevonden op de website. Bevestig of vul aan:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Bedrijfsnaam
                  </label>
                  <input
                    type="text"
                    value={editedData.naam || companyData.naam}
                    onChange={(e) => setEditedData({ ...editedData, naam: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Sector
                  </label>
                  <input
                    type="text"
                    value={editedData.sector || companyData.sector}
                    onChange={(e) => setEditedData({ ...editedData, sector: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Aantal medewerkers (FTE)
                  </label>
                  <input
                    type="number"
                    placeholder={companyData.aantal_medewerkers === 'onbekend' ? 'Onbekend - vul in' : ''}
                    value={typeof editedData.aantal_medewerkers === 'number' ? editedData.aantal_medewerkers : ''}
                    onChange={(e) => setEditedData({ ...editedData, aantal_medewerkers: e.target.value ? parseInt(e.target.value) : 'onbekend' })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Omzet (€)
                  </label>
                  <input
                    type="number"
                    placeholder={companyData.omzet === 'onbekend' ? 'Onbekend - vul in' : ''}
                    value={typeof editedData.omzet === 'number' ? editedData.omzet : ''}
                    onChange={(e) => setEditedData({ ...editedData, omzet: e.target.value ? parseInt(e.target.value) : 'onbekend' })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <button
                onClick={confirmAndContinue}
                className="w-full px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-all"
              >
                Bevestigen en doorgaan
              </button>
            </div>
          </GlassWindow>
        )}

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
