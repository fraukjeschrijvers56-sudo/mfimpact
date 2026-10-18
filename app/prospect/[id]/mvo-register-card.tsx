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
      icon: CheckCircle,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-400/30',
      label: 'Geregistreerd in MVO-register',
    },
    niet_gevonden: {
      icon: XCircle,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-400/30',
      label: 'Niet gevonden in MVO-register',
    },
    kon_niet_controleren: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-400/30',
      label: 'MVO-register kon niet worden gecontroleerd',
    },
  };

  const config = statusConfig[data.status];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-2xl bg-emerald-950/85 border ${config.borderColor} shadow-xl backdrop-blur-xl p-5`}
    >
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
              {config.label}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${config.bgColor} border ${config.borderColor}`}>
                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
              </span>
            </h3>
            <p className="text-sm text-emerald-200/70">
              Gezocht op: {nl(data.gezocht_op)}
            </p>
          </div>
        </div>
        <button
          onClick={recheck}
          disabled={checking}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-emerald-700/60 text-white hover:bg-emerald-600 disabled:opacity-50 flex-shrink-0"
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
              className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-white">{match.name}</p>
                  {match.description && (
                    <p className="text-sm text-emerald-100/80 mt-1">
                      {match.description}
                    </p>
                  )}
                  {match.dashboardUrl && (
                    <a
                      href={match.dashboardUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-emerald-300 hover:text-white underline underline-offset-2 mt-2"
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

      <div className="mt-4 pt-4 border-t border-emerald-700/30">
        <p className="text-xs text-emerald-200/60 mb-2">
          Gecontroleerd op:{' '}
          {new Date(data.gecontroleerd_op).toLocaleString('nl-NL', {
            timeZone: 'Europe/Amsterdam',
          })}
        </p>
        <p className="text-xs text-emerald-200/70">
          <strong>Let op:</strong> Rating en sterren zijn alleen zichtbaar na inloggen op
          MVO-register.{' '}
          <a
            href="https://database.mvo-register.nl/rating-web/register/search?1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-300 hover:text-white underline underline-offset-2"
          >
            Zoek op MVO-register
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </div>
    </div>
  );
}
