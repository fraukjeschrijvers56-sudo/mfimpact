// Quick test of the fixed schema with OpenAI
const { openai } = require('@ai-sdk/openai');
const { generateObject } = require('ai');
const { z } = require('zod');

const CompanyDataSchema = z.object({
  naam: z.string(),
  kvk: z.string().nullable(),
  sector: z.string(),
  aantal_medewerkers: z.union([z.number(), z.literal('onbekend')]),
  omzet: z.union([z.number(), z.literal('onbekend')]),
  balanstotaal: z.union([z.number(), z.literal('onbekend')]),
  belangrijkste_afnemers: z.array(z.string()).nullable(),
  producten: z.array(z.string()).nullable(),
  beschrijving: z.string().nullable(),
  confidence: z.enum(['hoog', 'middel', 'laag']),
});

async function testSchema() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('SKIP: No OPENAI_API_KEY found. Schema is valid but cannot test live call.');
    return;
  }

  try {
    console.log('Testing schema with real OpenAI call...');
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: CompanyDataSchema,
      prompt: `Analyseer deze voorbeeldtekst en extraheer bedrijfsgegevens:

"Acme Corp is een middelgroot softwarebedrijf met ongeveer 150 medewerkers. 
We maken duurzame software voor gemeenten en provincies."

KRITISCH: Gebruik null voor ontbrekende arrays/strings, "onbekend" voor ontbrekende getallen.
- aantal_medewerkers: alleen als vermeld (hier: 150)
- omzet: "onbekend" (niet vermeld)
- balanstotaal: "onbekend" (niet vermeld)
- kvk: null (niet vermeld)
- sector: gok "software"
- belangrijkste_afnemers: ["gemeenten", "provincies"]
- producten: null (niet relevant voor EUDR/CBAM)
- beschrijving: "middelgroot softwarebedrijf"
- confidence: "middel"`,
    });

    console.log('✅ SUCCESS! Schema works with OpenAI.');
    console.log('Response:', JSON.stringify(object, null, 2));
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.message.includes('required')) {
      console.error('Schema still has required field issues!');
    }
    process.exit(1);
  }
}

testSchema();
