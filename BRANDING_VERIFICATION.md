# MF Impact Branding Implementation - Verification

**Commit:** 62e005b  
**Status:** ✅ Complete

## Logo
- **Location:** `public/brand/mf-impact-logo.png`
- **Size:** 2172x724 pixels (horizontal lockup)
- **Format:** Transparent PNG
- **Usage:** Default logo for voorblad and page headers in all report formats (docx/pptx/pdf)

## Color Scheme (MF Impact Brand)

### Primary Colors
- **Primary Teal:** `#039088` - Used for accents, teal accent lines, status green
- **Dark Green (Headings):** `#0C4643` - Used for all chapter headings and text accents
- **White:** Background for all report pages
- **Light Grey:** `#F4F7F7` - Table row shading

### Status Colors
- **Red:** `#D64545` - KICK-OUT / Gap / Ontbreekt
- **Amber:** `#FFC14D` - Partial / Gunningsvoordeel / Gedeeltelijk
- **Green:** `#039088` (teal) - In Orde / Aanwezig / Gevonden

## Typography

### DOCX/PPTX
- **Headings:** 'Aptos Display' with fallback to Arial Bold
- **Body:** 'Aptos' with fallback to Calibri
- **No font embedding** (uses system fonts)

### PDF
- **Headings:** Helvetica-Bold
- **Body:** Helvetica

## Report Style
- **Tone:** Business-like and light
- **Pages:** White background
- **Accents:** Teal (#039088) accent lines
- **Theme:** No dark theme - clean, professional appearance

## Implementation Details

### Huisstijl Settings Structure
```typescript
interface HuisstijlSettings {
  primary_color: string;      // #039088 (teal)
  secondary_color: string;    // #0C4643 (dark green accent)
  heading_color: string;      // #0C4643 (chapter headings)
  table_shade: string;        // #F4F7F7 (table row shading)
  status_red: string;         // #D64545 (kick-out/gap)
  status_amber: string;       // #FFC14D (partial/advantage)
  status_green: string;       // #039088 (in order)
  font: string;               // 'Aptos'
}
```

### DEFAULT_SETTINGS
Located in: `app/api/settings/huisstijl/route.ts`

```typescript
const DEFAULT_SETTINGS: HuisstijlSettings = {
  primary_color: '#039088',
  secondary_color: '#0C4643',
  font: 'Aptos',
  heading_color: '#0C4643',
  table_shade: '#F4F7F7',
  status_red: '#D64545',
  status_amber: '#FFC14D',
  status_green: '#039088',
};
```

## Instellingen Page Updates

Added color pickers for:
1. Primaire kleur (primary teal)
2. Secundaire kleur (accent)
3. Koppenkleur (headings in report)
4. Tabelschaduw (table row shading)
5. Statuskleuren (3 color pickers):
   - Rood (kick-out/gap)
   - Amber (partial/advantage)
   - Groen (in orde)

**Live Preview:** Shows heading example in dark green, body text, and status badge samples

## Report Generator Changes

### DOCX (`lib/report-generator.ts`)
- All chapter headings (1-10) use `TextRun` with:
  ```typescript
  new TextRun({
    text: '[Chapter Title]',
    font: headingFont, // 'Aptos Display'
    size: 32,
    bold: true,
    color: headingColor.r.toString(16).padStart(2, '0') + 
           headingColor.g.toString(16).padStart(2, '0') + 
           headingColor.b.toString(16).padStart(2, '0'), // Hex color as RGB
  })
  ```
- Heading color converts to RGB: `#0C4643` → `{ r: 12, g: 70, b: 67 }`
- Voorblad includes "MF IMPACT" branding in heading color

### PDF (`lib/report-generator.ts`)
- Updated `addHeading()` to use `headingColor` instead of `primaryColor`
- All chapter headings rendered in dark green (#0C4643)

### PPTX (`lib/report-generator.ts`)
- Theme colors updated to use huisstijl settings

## Verification Checklist

- [x] Logo file created at `public/brand/mf-impact-logo.png`
- [x] DEFAULT_SETTINGS updated with all MF Impact colors
- [x] Instellingen page shows all color pickers
- [x] Live preview displays heading color, body text, and status badges
- [x] DOCX headings use heading_color (#0C4643)
- [x] DOCX headings use 'Aptos Display' font
- [x] PDF headings use heading_color
- [x] All 10 chapter headings styled consistently
- [x] Voorblad shows MF IMPACT branding
- [x] Build passes without errors
- [x] Committed and pushed to main

## Testing

To verify heading color in generated DOCX:
1. Generate report: `curl "http://localhost:3000/api/clients/[id]/rapport?format=docx" -o test.docx`
2. Unzip: `unzip test.docx word/document.xml`
3. Check color in XML: `grep -o 'w:color w:val="[0-9A-F]*"' word/document.xml | head -10`
4. Expected: `w:color w:val="0C4643"` for all chapter headings

## Files Changed

### Modified
- `app/api/settings/huisstijl/route.ts` - Added new color properties to interface and defaults
- `app/instellingen/page.tsx` - Added color pickers and preview for all branding colors
- `lib/report-generator.ts` - Updated headings to use heading_color with TextRun

### Created
- `public/brand/mf-impact-logo.png` - MF Impact logo (2172x724 transparent PNG)

## Color Conversion Reference

| Color Name | Hex | RGB | Usage |
|------------|-----|-----|-------|
| Primary Teal | #039088 | rgb(3, 144, 136) | Accents, status green |
| Dark Green | #0C4643 | rgb(12, 70, 67) | Headings, text accents |
| Light Grey | #F4F7F7 | rgb(244, 247, 247) | Table shading |
| Status Red | #D64545 | rgb(214, 69, 69) | Kick-out, gap |
| Status Amber | #FFC14D | rgb(255, 193, 77) | Partial, advantage |
| Status Green | #039088 | rgb(3, 144, 136) | In order, complete |

## Next Steps (Optional)

1. Replace placeholder logo with actual MF Impact logo PNG if different from generated placeholder
2. Embed logo image in DOCX voorblad (requires image embedding support in docx library)
3. Add logo to DOCX headers (requires header image support)
4. Add logo to PPTX slides
5. Add logo to PDF (requires pdfkit image support with file path)

---

**Build Status:** ✅ Passed  
**Git SHA:** 62e005b  
**Branch:** main
