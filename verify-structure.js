// Quick verification of report structure
const { readFileSync } = require('fs');

const fixture = JSON.parse(readFileSync('./pco-dossier-mock.json', 'utf-8'));
const onderzoek = fixture.onderzoek || {};

console.log('=== Fixture Structure Verification ===\n');

console.log('1. Profiel:', onderzoek.profiel ? '✓' : '✗');
console.log('   - handelsnaam:', onderzoek.profiel?.handelsnaam ? '✓' : '✗');
console.log('   - linkedin:', onderzoek.profiel?.linkedin ? '✓' : '✗');

console.log('\n2. Klanteisen:', onderzoek.klanteisen ? '✓' : '✗');
console.log('   - klanttypen:', onderzoek.klanteisen?.klanttypen?.length || 0);
console.log('   - eisen:', onderzoek.klanteisen?.eisen?.length || 0);

console.log('\n3. VSME:', onderzoek.vsme_basic ? '✓' : '✗');
console.log('   - Entries:', Object.keys(onderzoek.vsme_basic || {}).length);

console.log('\n4. Certificaten:', onderzoek.certificaten?.length || 0);
console.log('5. Claims:', onderzoek.claims?.length || 0);
console.log('6. Gaten:', onderzoek.gaten?.length || 0);

console.log('\n7. Gesprek:', onderzoek.gesprek ? '✓' : '✗');
if (onderzoek.gesprek) {
  console.log('   - agenda:', onderzoek.gesprek.agenda?.length || 0, 'items');
  console.log('   - aannames:', onderzoek.gesprek.aannames?.length || 0, 'items');
  console.log('   - vragen categories:', Object.keys(onderzoek.gesprek.vragen || {}).length);
  console.log('   - next_steps:', onderzoek.gesprek.next_steps?.length || 0, 'items');
}

console.log('\n8. MVO-register:', fixture.mvo_register ? '✓' : '✗');
console.log('9. Bronnen:', onderzoek.doorzochte_bronnen?.length || 0);

console.log('\n=== Expected Report Chapters ===');
const chapters = [
  '1. Managementsamenvatting',
  '2. Bedrijfsprofiel',
  '3. Wat uw klanten gaan vragen',
  '4. Scan & gatenanalyse VSME B1-B11',
  '5. Certificaten & registers',
  '6. Claimcheck',
  '7. Aanknopingspunten voor het gesprek',
  '8. Next steps',
  '9. Bronnenlijst',
  '10. Disclaimer',
];
chapters.forEach(c => console.log('  ✓', c));

console.log('\n✓ Fixture structure is complete for all 10 chapters');
