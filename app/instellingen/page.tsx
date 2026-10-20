'use client';

import { useState, useRef, useEffect } from 'react';
import MainLayout from '@/app/components/MainLayout';
import { Upload, X, Image as ImageIcon, Palette } from 'lucide-react';

export default function InstellingenPage() {
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Huisstijl settings
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
  const [font, setFont] = useState('Aptos');
  const [savingHuisstijl, setSavingHuisstijl] = useState(false);
  const [loadingHuisstijl, setLoadingHuisstijl] = useState(true);

  // Load huisstijl settings on mount
  useEffect(() => {
    const loadHuisstijl = async () => {
      try {
        const res = await fetch('/api/settings/huisstijl');
        if (res.ok) {
          const data = await res.json();
          setPrimaryColor(data.primary_color);
          setSecondaryColor(data.secondary_color);
          setFont(data.font);
        }
      } catch (error) {
        console.error('Laden huisstijl mislukt:', error);
      } finally {
        setLoadingHuisstijl(false);
      }
    };
    loadHuisstijl();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Alleen afbeeldingen zijn toegestaan');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Bestand is te groot (max 5MB)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload mislukt');

      const data = await response.json();
      setCompanyLogo(data.url);
      alert('Logo succesvol geüpload');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload mislukt');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je het bedrijfslogo wilt verwijderen?')) return;

    setUploading(true);
    try {
      const response = await fetch('/api/settings/logo', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Verwijderen mislukt');

      setCompanyLogo(null);
      alert('Logo verwijderd');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Verwijderen mislukt');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveHuisstijl = async () => {
    setSavingHuisstijl(true);
    try {
      const res = await fetch('/api/settings/huisstijl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          font,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Opslaan mislukt');
      }

      alert('Huisstijl succesvol opgeslagen');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Opslaan mislukt');
    } finally {
      setSavingHuisstijl(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="rounded-2xl bg-emerald-950/85 border border-emerald-600/40 shadow-xl backdrop-blur-xl p-6">
          <h1 className="text-2xl font-bold text-white mb-2">Instellingen</h1>
          <p className="text-sm text-emerald-200/70 mb-6">
            Beheer bedrijfslogo en andere instellingen
          </p>

          {/* Company Logo Section */}
          <div className="rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Bedrijfslogo
            </h2>
            <p className="text-sm text-emerald-100/80 mb-4">
              Upload uw bedrijfslogo voor gebruik in rapporten. Standaard wordt het MF Impact logo gebruikt.
              Toegestane formaten: PNG, JPG, SVG. Maximaal 5MB.
            </p>

            <div className="flex items-start gap-4">
              {/* Logo preview */}
              <div className="flex-1">
                {companyLogo ? (
                  <div className="relative rounded-lg bg-white p-4 flex items-center justify-center h-32 border-2 border-emerald-600/40">
                    <img
                      src={companyLogo}
                      alt="Bedrijfslogo"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg bg-emerald-800/40 border-2 border-dashed border-emerald-600/40 p-4 flex flex-col items-center justify-center h-32">
                    <ImageIcon className="w-12 h-12 text-emerald-400/50 mb-2" />
                    <p className="text-sm text-emerald-200/70 text-center">
                      Standaard MF Impact logo<br />
                      <span className="text-xs">(of upload eigen logo)</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Bezig...' : 'Upload'}
                </button>
                {companyLogo && (
                  <button
                    onClick={handleDelete}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-700/70 text-red-100 hover:bg-red-600 disabled:opacity-50 font-medium"
                  >
                    <X className="w-4 h-4" />
                    Verwijder
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Huisstijl Section */}
          <div className="mt-6 rounded-xl bg-emerald-900/40 border border-emerald-700/40 p-5">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Huisstijl
            </h2>
            <p className="text-sm text-emerald-100/80 mb-4">
              Stel kleuren en lettertype in voor rapporten (Word, PowerPoint).
            </p>

            {loadingHuisstijl ? (
              <p className="text-sm text-emerald-200/70">Laden...</p>
            ) : (
              <div className="space-y-4">
                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Primaire kleur
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 rounded border-2 border-emerald-600/40 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#10b981"
                      className="flex-1 px-3 py-2 rounded-lg bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Secundaire kleur
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-16 h-10 rounded border-2 border-emerald-600/40 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1 px-3 py-2 rounded-lg bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Font */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Lettertype
                  </label>
                  <select
                    value={font}
                    onChange={(e) => setFont(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-950/60 text-white border border-emerald-700/50 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Aptos">Aptos (met Calibri fallback)</option>
                    <option value="Calibri">Calibri</option>
                    <option value="Inter">Inter</option>
                    <option value="Arial">Arial</option>
                  </select>
                </div>

                {/* Preview */}
                <div className="p-4 rounded-lg bg-white">
                  <p className="text-sm font-semibold mb-2" style={{ color: primaryColor }}>
                    Primaire kleur voorbeeld
                  </p>
                  <p className="text-sm font-semibold mb-2" style={{ color: secondaryColor }}>
                    Secundaire kleur voorbeeld
                  </p>
                  <p className="text-sm" style={{ fontFamily: font === 'Aptos' ? 'Aptos, Calibri, sans-serif' : font }}>
                    Lettertype: {font}
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveHuisstijl}
                  disabled={savingHuisstijl}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 font-medium"
                >
                  {savingHuisstijl ? 'Opslaan...' : 'Huisstijl opslaan'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
