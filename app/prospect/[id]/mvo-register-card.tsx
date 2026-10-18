'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { nl } from '@/lib/format';

interface MvoRegisterData {
  status: 'geregistreerd' | 'niet_gevonden' | 'kon_niet_controleren';
  gezocht_op: string;
  matches: Array<{
    name: string;
    description: string;
    companyId: string | null;
    dashboardUrl: string | null;
  }>;
  gecontroleerd_op: string;
}

export function MvoRegisterCard({
  clientId,
  data,
}: {
  clientId: number;
  data: MvoRegisterData | null;
}) {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const recheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/mvo-register`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Controle mislukt');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Controle mislukt');
    } finally {
      setChecking(false);
    }
  };

  if (!data) {
    return (
      <div className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1.5 h-11 flex items-center">
              <img 
                src="/mvo-register-logo.png" 
                alt="Stichting MVO-Register" 
                className="h-full w-auto"
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                MVO-register
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/20 border border-amber-400/30">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </span>
              </h3>
              <p className="text-sm text-emerald-200/70">
                Nog niet gecontroleerd
              </p>
            </div>
          </div>
          <button
            onClick={recheck}
            disabled={checking}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-emerald-700/60 text-white hover:bg-emerald-600 disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Bezig...' : 'Controleren'}
          </button>
        </div>
      </div>
    );
  }

  const statusConfig = {
    geregistreerd: {
      statusIcon: '/mvo-good.png',
      titleColor: 'text-green-200',
      cardBg: 'bg-green-900/40',
      borderColor: 'border-green-500 border-2',
      label: 'Geregistreerd in MVO-register',
      matchesBg: 'bg-green-800/40',
      matchesBorder: 'border-green-600/40',
      dividerColor: 'border-green-700/40',
    },
    niet_gevonden: {
      statusIcon: '/mvo-bad.png',
      titleColor: 'text-red-200',
      cardBg: 'bg-red-900/40',
      borderColor: 'border-red-500 border-2',
      label: 'Niet geregistreerd in MVO-register',
      matchesBg: 'bg-red-800/40',
      matchesBorder: 'border-red-600/40',
      dividerColor: 'border-red-700/40',
    },
    kon_niet_controleren: {
      statusIcon: null,
      titleColor: 'text-amber-200',
      cardBg: 'bg-amber-900/40',
      borderColor: 'border-amber-500 border-2',
      label: 'MVO-register kon niet worden gecontroleerd',
      matchesBg: 'bg-amber-800/40',
      matchesBorder: 'border-amber-600/40',
      dividerColor: 'border-amber-700/40',
    },
  };

  const config = statusConfig[data.status];

  return (
    <div
      className={`rounded-2xl ${config.cardBg} ${config.borderColor} shadow-xl backdrop-blur-xl p-5`}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-white rounded-lg p-1.5 h-11 flex items-center">
            <img 
              src="/mvo-register-logo.png" 
              alt="Stichting MVO-Register" 
              className="h-full w-auto"
            />
          </div>
          <div className="flex-1">
            <h3 className={`text-lg font-bold ${config.titleColor}`}>
              {config.label}
            </h3>
            <p className="text-sm text-white/70">
              Gezocht op: {nl(data.gezocht_op)}
            </p>
          </div>
          {config.statusIcon && (
            <img 
              src={config.statusIcon} 
              alt="" 
              className="w-14 h-14 flex-shrink-0"
            />
          )}
          {!config.statusIcon && data.status === 'kon_niet_controleren' && (
            <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-10 h-10 text-amber-400" />
            </div>
          )}
        </div>
        <button
          onClick={recheck}
          disabled={checking}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Bezig...' : 'Opnieuw controleren'}
        </button>
      </div>

      {data.matches && data.matches.length > 0 && (
        <div className="mt-4 space-y-3">
          {data.matches.map((match, i) => (
            <div
              key={i}
              className={`rounded-lg ${config.matchesBg} border ${config.matchesBorder} p-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-white">{match.name}</p>
                  {match.description && (
                    <p className="text-sm text-white/80 mt-1">
                      {match.description}
                    </p>
                  )}
                  {match.dashboardUrl && (
                    <a
                      href={match.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-white/90 hover:text-white underline underline-offset-2 mt-2"
                    >
                      Bekijk profiel (inloggen vereist)
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`mt-4 pt-4 border-t ${config.dividerColor}`}>
        <p className="text-xs text-white/60 mb-2">
          Gecontroleerd op:{' '}
          {new Date(data.gecontroleerd_op).toLocaleString('nl-NL', {
            timeZone: 'Europe/Amsterdam',
          })}
        </p>
        <p className="text-xs text-white/70">
          <strong>Let op:</strong> Rating en sterren zijn alleen zichtbaar na inloggen op
          MVO-register.{' '}
          <a
            href="https://database.mvo-register.nl/rating-web/register/search?1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-white/90 hover:text-white underline underline-offset-2"
          >
            Zoek op MVO-register
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
