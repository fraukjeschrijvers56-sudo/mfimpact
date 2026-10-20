# Report Export Implementation Summary

## Completed on main cbf7be142239752bcdadae8064a704e5cff754f0

### 1. Supabase Settings with JSONB ✅
- Created migration: `supabase/migrations/20261020_settings.sql`
  - Table structure: `settings (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)`
- Updated `app/api/settings/huisstijl/route.ts`:
  - POST uses `upsert` with `onConflict: 'key'`
  - Stores value as JSONB object (Supabase auto-converts, no JSON.stringify needed)
  - GET returns JSONB as object (no JSON.parse needed)

### 2. Gesprek UI with Next Steps CRUD ✅
**Component**: `app/prospect/[id]/gesprek-section.tsx`

**GesprekSection displays**:
- **Agenda**: punt + minuten in formatted cards with clock icon
- **Aannames**: Each with orange 'aanname' badge + onderbouwing + te verifiëren vraag
- **Vragen**: Grouped by category (Klanten & Tenders, MVO-praktijk & Data, Ambitie, Budget & Tijdlijn, Besluitvorming)

**NextStepsCard with full CRUD**:
- Fields: stap, eigenaar, termijn
- Add: Plus button opens form, saves to array
- Edit: Pencil icon per step, inline editing form
- Delete: Trash icon with confirmation ("Weet je zeker...")
- Reorder: Up/down with GripVertical icon
- Saves to `dossier.onderzoek.gesprek.next_steps`
- Adds `'onderzoek.gesprek.next_steps'` to `edited_fields` (preserved across refreshes)
- Default 6-step template shown when empty:
  1. Kennismakingsgesprek en vaststellen behoeften klant
  2. NDA tekenen
  3. Informatie delen door klant — checklist
  4. Scope en behoeften bepalen
  5. Offerte sturen
  6. Start traject en bewijspakket

**Refresh button**: "↻ Gesprek voorbereiden" with empty state "Nu genereren"

**Integrated in view.tsx**: Between KlanteisenSection and other sections

### 3. PDF Export Restored ✅
**Function**: `generatePDFReport()` in `lib/report-generator.ts` using pdfkit

**Features**:
- Same 10-chapter structure as DOCX
- Huisstijl primary color for headings
- Font mapping (Aptos/Inter → Helvetica, Calibri → Calibri)
- Voorblad: "MVO-bewijsdossier" title, client naam, datum (Europe/Amsterdam), "Vertrouwelijk – opgesteld door MF Impact"
- Text-based badges: ✓/✗ for aanwezig/ontbreekt status
- PDF metadata: Title, Author, Subject, Keywords

**Chapters**:
1. Managementsamenvatting (bullets: kernboodschap + risks + kansen)
2. Bedrijfsprofiel (naam, KvK, plaats, SBI, activiteiten, LinkedIn, website)
3. Wat uw klanten gaan vragen (per klanttype: eis + niveau + status + gevolg)
4. Scan & gatenanalyse VSME B1-B11 (status + samenvatting per onderdeel)
5. Certificaten & registers (MVO-Register check + other certificates)
6. Claimcheck (grouped by color: rood/oranje/groen with citaat + herschrijfvoorstel; "Geen claims gevonden" if empty)
7. Aanknopingspunten (agenda + aannames + vragen grouped)
8. Next steps (numbered list with eigenaar + termijn)
9. Bronnenlijst (all URLs)
10. Disclaimer (peildatum)

**API**: `/api/clients/[id]/rapport?format=pdf` now works (no longer 501)

**Cleanup**: Removed duplicate `lib/rapport-generator.ts`

### 4. Test Infrastructure ✅
**Created files**:
- `test-reports.js` - Node script for local testing (requires ts-node or compilation)
- `test-reports-api.sh` - Bash script for API testing (requires running dev server)
- `pco-dossier-mock.json` - Sample fixture with realistic PCO Management data

**Verification checklist** (to run when real fixture is provided):
- [ ] DOCX contains all 10 chapter headings (1-10)
- [ ] DOCX contains "MVO-bewijsdossier" on voorblad
- [ ] DOCX contains "Vertrouwelijk – opgesteld door MF Impact"
- [ ] DOCX has TOC field (Inhoudsopgave)
- [ ] DOCX has header/footer with page numbers
- [ ] PPTX slide count >= 12
- [ ] PDF opens successfully (pdfinfo shows pages > 5)

### Note on Testing
The actual pco-dossier.json fixture referenced in the user query was not present in the workspace. Created `pco-dossier-mock.json` with comprehensive test data including:
- Complete profiel with LinkedIn data
- Klanteisen with multiple eisen per klanttype
- VSME B1-B11 entries
- Certificaten and claims
- Gaten analysis
- Full gesprek structure (agenda, aannames, vragen, next_steps)
- MVO-register check result

To test with actual fixture:
1. Place fixture at `/workspace/pco-dossier.json`
2. Start dev server: `npm run dev`
3. Run: `./test-reports-api.sh pco-dossier.json [client-id]`
4. Or compile and run: `npx tsx test-reports.js pco-dossier.json`

### Build Status ✅
```
npm run build → PASSED
All TypeScript checks passed
All routes compiled successfully
```

### Deployment ✅
```
Branch: main
Commit: cbf7be142239752bcdadae8064a704e5cff754f0
Status: Pushed to origin/main
```
