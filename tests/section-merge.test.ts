import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeWithEditedFields, stripOnderzoekPrefix } from '../lib/merge-edited-fields.ts';

describe('mergeWithEditedFields', () => {
  it('preserves onderzoek.gesprek.next_steps and onderzoek.profiel.linkedin across a refresh', () => {
    const oldOnderzoek = {
      profiel: { linkedin: { url: 'https://linkedin.com/company/manual-edit', type: 'bedrijfspagina' } },
      gesprek: { next_steps: [{ stap: 'Manual step 1', eigenaar: 'klant', termijn: 'week 1' }] },
      samenvatting: { waarde: 'Old summary' },
    };

    const newOnderzoek = {
      profiel: { linkedin: { waarde: 'https://linkedin.com/company/ai-generated' } },
      gesprek: {
        next_steps: [{ stap: 'AI step', eigenaar: 'MF Impact', termijn: 'week 3' }],
        agenda: [{ punt: 'Kick-off', minuten: 15 }],
      },
      samenvatting: { waarde: 'New AI summary' },
    };

    const editedFields = ['onderzoek.gesprek.next_steps', 'onderzoek.profiel.linkedin'].map(stripOnderzoekPrefix);
    const result = mergeWithEditedFields(newOnderzoek, oldOnderzoek, editedFields);

    assert.deepEqual(result.gesprek.next_steps, [{ stap: 'Manual step 1', eigenaar: 'klant', termijn: 'week 1' }]);
    assert.equal(result.profiel.linkedin.url, 'https://linkedin.com/company/manual-edit');
    assert.equal(result.samenvatting.waarde, 'New AI summary');
    assert.deepEqual(result.gesprek.agenda, [{ punt: 'Kick-off', minuten: 15 }]);
    assert.equal(result.onderzoek, undefined);
  });

  it('does not write junk nested onderzoek.onderzoek.gesprek keys', () => {
    const oldData = { gesprek: { next_steps: ['Old'] } };
    const newData = { gesprek: { next_steps: ['New'], agenda: ['Item 1'] } };
    const unstripped = mergeWithEditedFields(newData, oldData, ['onderzoek.gesprek.next_steps']);
    assert.ok(unstripped.onderzoek, 'unstripped paths create a nested onderzoek key');

    const stripped = mergeWithEditedFields(newData, oldData, ['onderzoek.gesprek.next_steps'].map(stripOnderzoekPrefix));
    assert.deepEqual(stripped.gesprek.next_steps, ['Old']);
    assert.deepEqual(stripped.gesprek.agenda, ['Item 1']);
    assert.equal(stripped.onderzoek, undefined);
  });
});
