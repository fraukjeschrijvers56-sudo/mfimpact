/**
 * Report generation for Word (docx) and PowerPoint (pptx)
 * All text in Dutch, using huisstijl colors and fonts
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableCell,
  TableRow,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  WidthType,
  TableOfContents,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
interface HuisstijlSettings {
  primary_color: string;
  secondary_color: string;
  font: string;
}
interface ReportData {
  client: any;
  dossier: any;
  huisstijl: HuisstijlSettings;
  companyLogoUrl?: string | null;
  clientLogoUrl?: string | null;
}
/**
 * Convert hex color to RGB object
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 16, g: 185, b: 129 }; // default emerald
}
/**
 * Format date in Dutch
 */
function formatDateDutch(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Amsterdam',
  }).format(date);
}
/**
 * Generate Word document (docx)
 */
export async function generateWordReport(data: ReportData): Promise<Buffer> {
  const { client, dossier, huisstijl } = data;
  const onderzoek = dossier.onderzoek || dossier;
  const profiel = onderzoek.profiel || {};
  const vsme = onderzoek.vsme_basic || onderzoek.vsme || {};
  const certificaten = Array.isArray(onderzoek.certificaten) ? onderzoek.certificaten : [];
  const claims = Array.isArray(onderzoek.claims) ? onderzoek.claims : [];
  const gaten = Array.isArray(onderzoek.gaten) ? onderzoek.gaten : [];
  const klanteisen = onderzoek.klanteisen || {};
  const gesprek = onderzoek.gesprek || {};
  const bronnen = Array.isArray(onderzoek.doorzochte_bronnen) ? onderzoek.doorzochte_bronnen : [];
  const mvoRegister = dossier.mvo_register || null;
  const primaryColor = hexToRgb(huisstijl.primary_color);
  const font = huisstijl.font === 'Aptos' ? 'Aptos' : huisstijl.font;
  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'MF Impact',
                    bold: true,
                    size: 20,
                  }),
                  new TextRun({
                    text: '                                          ',
                  }),
                  new TextRun({
                    text: 'Vertrouwelijk',
                    size: 18,
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Pagina ',
                    size: 18,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children: [
          // Voorblad
          new Paragraph({
            text: '',
            spacing: { before: 2000 },
          }),
          new Paragraph({
            text: 'MVO-bewijsdossier',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: client.naam || 'Onbekende klant',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: formatDateDutch(),
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: 'Vertrouwelijk – opgesteld door MF Impact',
            alignment: AlignmentType.CENTER,
            spacing: { after: 2000 },
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // Inhoudsopgave
          new Paragraph({
            text: 'Inhoudsopgave',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 },
          }),
          new TableOfContents('Inhoudsopgave', {
            hyperlink: true,
            headingStyleRange: '1-3',
          }),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 1. Managementsamenvatting
          new Paragraph({
            text: '1. Managementsamenvatting',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateManagementSamenvatting(klanteisen, gaten, onderzoek),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 2. Bedrijfsprofiel
          new Paragraph({
            text: '2. Bedrijfsprofiel',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateBedrijfsprofiel(profiel, client),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 3. Wat uw klanten gaan vragen
          new Paragraph({
            text: '3. Wat uw klanten gaan vragen',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateKlanteisen(klanteisen),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 4. Scan & gatenanalyse VSME B1-B11
          new Paragraph({
            text: '4. Scan & gatenanalyse VSME B1-B11',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateVSME(vsme),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 5. Certificaten & registers
          new Paragraph({
            text: '5. Certificaten & registers',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateCertificaten(certificaten, mvoRegister),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 6. Claimcheck
          new Paragraph({
            text: '6. Claimcheck',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateClaimcheck(claims),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 7. Aanknopingspunten voor het gesprek
          new Paragraph({
            text: '7. Aanknopingspunten voor het gesprek',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateGesprek(gesprek),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 8. Next steps
          new Paragraph({
            text: '8. Next steps',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateNextSteps(gesprek.next_steps || []),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 9. Bronnenlijst
          new Paragraph({
            text: '9. Bronnenlijst',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateBronnenlijst(bronnen),
          new Paragraph({
            children: [new PageBreak()],
          }),
          // 10. Disclaimer
          new Paragraph({
            text: '10. Disclaimer',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          ...generateDisclaimer(),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}
// Helper functions for each section
function generateManagementSamenvatting(klanteisen: any, gaten: any[], onderzoek: any): Paragraph[] {
  const eisen = klanteisen.eisen || [];
  const kickouts = eisen.filter((e: any) => e.niveau === 'KICK-OUT' && e.status === 'ontbreekt');
  const hoogGaten = gaten.filter((g: any) => String(g.prioriteit).toLowerCase() === 'hoog');
  const bullets = [
    onderzoek.samenvatting || 'Geen samenvatting beschikbaar.',
    kickouts.length > 0
      ? `RISICO: ${kickouts.length} kick-out eis(en) ontbreken voor tenderkansen.`
      : null,
    hoogGaten.length > 0
      ? `ACTIE: ${hoogGaten.length} gaten met hoge prioriteit moeten worden aangepakt.`
      : null,
    eisen.filter((e: any) => e.status === 'aanwezig').length > 0
      ? `KANS: Meerdere eisen al op orde, goede uitgangspositie voor MVO-traject.`
      : null,
  ].filter(Boolean);
  return bullets.map(
    (bullet) =>
      new Paragraph({
        text: `• ${bullet}`,
        spacing: { after: 200 },
      })
  );
}
function generateBedrijfsprofiel(profiel: any, client: any): Paragraph[] {
  const getValue = (field: any) => {
    if (field && typeof field === 'object' && 'waarde' in field) return field.waarde;
    return field;
  };
  const fields = [
    ['Naam', getValue(profiel.handelsnaam) || client.naam],
    ['KvK-nummer', getValue(profiel.kvk_nummer) || client.kvk],
    ['Plaats', getValue(profiel.hoofdvestiging) || client.plaats],
    ['SBI/Sector', getValue(profiel.sbi) || getValue(profiel.sector) || client.sector],
    ['Activiteiten', getValue(profiel.producten_diensten)],
    ['Klanttypen', getValue(profiel.afnemers_markten)],
    ['Website', client.website_url],
  ];
  const linkedinData = profiel.linkedin;
  if (linkedinData) {
    const linkedinUrl = linkedinData.url || (typeof linkedinData === 'string' ? linkedinData : null);
    if (linkedinUrl) {
      const type =
        linkedinData.type === 'eigenaar' && linkedinData.naam
          ? `Eigenaar: ${linkedinData.naam}`
          : linkedinData.type === 'bedrijfspagina'
          ? 'Bedrijfspagina'
          : 'LinkedIn';
      fields.push(['LinkedIn', `${type} - ${linkedinUrl}`]);
    }
  }
  return fields
    .filter(([, value]) => value && value !== 'onbekend')
    .map(
      ([label, value]) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun({ text: String(value) }),
          ],
          spacing: { after: 150 },
        })
    );
}
function generateKlanteisen(klanteisen: any): Paragraph[] {
  const eisen = klanteisen.eisen || [];
  if (eisen.length === 0) {
    return [
      new Paragraph({
        text: 'Nog niet gegenereerd.',
      }),
    ];
  }
  const klanttypenGroups: Record<string, any[]> = {};
  eisen.forEach((eis: any) => {
    const kt = eis.klanttype || 'Overig';
    if (!klanttypenGroups[kt]) klanttypenGroups[kt] = [];
    klanttypenGroups[kt].push(eis);
  });
  const paragraphs: Paragraph[] = [];
  Object.entries(klanttypenGroups).forEach(([klanttype, eisenList]) => {
    paragraphs.push(
      new Paragraph({
        text: klanttype,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      })
    );
    eisenList.forEach((eis: any) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${eis.eis}`, bold: true }),
            new TextRun({ text: ` [${eis.niveau}] ` }),
            new TextRun({
              text: eis.status === 'aanwezig' ? '✓ Aanwezig' : eis.status === 'ontbreekt' ? '✗ Ontbreekt' : '? Onbekend',
            }),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Gevolg: ${eis.gevolg}`,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: `Actie: ${eis.bewijsactie}`,
          spacing: { after: 200 },
        })
      );
    });
  });
  return paragraphs;
}
function generateVSME(vsme: any): Paragraph[] {
  if (!vsme || Object.keys(vsme).length === 0) {
    return [
      new Paragraph({
        text: 'Nog niet gegenereerd.',
      }),
    ];
  }
  const VSME_TITLES: Record<string, string> = {
    B1: 'Grondslag en opzet rapport',
    B2: 'Beleid en praktijken duurzaamheid',
    B3: 'Energie en broeikasgassen (scope 1 en 2)',
    B4: 'Verontreiniging',
    B5: 'Biodiversiteit',
    B6: 'Water',
    B7: 'Grondstoffen, circulariteit, afval',
    B8: 'Personeel',
    B9: 'Gezondheid en veiligheid',
    B10: 'Beloning, cao, opleiding',
    B11: 'Corruptie en omkoping',
  };
  const paragraphs: Paragraph[] = [];
  Object.entries(vsme).forEach(([key, value]: [string, any]) => {
    const title = VSME_TITLES[key] || key;
    const status = value.status || 'onbekend';
    const samenvatting = value.samenvatting || 'Geen details';
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${key}: ${title} `, bold: true }),
          new TextRun({
            text: status === 'aanwezig' ? '[✓ Aanwezig]' : status === 'ontbrekend' ? '[✗ Ontbreekt]' : '[? Onbekend]',
          }),
        ],
        spacing: { after: 100 },
      }),
      new Paragraph({
        text: samenvatting,
        spacing: { after: 200 },
      })
    );
  });
  return paragraphs;
}
function generateCertificaten(certificaten: any[], mvoRegister: any): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  // MVO-Register check
  if (mvoRegister) {
    paragraphs.push(
      new Paragraph({
        text: 'MVO-Register (direct registercheck)',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Status: ', bold: true }),
          new TextRun({
            text:
              mvoRegister.status === 'geregistreerd'
                ? '✓ Geregistreerd'
                : mvoRegister.status === 'niet_gevonden'
                ? '✗ Niet gevonden'
                : '? Onbekend',
          }),
        ],
        spacing: { after: 200 },
      })
    );
    if (mvoRegister.niveau_of_score) {
      paragraphs.push(
        new Paragraph({
          text: `Score: ${mvoRegister.niveau_of_score}`,
          spacing: { after: 200 },
        })
      );
    }
  }
  // Other certificates
  if (certificaten.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: 'Gevonden certificaten',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      })
    );
    certificaten.forEach((cert: any) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${cert.platform || cert.naam}: `, bold: true }),
            new TextRun({ text: cert.naam || '' }),
            cert.niveau_of_score ? new TextRun({ text: ` (${cert.niveau_of_score})` }) : new TextRun({ text: '' }),
            new TextRun({
              text:
                cert.status === 'gevonden'
                  ? ' ✓ Gevonden in register'
                  : cert.status === 'niet_gevonden_in_register'
                  ? ' ✗ Niet gevonden in register'
                  : '',
            }),
          ],
          spacing: { after: 150 },
        })
      );
    });
  } else {
    paragraphs.push(
      new Paragraph({
        text: 'Geen certificaten gevonden.',
      })
    );
  }
  return paragraphs;
}
function generateClaimcheck(claims: any[]): Paragraph[] {
  if (claims.length === 0) {
    return [
      new Paragraph({
        text: 'Geen claims gevonden.',
      }),
    ];
  }
  const paragraphs: Paragraph[] = [];
  const grouped: Record<string, any[]> = { rood: [], oranje: [], groen: [] };
  claims.forEach((claim: any) => {
    const color = String(claim.beoordeling || claim.color || 'groen').toLowerCase();
    if (color === 'rood' || color === 'red') grouped.rood.push(claim);
    else if (color === 'oranje' || color === 'orange') grouped.oranje.push(claim);
    else grouped.groen.push(claim);
  });
  (['rood', 'oranje', 'groen'] as const).forEach((color) => {
    if (grouped[color].length > 0) {
      paragraphs.push(
        new Paragraph({
          text: color.charAt(0).toUpperCase() + color.slice(1),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        })
      );
      grouped[color].forEach((claim: any) => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Citaat: ', bold: true }),
              new TextRun({ text: `"${claim.citaat}"` }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `Herschrijfvoorstel: ${claim.herschrijfvoorstel || claim.advice || 'Geen voorstel'}`,
            spacing: { after: 200 },
          })
        );
      });
    }
  });
  return paragraphs;
}
function generateGesprek(gesprek: any): Paragraph[] {
  if (!gesprek || Object.keys(gesprek).length === 0) {
    return [
      new Paragraph({
        text: 'Nog niet gegenereerd.',
      }),
    ];
  }
  const paragraphs: Paragraph[] = [];
  // Agenda
  if (gesprek.agenda && gesprek.agenda.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: 'Agenda',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      })
    );
    gesprek.agenda.forEach((item: any) => {
      paragraphs.push(
        new Paragraph({
          text: `• ${item.punt} (${item.minuten} min)`,
          spacing: { after: 100 },
        })
      );
    });
  }
  // Aannames
  if (gesprek.aannames && gesprek.aannames.length > 0) {
    paragraphs.push(
      new Paragraph({
        text: 'Aannames',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );
    gesprek.aannames.forEach((item: any) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Aanname: ', bold: true }),
            new TextRun({ text: item.aanname }),
          ],
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: `Onderbouwing: ${item.onderbouwing}`,
          spacing: { after: 50 },
        }),
        new Paragraph({
          text: `Vraag: ${item.te_verifieren_vraag}`,
          spacing: { after: 200 },
        })
      );
    });
  }
  // Vragen
  if (gesprek.vragen && Object.keys(gesprek.vragen).length > 0) {
    paragraphs.push(
      new Paragraph({
        text: 'Vragen',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );
    Object.entries(gesprek.vragen).forEach(([category, questions]: [string, any]) => {
      if (Array.isArray(questions) && questions.length > 0) {
        paragraphs.push(
          new Paragraph({
            text: category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 150, after: 100 },
          })
        );
        questions.forEach((q: string) => {
          paragraphs.push(
            new Paragraph({
              text: `• ${q}`,
              spacing: { after: 100 },
            })
          );
        });
      }
    });
  }
  return paragraphs;
}
function generateNextSteps(nextSteps: any[]): Paragraph[] {
  if (!nextSteps || nextSteps.length === 0) {
    return [
      new Paragraph({
        text: 'Nog niet gegenereerd.',
      }),
    ];
  }
  return nextSteps.map(
    (step: any, idx: number) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${idx + 1}. `, bold: true }),
          new TextRun({ text: step.stap }),
          new TextRun({ text: ` (${step.eigenaar}, ${step.termijn})` }),
        ],
        spacing: { after: 150 },
      })
  );
}
function generateBronnenlijst(bronnen: string[]): Paragraph[] {
  if (bronnen.length === 0) {
    return [
      new Paragraph({
        text: 'Geen bronnen beschikbaar.',
      }),
    ];
  }
  return bronnen.map(
    (url: string) =>
      new Paragraph({
        text: `• ${url}`,
        spacing: { after: 100 },
      })
  );
}
function generateDisclaimer(): Paragraph[] {
  return [
    new Paragraph({
      text: 'Dit rapport is opgesteld door MF Impact op basis van publiek beschikbare informatie en is bedoeld als indicatief overzicht. De informatie is zorgvuldig verzameld, maar MF Impact kan geen garantie bieden voor volledigheid of juistheid. Dit rapport vormt geen juridisch advies. Alle beoordelingen zijn indicatief.',
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: `Peildatum: ${formatDateDutch()}`,
      spacing: { after: 100 },
    }),
  ];
}
/**
 * Generate PowerPoint presentation (pptx)
 */
export async function generatePowerPointReport(data: ReportData): Promise<Buffer> {
  const { client, dossier, huisstijl } = data;
  const pptx = new PptxGenJS();
  // Set theme
  pptx.layout = 'LAYOUT_16x9';
  pptx.theme = {
    headFontFace: huisstijl.font,
    bodyFontFace: huisstijl.font,
  };
  const onderzoek = dossier.onderzoek || dossier;
  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: huisstijl.primary_color.replace('#', '') };
  titleSlide.addText('MVO-bewijsdossier', {
    x: 1,
    y: 2,
    w: 8,
    h: 1,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });
  titleSlide.addText(client.naam || 'Onbekende klant', {
    x: 1,
    y: 3.5,
    w: 8,
    h: 0.8,
    fontSize: 32,
    color: 'FFFFFF',
    align: 'center',
  });
  titleSlide.addText(`${formatDateDutch()} • Vertrouwelijk`, {
    x: 1,
    y: 4.8,
    w: 8,
    h: 0.5,
    fontSize: 18,
    color: 'FFFFFF',
    align: 'center',
  });
  // Content slides (simplified for now)
  const sections = [
    { title: 'Managementsamenvatting', content: onderzoek.samenvatting || 'Nog niet beschikbaar' },
    { title: 'Bedrijfsprofiel', content: `${client.naam}\n${client.plaats}\n${client.website_url}` },
    { title: 'Wat uw klanten gaan vragen', content: 'Zie rapport voor details' },
    { title: 'VSME-scan', content: 'Zie rapport voor details' },
    { title: 'Certificaten', content: 'Zie rapport voor details' },
    { title: 'Gesprekvoorbereiding', content: 'Zie rapport voor details' },
  ];
  sections.forEach((section) => {
    const slide = pptx.addSlide();
    slide.addText(section.title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 1,
      fontSize: 32,
      bold: true,
      color: huisstijl.primary_color.replace('#', ''),
    });
    slide.addText(section.content, {
      x: 0.5,
      y: 1.8,
      w: 9,
      h: 4,
      fontSize: 18,
      color: '000000',
    });
  });
  // Generate buffer
  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
}