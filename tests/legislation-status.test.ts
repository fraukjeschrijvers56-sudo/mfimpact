import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assessLegislation, analyzeClientTypes, extractLegislationFactsForTest } from '../lib/legislation-status.ts';
import {
  WETGEVING_BRONNEN,
  WETGEVING_THRESHOLDS,
  collectLegalSourceUrls,
  getLegalSourceDisplay,
} from '../lib/wetgeving-bronnen.ts';

describe('assessLegislation', () => {
  it('maps onvoldoende gegevens / onbekend / niet geïdentificeerd to TE ONDERZOEKEN, never NVT', () => {
    const result = assessLegislation({}, {});
    const byId = Object.fromEntries(result.items.map((i) => [i.id, i]));

    assert.equal(byId.csrd.status, 'te_onderzoeken');
    assert.ok(byId.csrd.reasons.some((r) => /onvoldoende gegevens/i.test(r)));
    assert.notEqual(byId.csrd.status, 'niet_van_toepassing');

    assert.equal(byId.energiebesparingsplicht.status, 'te_onderzoeken');
    assert.ok(byId.energiebesparingsplicht.needed?.includes('kWh'));
    assert.ok(byId.energiebesparingsplicht.needed?.includes('m³'));

    assert.equal(byId.eudr.status, 'te_onderzoeken');
    assert.ok(/EUDR-goederen/i.test(byId.eudr.needed || ''));
    assert.ok(/geëxporteerd/i.test(byId.eudr.needed || ''));

    assert.equal(byId.cbam.status, 'te_onderzoeken');
    assert.ok(/CBAM-goederen/i.test(byId.cbam.needed || ''));
    assert.ok(/50 ton/i.test(byId.cbam.needed || ''));

    assert.ok(result.items.every((i) => i.status !== 'niet_van_toepassing' || !/onvoldoende|onbekend|niet ge/i.test(i.reasons.join(' '))));
  });

  it('CO2-Prestatieladder: no government/tender client → TE ONDERZOEKEN, never sector-NVT', () => {
    const result = assessLegislation(
      { sector: 'software ontwikkeling', aantal_medewerkers: 12 },
      { onderzoek: { profiel: { sector: { waarde: 'software' }, producten_diensten: { waarde: ['SaaS'] } } } }
    );
    const ladder = result.items.find((i) => i.id === 'co2_prestatieladder');
    assert.equal(ladder?.status, 'te_onderzoeken');
    assert.ok(!/niet relevant voor deze sector/i.test(ladder?.reasons.join(' ') || ''));
  });

  it('CO2-Prestatieladder: construction / government clients → INDIRECT (gunningsvoordeel)', () => {
    const result = assessLegislation(
      {},
      {
        onderzoek: {
          profiel: {
            belangrijkste_klanten_referenties: {
              waarde: ['Beekherstel Sint-Jansbeek', 'Reconstructie Teisterbandstraat Kerkdriel'],
            },
            producten_diensten: { waarde: ['projectmanagement', 'directievoering'] },
          },
          ketenrisico: {
            bouw_infra_gww: { status: 'gevonden', waarde: 'ja', bronnen: [{ url: 'https://pcomanagement.nl/' }] },
            levert_aan_grote_ondernemingen_of_overheid: {
              status: 'afgeleid',
              waarde: 'mogelijk overheid (waterschappen, gemeenten)',
              bronnen: [{ url: 'https://pcomanagement.nl/' }],
            },
          },
        },
      }
    );
    const ladder = result.items.find((i) => i.id === 'co2_prestatieladder');
    assert.equal(ladder?.status, 'indirect_via_keten');
    assert.ok(/gunningsvoordeel/i.test(ladder?.reasons.join(' ') || ''));
  });

  it('CSRD with Drimble FTE is TE ONDERZOEKEN, not NVT', () => {
    const result = assessLegislation(
      {},
      {
        onderzoek: {
          profiel: {
            aantal_medewerkers: {
              status: 'gevonden',
              waarde: '1',
              bronnen: [{ url: 'https://drimble.nl/example', validatie: 'niet_controleerbaar' }],
            },
            omzet: { status: 'onbekend', waarde: 'onbekend' },
          },
        },
      }
    );
    const csrd = result.items.find((i) => i.id === 'csrd');
    assert.equal(csrd?.status, 'te_onderzoeken');
    assert.ok(/KvK\/jaarrekening/i.test(csrd?.needed || ''));
    assert.ok(!csrd?.source || !/KvK \/ jaarrekening/i.test(csrd.source));
  });

  it('CSRD with KvK-sourced FTE 1 is NVT even if omzet is unknown', () => {
    const result = assessLegislation(
      {},
      {
        onderzoek: {
          profiel: {
            aantal_medewerkers: {
              status: 'gevonden',
              waarde: '1',
              bronnen: [{ url: 'https://www.kvk.nl/zoeken/handelsregister', citaat: '1 werknemer', validatie: 'gevonden' }],
            },
            omzet: { status: 'onbekend', waarde: 'onbekend' },
          },
        },
      }
    );
    const csrd = result.items.find((i) => i.id === 'csrd');
    assert.equal(csrd?.status, 'niet_van_toepassing');
    assert.ok(/FTE 1/.test(csrd?.reasons.join(' ') || ''));
    assert.ok(/kvk\.nl/i.test(csrd?.source || ''));
  });

  it('EUDR from website services without SBI is TE ONDERZOEKEN; SBI service code is NVT', () => {
    const websiteOnly = assessLegislation(
      {},
      {
        onderzoek: {
          profiel: {
            producten_diensten: { waarde: ['projectmanagement', 'directievoering'], bronnen: [{ url: 'https://example.com/' }] },
            sector: { waarde: 'adviesbureau' },
          },
        },
      }
    );
    assert.equal(websiteOnly.items.find((i) => i.id === 'eudr')?.status, 'te_onderzoeken');
    assert.ok(/EUDR-goederen/i.test(websiteOnly.items.find((i) => i.id === 'eudr')?.needed || ''));

    const withSbi = assessLegislation(
      {},
      {
        onderzoek: {
          profiel: {
            sbi: {
              status: 'gevonden',
              waarde: '71120',
              bronnen: [{ url: 'https://www.kvk.nl/zoeken', citaat: 'SBI 71120 ingenieurs', validatie: 'gevonden' }],
            },
            producten_diensten: { waarde: ['projectmanagement'], bronnen: [{ url: 'https://example.com/' }] },
          },
        },
      }
    );
    const eudr = withSbi.items.find((i) => i.id === 'eudr');
    assert.equal(eudr?.status, 'niet_van_toepassing');
    assert.match(eudr?.source || '', /SBI 71120/);
  });

  it('energy below both thresholds with hard numbers is NVT; one missing stays TE ONDERZOEKEN', () => {
    const known = assessLegislation(
      {},
      { onderzoek: { extra: { energy_kwh: 10000, gas_m3: 1000 } } }
    );
    assert.equal(known.items.find((i) => i.id === 'energiebesparingsplicht')?.status, 'niet_van_toepassing');

    const partial = assessLegislation({}, { onderzoek: { extra: { energy_kwh: 10000 } } });
    assert.equal(partial.items.find((i) => i.id === 'energiebesparingsplicht')?.status, 'te_onderzoeken');

    const over = assessLegislation({}, { onderzoek: { extra: { energy_kwh: 80_000 } } });
    assert.equal(over.items.find((i) => i.id === 'energiebesparingsplicht')?.status, 'van_toepassing');
  });
});

describe('PCO Management fixture', () => {
  it('computes expected statuses from the real dossier', () => {
    const raw = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'tests/fixtures/pco-dossier.json'), 'utf8')
    );
    const result = assessLegislation(
      { naam: raw.naam, plaats: raw.plaats, website_url: raw.website_url },
      raw.dossier
    );
    const byId = Object.fromEntries(result.items.map((i) => [i.id, i.status]));

    assert.equal(byId.csrd, 'te_onderzoeken');
    assert.equal(byId.value_chain_cap, 'vrijwillig');
    assert.equal(byId.csddd, 'te_onderzoeken');
    assert.equal(byId.eu_taxonomie, 'te_onderzoeken');
    assert.equal(byId.eudr, 'niet_van_toepassing');
    assert.equal(byId.cbam, 'te_onderzoeken');
    assert.equal(byId.energiebesparingsplicht, 'te_onderzoeken');
    assert.equal(byId.co2_prestatieladder, 'indirect_via_keten');

    assert.ok(result.questions.some((q) => /kWh/.test(q)));
    assert.ok(result.questions.some((q) => /CBAM-goederen/.test(q)));
    assert.ok(result.documentRequests.length >= 2);
    assert.match(result.summary, /te onderzoeken/);
    assert.match(result.summary, /via keten/);
    assert.match(result.summary, /^\d+ /);

    const facts = extractLegislationFactsForTest({}, raw.dossier);
    const types = analyzeClientTypes(facts);
    assert.equal(types.constructionInfra, true);
    assert.equal(types.governmentOrTender, true);

    assert.equal(result.referenceDate, '2026-10-20');
    for (const row of result.items) {
      assert.ok(row.legal, `${row.id} must have a legal source`);
      assert.ok(row.legal?.urlArtikel, `${row.id} needs urlArtikel`);
      assert.ok(row.legal?.bronLabel, `${row.id} needs bronLabel`);
    }
    assert.equal(result.items.find((i) => i.id === 'csrd')?.legal?.urlArtikel?.includes('#art_19a'), true);
    assert.equal(result.items.find((i) => i.id === 'eu_taxonomie')?.legal?.key, 'eu_taxonomie');
    assert.equal(result.items.find((i) => i.id === 'co2_prestatieladder')?.legal?.normGeenWet, true);
    assert.match(result.items.find((i) => i.id === 'csrd')?.notes?.join(' ') || '', /Omnibus I \(EU\) 2026\/470/);
    assert.match(result.items.find((i) => i.id === 'csddd')?.notes?.join(' ') || '', /26-07-2029/);
    assert.match(result.items.find((i) => i.id === 'eudr')?.notes?.join(' ') || '', /30-12-2026/);
    assert.match(result.items.find((i) => i.id === 'cbam')?.notes?.join(' ') || '', /30-09-2027/);
    assert.match(result.items.find((i) => i.id === 'energiebesparingsplicht')?.notes?.join(' ') || '', /5\.15a/);
    assert.ok(result.items.find((i) => i.id === 'eudr')?.legal?.opmerking);
  });
});

describe('wetgeving-bronnen', () => {
  it('loads 11 verified sources and matching thresholds', () => {
    assert.equal(WETGEVING_BRONNEN.length, 11);
    assert.equal(WETGEVING_THRESHOLDS.CSRD_FTE, 1000);
    assert.equal(WETGEVING_THRESHOLDS.CSRD_OMZET, 450_000_000);
    assert.equal(WETGEVING_THRESHOLDS.CSDDD_FTE, 5000);
    assert.equal(WETGEVING_THRESHOLDS.CSDDD_OMZET, 1_500_000_000);
    assert.equal(WETGEVING_THRESHOLDS.MICRO_BALANS, 450_000);
    assert.equal(WETGEVING_THRESHOLDS.MICRO_OMZET, 900_000);
    assert.equal(WETGEVING_THRESHOLDS.CBAM_TON, 50);
    const urls = collectLegalSourceUrls();
    assert.ok(urls.some((u) => u.includes('eur-lex.europa.eu')));
    assert.ok(urls.some((u) => u.includes('wetten.overheid.nl')));
    const eudr = getLegalSourceDisplay('eudr');
    assert.ok(eudr?.opmerking && /2026\/2102/.test(eudr.opmerking));
    const csrd = getLegalSourceDisplay('csrd');
    assert.ok(csrd?.wijzigingen.some((w) => /Omnibus I \(EU\) 2026\/470/.test(w.label)));
  });
});
