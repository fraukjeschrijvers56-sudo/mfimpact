import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { assessLegislation, analyzeClientTypes, extractLegislationFactsForTest } from '../lib/legislation-status.ts';

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
    assert.ok(/producten of grondstoffen/i.test(byId.eudr.needed || ''));

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

  it('CSRD with hard FTE below 1000 is NVT even if omzet is unknown', () => {
    const result = assessLegislation(
      {},
      {
        onderzoek: {
          profiel: {
            aantal_medewerkers: {
              status: 'gevonden',
              waarde: '1',
              bronnen: [{ url: 'https://drimble.nl/example' }],
            },
            omzet: { status: 'onbekend', waarde: 'onbekend' },
          },
        },
      }
    );
    const csrd = result.items.find((i) => i.id === 'csrd');
    assert.equal(csrd?.status, 'niet_van_toepassing');
    assert.ok(/FTE 1/.test(csrd?.reasons.join(' ') || ''));
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

    assert.equal(byId.csrd, 'niet_van_toepassing');
    assert.equal(byId.value_chain_cap, 'vrijwillig');
    assert.equal(byId.csddd, 'niet_van_toepassing');
    assert.equal(byId.eu_taxonomie, 'niet_van_toepassing');
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
  });
});
