import { ReactNode } from 'react';
import { ExternalLink, CheckCircle2, AlertTriangle, HelpCircle, Info } from 'lucide-react';
import { nl, isUnknown, labelize, hostOf, isUrl } from '@/lib/format';
import { extractDisplayValue, isFieldObject, parseFieldValue, humanizeKey } from '@/lib/field-normalizer';

export function Section({ id, title, icon, count, children, className = '' }: { id?: string; title: string; icon?: ReactNode; count?: number; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl ${className}`}>
      <header className="flex items-center gap-3 px-5 py-4 border-b border-emerald-700/50">
        {icon && <span className="text-emerald-300">{icon}</span>}
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {count !== undefined && <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100">{count}</span>}
      </header>
      <div className="p-5 text-emerald-50">{children}</div>
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  gevonden: 'bg-emerald-400 text-emerald-950',
  aanwezig: 'bg-emerald-400 text-emerald-950',
  groen: 'bg-emerald-400 text-emerald-950',
  ja: 'bg-emerald-400 text-emerald-950',
  hoog: 'bg-red-500 text-white',
  rood: 'bg-red-500 text-white',
  red: 'bg-red-500 text-white',
  afgeleid: 'bg-sky-300 text-sky-950',
  gedeeltelijk: 'bg-amber-300 text-amber-950',
  oranje: 'bg-amber-300 text-amber-950',
  orange: 'bg-amber-300 text-amber-950',
  middel: 'bg-amber-300 text-amber-950',
  twijfelachtig: 'bg-amber-300 text-amber-950',
  laag: 'bg-sky-300 text-sky-950',
  green: 'bg-emerald-400 text-emerald-950',
  ontbrekend: 'bg-slate-300 text-slate-900',
  onbekend: 'bg-slate-600 text-white',
  nee: 'bg-slate-300 text-slate-900',
};

const STATUS_LABEL: Record<string, string> = { red: 'rood', orange: 'oranje', green: 'groen', unknown: 'onbekend' };

export function Badge({ value }: { value: unknown }) {
  const raw = isUnknown(value) ? 'onbekend' : String(value).toLowerCase().trim();
  const key = STATUS_LABEL[raw] || raw;
  return <span className={`inline-block text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${STATUS_STYLES[key] || STATUS_STYLES[raw] || 'bg-emerald-200 text-emerald-950'}`}>{key}</span>;
}

export function SourceLink({ url, label }: { url: string; label?: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-300 hover:text-white underline underline-offset-2 break-all">
      {label || hostOf(url)} <ExternalLink className="w-3 h-3 flex-shrink-0" />
    </a>
  );
}

function ValidatieIcon({ v }: { v?: string }) {
  if (v === 'gevonden') return <span title="Citaat teruggevonden op de bronpagina"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></span>;
  if (v === 'twijfelachtig') return <span title="Citaat niet letterlijk teruggevonden"><AlertTriangle className="w-4 h-4 text-amber-300" /></span>;
  if (v) return <span title="Bron niet automatisch controleerbaar"><HelpCircle className="w-4 h-4 text-slate-300" /></span>;
  return null;
}

export function Bronnen({ bronnen }: { bronnen: any }) {
  if (!Array.isArray(bronnen) || bronnen.length === 0) return null;
  const list = bronnen.filter((b) => b && (b.url || b.citaat));
  if (list.length === 0) return null;
  return (
    <ul className="mt-2 space-y-2">
      {list.map((b: any, i: number) => (
        <li key={i} className="text-sm border-l-2 border-emerald-500/60 pl-3">
          {b.citaat && <p className="italic text-emerald-50/90">“{nl(b.citaat)}”</p>}
          <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs">
            <ValidatieIcon v={b.validatie} />
            {isUrl(b.url) ? <SourceLink url={b.url} /> : b.url ? <span>{b.url}</span> : null}
            {!isUnknown(b.datum) && <span className="text-emerald-200/70">{nl(b.datum)}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Render a waarde which might be text, number, list, field object, or nested object */
export function Waarde({ v, edited }: { v: unknown; edited?: boolean }) {
  // Parse if it's a JSON string
  const parsed = parseFieldValue(v);
  
  // If it's a field object, extract and display properly
  if (isFieldObject(parsed)) {
    const displayValue = extractDisplayValue(parsed);
    const status = parsed.status;
    const toelichting = parsed.toelichting;
    const bronnen = parsed.bronnen;
    
    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Waarde v={displayValue} edited={edited} />
          {status && status !== 'onbekend' && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-700/60 text-emerald-100">
              {humanizeKey(status)}
            </span>
          )}
          {edited && (
            <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-600/80 text-sky-100">
              aangepast
            </span>
          )}
        </div>
        {toelichting && !isUnknown(toelichting) && (
          <p className="text-sm text-emerald-100/70">{nl(toelichting)}</p>
        )}
        {bronnen && Array.isArray(bronnen) && bronnen.length > 0 && (
          <Bronnen bronnen={bronnen} />
        )}
      </div>
    );
  }
  
  if (isUnknown(parsed)) return <span className="text-slate-300 italic">onbekend</span>;
  
  if (Array.isArray(parsed)) {
    const items = parsed.filter((x) => !isUnknown(x));
    if (items.every((x) => !isFieldObject(parseFieldValue(x)) && typeof parseFieldValue(x) !== 'object')) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {items.map((x, i) => (
            <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-800/80 text-white text-sm">{isUrl(x) ? <SourceLink url={x} /> : nl(x)}</span>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((x, i) => (
          <div key={i} className="rounded-lg bg-emerald-900/50 p-2"><Waarde v={x} /></div>
        ))}
      </div>
    );
  }
  
  if (typeof parsed === 'object' && parsed !== null) return <Generic value={parsed} />;
  if (isUrl(parsed)) return <SourceLink url={parsed} label={parsed} />;
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <span className="text-white whitespace-pre-line">{nl(parsed)}</span>
      {edited && (
        <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-600/80 text-sky-100">
          aangepast
        </span>
      )}
    </span>
  );
}

/** A labelled field with status and sources */
export function FieldRow({ label, field }: { label: string; field: any }) {
  // Parse if JSON string
  const parsed = parseFieldValue(field);
  
  // Simple non-field-object value
  if (!isFieldObject(parsed)) {
    return (
      <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-3">
        <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-300 mb-1">{label}</dt>
        <dd><Waarde v={parsed} /></dd>
      </div>
    );
  }
  
  // Field object - render with status badge, sources, etc.
  const waarde = parsed.waarde ?? (parsed as any).samenvatting ?? parsed.value;
  const extraKeys = Object.keys(parsed).filter((k) => !['waarde', 'status', 'bronnen', 'toelichting', 'samenvatting', 'value', 'titel'].includes(k));
  
  return (
    <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-3">
      <dt className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">{label}</span>
        {parsed.status !== undefined && <Badge value={parsed.status} />}
      </dt>
      <dd className="space-y-1">
        <Waarde v={waarde} />
        {!isUnknown(parsed.toelichting) && <p className="text-sm text-emerald-100/80 flex gap-1"><Info className="w-4 h-4 mt-0.5 flex-shrink-0" />{nl(parsed.toelichting)}</p>}
        {extraKeys.map((k) => (
          <p key={k} className="text-sm"><span className="text-emerald-300">{labelize(k)}: </span><Waarde v={(parsed as any)[k]} /></p>
        ))}
        {parsed.bronnen && Array.isArray(parsed.bronnen) && <Bronnen bronnen={parsed.bronnen} />}
      </dd>
    </div>
  );
}

/** Grid of all fields in an object */
export function FieldGrid({ obj, cols = 2, skip = [] }: { obj: any; cols?: 2 | 3; skip?: string[] }) {
  if (!obj || typeof obj !== 'object') return <p className="text-slate-300 italic">onbekend</p>;
  const keys = Object.keys(obj).filter((k) => !skip.includes(k));
  if (keys.length === 0) return <p className="text-slate-300 italic">onbekend</p>;
  return (
    <dl className={`grid grid-cols-1 md:grid-cols-2 ${cols === 3 ? 'xl:grid-cols-3' : ''} gap-3`}>
      {keys.map((k) => <FieldRow key={k} label={labelize(k)} field={obj[k]} />)}
    </dl>
  );
}

/** Generic recursive renderer for anything else in the dossier */
export function Generic({ value }: { value: any }) {
  if (isFieldObject(parseFieldValue(value))) return <FieldRow label="" field={value} />;
  if (Array.isArray(value)) return <Waarde v={value} />;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    return (
      <dl className="space-y-1">
        {keys.map((k) =>
          k === 'bronnen' ? <Bronnen key={k} bronnen={value[k]} /> : (
            <div key={k} className="text-sm">
              <dt className="inline text-emerald-300">{labelize(k)}: </dt>
              <dd className="inline"><Waarde v={value[k]} /></dd>
            </div>
          )
        )}
      </dl>
    );
  }
  return <Waarde v={value} />;
}

export function Stat({ label, value, tone = 'default' }: { label: string; value: ReactNode; tone?: 'default' | 'warn' | 'bad' | 'good' }) {
  const toneCls = tone === 'bad' ? 'text-red-300' : tone === 'warn' ? 'text-amber-300' : tone === 'good' ? 'text-emerald-300' : 'text-white';
  return (
    <div className="rounded-xl bg-emerald-900/60 border border-emerald-700/50 px-4 py-3">
      <p className={`text-2xl font-bold tabular-nums ${toneCls}`}>{value}</p>
      <p className="text-xs uppercase tracking-wide text-emerald-200">{label}</p>
    </div>
  );
}
