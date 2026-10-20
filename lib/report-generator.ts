/**
 * Report generation for Word (docx), PowerPoint (pptx) and PDF.
 * Light, business-like MF Impact huisstijl — white pages, teal accents.
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
  ImageRun,
  ShadingType,
  VerticalAlign,
} from 'docx';
import PptxGenJS from 'pptxgenjs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getValueOrString, hexColor, type HuisstijlSettings } from './huisstijl';
import { getDefaultNextSteps, type NextStep } from './default-next-steps';
import { loadReportLogo, logoDataUri } from './report-logo';
import {
  assessLegislation,
  ESG_DISCLAIMER,
  ESG_REFERENCE_DATE,
  type LegislationAssessment,
  type LegislationItem,
  type LegislationStatus,
} from './legislation-status';

interface ReportData {
  client: any;
  dossier: any;
  huisstijl: HuisstijlSettings;
  companyLogoUrl?: string | null;
  clientLogoUrl?: string | null;
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

const CHAPTERS = [
  '1. Managementsamenvatting',
  '2. Bedrijfsprofiel',
  '2b. Wetgeving & drempels',
  '3. Wat uw klanten gaan vragen',
  '4. Scan & gatenanalyse VSME B1-B11',
  '5. Certificaten & registers',
  '6. Claimcheck',
  '7. Aanknopingspunten voor het gesprek',
  '8. Next steps',
  '9. Bronnenlijst',
  '10. Disclaimer',
];

function formatDateDutch(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Amsterdam',
  }).format(date);
}

function unknownAsText(value: string): string {
  return value && value.trim() ? value : 'onbekend';
}

function linkedinDisplay(field: any): string {
  if (!field) return 'onbekend';
  if (typeof field === 'string') return field;
  const url = field.url || (field.waarde && typeof field.waarde === 'object' ? field.waarde.url : null);
  const waarde = getValueOrString(field);
  if (url && url !== 'onbekend') {
    const type =
      field.type === 'eigenaar' && field.naam
        ? `Eigenaar: ${field.naam}`
        : field.type === 'bedrijfspagina'
          ? 'Bedrijfspagina'
          : 'LinkedIn';
    return `${type} — ${url}`;
  }
  return unknownAsText(waarde);
}

function listFromField(field: any): string[] {
  if (!field) return [];
  const raw = field && typeof field === 'object' && 'waarde' in field ? field.waarde : field;
  if (Array.isArray(raw)) return raw.map((item) => getValueOrString(item)).filter(Boolean);
  const text = getValueOrString(field);
  if (!text || text === 'onbekend') return [];
  return text.split(/\s*,\s*/).filter(Boolean);
}

function nextStepsOf(gesprek: any, documentRequests: string[] = []): NextStep[] {
  const steps = Array.isArray(gesprek?.next_steps) ? gesprek.next_steps : [];
  if (steps.length > 0) {
    return steps.map((step: any) =>
      typeof step === 'string'
        ? { stap: step, eigenaar: '', termijn: '' }
        : { stap: step.stap || String(step), eigenaar: step.eigenaar || '', termijn: step.termijn || '', checklist: step.checklist }
    );
  }
  return getDefaultNextSteps(documentRequests);
}

function leftoverDocumentRequests(nextSteps: NextStep[], documentRequests: string[] = []): string[] {
  const listed = new Set(nextSteps.flatMap((step) => step.checklist || []));
  return documentRequests.filter((req) => req && !listed.has(req));
}

function statusContrast(status: LegislationStatus): string {
  return status === 'te_onderzoeken' ? '1A1A1A' : 'FFFFFF';
}

function aanknopingspuntenOf(gesprek: any, klanteisen: any, onderzoek: any): string[] {
  const fromGesprek = Array.isArray(gesprek?.aanknopingspunten) ? gesprek.aanknopingspunten : [];
  if (fromGesprek.length > 0) {
    return fromGesprek.map((item: any) => (typeof item === 'string' ? item : item.punt || item.actie || getValueOrString(item))).filter(Boolean);
  }
  const fromKlant = Array.isArray(klanteisen?.aanknopingspunten) ? klanteisen.aanknopingspunten : [];
  if (fromKlant.length > 0) {
    return fromKlant.map((item: any) => (typeof item === 'string' ? item : item.punt || item.actie || getValueOrString(item))).filter(Boolean);
  }
  const kansen = Array.isArray(onderzoek?.kansen_gesprek) ? onderzoek.kansen_gesprek : [];
  return kansen.map((item: any) => (typeof item === 'string' ? item : getValueOrString(item))).filter(Boolean);
}

function statusLabel(status: string): string {
  const s = String(status || 'onbekend').toLowerCase();
  if (s === 'aanwezig' || s === 'gevonden' || s === 'geregistreerd' || s === 'in_orde') return '✓ Aanwezig';
  if (s === 'ontbrekend' || s === 'ontbreekt' || s === 'niet_gevonden') return '✗ Ontbreekt';
  if (s === 'gedeeltelijk' || s === 'partial') return '~ Gedeeltelijk';
  return '? Onbekend';
}

function statusHex(status: string, huisstijl: HuisstijlSettings): string {
  const s = String(status || '').toLowerCase();
  if (s === 'aanwezig' || s === 'gevonden' || s === 'geregistreerd' || s === 'in_orde') {
    return hexColor(huisstijl.status_green, '039088');
  }
  if (s === 'ontbrekend' || s === 'ontbreekt' || s === 'niet_gevonden' || s === 'kick-out') {
    return hexColor(huisstijl.status_red, 'D64545');
  }
  if (s === 'gedeeltelijk' || s === 'partial' || s === 'hoog') {
    return hexColor(huisstijl.status_amber, 'FFC14D');
  }
  return hexColor(huisstijl.heading_color, '0C4643');
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}

function cellParagraph(text: string, opts: { bold?: boolean; color?: string; font?: string; size?: number } = {}) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text || '',
        bold: opts.bold,
        color: opts.color,
        font: opts.font || 'Aptos',
        size: opts.size || 20,
      }),
    ],
  });
}

function tableCell(text: string, opts: { shade?: string; bold?: boolean; color?: string; width?: number } = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade.replace('#', '') } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    children: [cellParagraph(text, { bold: opts.bold, color: opts.color })],
  });
}

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text })],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 140 },
    children: [new TextRun({ text })],
  });
}

function bodyPara(text: string, after = 160): Paragraph {
  return new Paragraph({
    spacing: { after },
    children: [new TextRun({ text, font: 'Aptos', size: 22 })],
  });
}

function bulletPara(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun({ text, font: 'Aptos', size: 22 })],
  });
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, font: 'Aptos', size: 22 }),
      new TextRun({ text: unknownAsText(value), font: 'Aptos', size: 22 }),
    ],
  });
}

function logoParagraph(logo: Buffer | null, width: number, height: number): Paragraph {
  if (!logo) {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'MF Impact', bold: true, font: 'Aptos Display', size: 28, color: '0C4643' })],
    });
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [
      new ImageRun({
        type: 'png',
        data: logo,
        transformation: { width, height },
      }),
    ],
  });
}

function extractContext(data: ReportData) {
  const { client, dossier, huisstijl } = data;
  const onderzoek = dossier?.onderzoek || dossier || {};
  return {
    client,
    dossier,
    huisstijl,
    onderzoek,
    profiel: onderzoek.profiel || {},
    vsme: onderzoek.vsme_basic || onderzoek.vsme || {},
    certificaten: Array.isArray(onderzoek.certificaten) ? onderzoek.certificaten : [],
    claims: Array.isArray(onderzoek.claims) ? onderzoek.claims : [],
    gaten: Array.isArray(onderzoek.gaten) ? onderzoek.gaten : [],
    klanteisen: onderzoek.klanteisen || {},
    gesprek: onderzoek.gesprek || {},
    bronnen: Array.isArray(onderzoek.doorzochte_bronnen) ? onderzoek.doorzochte_bronnen.map(String) : [],
    mvoRegister: dossier?.mvo_register || null,
    headingHex: hexColor(huisstijl.heading_color || huisstijl.secondary_color, '0C4643'),
    primaryHex: hexColor(huisstijl.primary_color, '039088'),
    tableShade: hexColor(huisstijl.table_shade, 'F4F7F7'),
  };
}

export async function generateWordReport(data: ReportData): Promise<Buffer> {
  const ctx = extractContext(data);
  const logo = await loadReportLogo();
  const {
    client,
    dossier,
    huisstijl,
    onderzoek,
    profiel,
    vsme,
    certificaten,
    claims,
    gaten,
    klanteisen,
    gesprek,
    bronnen,
    mvoRegister,
    headingHex,
    primaryHex,
    tableShade,
  } = ctx;
  const legislation = assessLegislation(client, dossier);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Aptos',
            size: 22,
            color: '1A1A1A',
          },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Aptos Display',
            size: 32,
            bold: true,
            color: headingHex,
          },
          paragraph: {
            spacing: { before: 360, after: 200 },
            outlineLevel: 0,
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Aptos Display',
            size: 26,
            bold: true,
            color: headingHex,
          },
          paragraph: {
            spacing: { before: 280, after: 140 },
            outlineLevel: 1,
          },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 900, bottom: 800, left: 850, right: 850 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnWidths: [6000, 4000],
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
                        children: [logoParagraph(logo, 120, 40)],
                      }),
                      new TableCell({
                        borders: { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.RIGHT,
                            children: [
                              new TextRun({ text: 'Vertrouwelijk', italics: true, size: 18, font: 'Aptos', color: headingHex }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 80 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: primaryHex, space: 4 } },
                children: [new TextRun({ text: '' })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                border: { top: { style: BorderStyle.SINGLE, size: 8, color: primaryHex, space: 8 } },
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'MF Impact  ·  Pagina ', size: 16, font: 'Aptos', color: headingHex }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Aptos', color: headingHex }),
                ],
              }),
            ],
          }),
        },
        children: [
          logoParagraph(logo, 240, 80),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 120 },
            children: [
              new TextRun({
                text: 'MVO-bewijsdossier',
                font: 'Aptos Display',
                size: 48,
                bold: true,
                color: headingHex,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: client.naam || 'Onbekende klant',
                font: 'Aptos Display',
                size: 36,
                bold: true,
                color: primaryHex,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [new TextRun({ text: formatDateDutch(), font: 'Aptos', size: 22, color: headingHex })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: 'Vertrouwelijk – opgesteld door MF Impact',
                italics: true,
                font: 'Aptos',
                size: 20,
                color: headingHex,
              }),
            ],
          }),
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: primaryHex, space: 1 } },
            spacing: { after: 400 },
            children: [new TextRun({ text: '' })],
          }),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('Inhoudsopgave'),
          new TableOfContents('Inhoudsopgave', {
            hyperlink: true,
            headingStyleRange: '1-2',
          }),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('1. Managementsamenvatting'),
          ...generateManagementSamenvatting(klanteisen, gaten, onderzoek),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('2. Bedrijfsprofiel'),
          ...generateBedrijfsprofiel(profiel, client, tableShade, primaryHex),
          ...generateWetgeving(legislation, tableShade),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('3. Wat uw klanten gaan vragen'),
          ...generateKlanteisen(klanteisen, huisstijl),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('4. Scan & gatenanalyse VSME B1-B11'),
          ...generateVSME(vsme, gaten, huisstijl, tableShade, primaryHex),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('5. Certificaten & registers'),
          ...generateCertificaten(certificaten, mvoRegister, huisstijl),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('6. Claimcheck'),
          ...generateClaimcheck(claims, huisstijl),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('7. Aanknopingspunten voor het gesprek'),
          ...generateGesprek(gesprek, klanteisen, onderzoek, legislation.questions),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('8. Next steps'),
          ...generateNextSteps(nextStepsOf(gesprek, legislation.documentRequests), legislation.documentRequests),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('9. Bronnenlijst'),
          ...generateBronnenlijst(bronnen),
          new Paragraph({ children: [new PageBreak()] }),

          heading1('10. Disclaimer'),
          ...generateDisclaimer(),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

function generateManagementSamenvatting(klanteisen: any, gaten: any[], onderzoek: any): Paragraph[] {
  const eisen = klanteisen.eisen || [];
  const kickouts = eisen.filter((e: any) => e.niveau === 'KICK-OUT' && e.status === 'ontbreekt');
  const hoogGaten = gaten.filter((g: any) => String(g.prioriteit).toLowerCase() === 'hoog');
  const bullets = [
    getValueOrString(onderzoek.samenvatting) || 'Geen samenvatting beschikbaar.',
    kickouts.length > 0 ? `RISICO: ${kickouts.length} kick-out eis(en) ontbreken voor tenderkansen.` : null,
    hoogGaten.length > 0 ? `ACTIE: ${hoogGaten.length} gaten met hoge prioriteit moeten worden aangepakt.` : null,
    eisen.filter((e: any) => e.status === 'aanwezig').length > 0
      ? 'KANS: Meerdere eisen al op orde, goede uitgangspositie voor MVO-traject.'
      : null,
  ].filter(Boolean) as string[];
  return bullets.map((bullet) => bulletPara(bullet));
}

function generateBedrijfsprofiel(profiel: any, client: any, tableShade: string, primaryHex: string): Array<Paragraph | Table> {
  const activiteiten = listFromField(profiel.producten_diensten);
  const afnemers = getValueOrString(profiel.afnemers_markten);
  const directie = getValueOrString(profiel.directie_eigenaren);
  const klanten = listFromField(profiel.belangrijkste_klanten_referenties);

  const paragraphs: Array<Paragraph | Table> = [
    labelValue('Naam', getValueOrString(profiel.handelsnaam) || client.naam || ''),
    labelValue('Juridische naam', getValueOrString(profiel.juridische_naam) || client.naam || ''),
    labelValue('KvK-nummer', getValueOrString(profiel.kvk_nummer) || client.kvk || ''),
    labelValue('Plaats', getValueOrString(profiel.hoofdvestiging) || client.plaats || ''),
    labelValue('SBI/Sector', getValueOrString(profiel.sbi) || getValueOrString(profiel.sector) || client.sector || ''),
    labelValue('Activiteiten', activiteiten.join(', ')),
    labelValue('Afnemers / markten', afnemers),
    labelValue('Directie / eigenaren', directie),
    labelValue('LinkedIn', linkedinDisplay(profiel.linkedin)),
    labelValue('Website', client.website_url || ''),
    labelValue('Aantal medewerkers', getValueOrString(profiel.aantal_medewerkers)),
    labelValue('Contact', getValueOrString(profiel.contactgegevens)),
  ];

  paragraphs.push(heading2('Belangrijkste klanten / referenties'));
  if (klanten.length === 0) {
    paragraphs.push(bodyPara('Geen referenties gevonden.'));
  } else {
    paragraphs.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [800, 8560],
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              tableCell('Nr.', { bold: true, shade: primaryHex, color: 'FFFFFF', width: 800 }),
              tableCell('Referentie', { bold: true, shade: primaryHex, color: 'FFFFFF', width: 8560 }),
            ],
          }),
          ...klanten.map(
            (naam, idx) =>
              new TableRow({
                children: [
                  tableCell(String(idx + 1), { shade: idx % 2 === 1 ? tableShade : 'FFFFFF', width: 800 }),
                  tableCell(naam, { shade: idx % 2 === 1 ? tableShade : 'FFFFFF', width: 8560 }),
                ],
              })
          ),
        ],
      })
    );
  }

  return paragraphs;
}

function generateWetgeving(legislation: LegislationAssessment, tableShade: string): Array<Paragraph | Table> {
  const paragraphs: Array<Paragraph | Table> = [
    heading2('Wetgeving & drempels'),
    bodyPara(legislation.summary, 120),
  ];
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        tableCell('Wet', { bold: true, shade: '0C4643', color: 'FFFFFF' }),
        tableCell('Status', { bold: true, shade: '0C4643', color: 'FFFFFF' }),
        tableCell('Toelichting', { bold: true, shade: '0C4643', color: 'FFFFFF' }),
      ],
    }),
    ...legislation.items.map(
      (row, idx) =>
        new TableRow({
          children: [
            tableCell(row.category, { shade: idx % 2 === 1 ? tableShade : 'FFFFFF' }),
            tableCell(row.label, {
              shade: row.color.replace('#', ''),
              color: statusContrast(row.status),
              bold: true,
            }),
            tableCell([row.reasons.join(' · '), row.needed, row.source ? `Bron: ${row.source}` : '']
              .filter(Boolean)
              .join(' — '), { shade: idx % 2 === 1 ? tableShade : 'FFFFFF' }),
          ],
        })
    ),
  ];
  paragraphs.push(
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      rows,
    })
  );
  paragraphs.push(bodyPara(`${legislation.disclaimer} · peildatum ${legislation.referenceDate}`, 120));
  return paragraphs;
}

function generateKlanteisen(klanteisen: any, huisstijl: HuisstijlSettings): Paragraph[] {
  const eisen = klanteisen.eisen || [];
  if (eisen.length === 0) {
    return [bodyPara('Nog niet gegenereerd.')];
  }
  const klanttypenGroups: Record<string, any[]> = {};
  eisen.forEach((eis: any) => {
    const kt = eis.klanttype || 'Overig';
    if (!klanttypenGroups[kt]) klanttypenGroups[kt] = [];
    klanttypenGroups[kt].push(eis);
  });
  const paragraphs: Paragraph[] = [];
  Object.entries(klanttypenGroups).forEach(([klanttype, eisenList]) => {
    paragraphs.push(heading2(klanttype));
    eisenList.forEach((eis: any) => {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 60 },
          children: [
            new TextRun({ text: `${eis.eis} `, bold: true, font: 'Aptos', size: 22 }),
            new TextRun({ text: `[${eis.niveau}] `, font: 'Aptos', size: 20, color: statusHex(eis.niveau === 'KICK-OUT' ? 'ontbreekt' : eis.status, huisstijl) }),
            new TextRun({
              text: statusLabel(eis.status),
              font: 'Aptos',
              size: 20,
              color: statusHex(eis.status, huisstijl),
            }),
          ],
        })
      );
      if (eis.gevolg) paragraphs.push(bodyPara(`Gevolg: ${eis.gevolg}`, 80));
      if (eis.bewijsactie) paragraphs.push(bodyPara(`Actie: ${eis.bewijsactie}`, 160));
    });
  });
  return paragraphs;
}

function generateVSME(
  vsme: any,
  gaten: any[],
  huisstijl: HuisstijlSettings,
  tableShade: string,
  primaryHex: string
): Array<Paragraph | Table> {
  const paragraphs: Array<Paragraph | Table> = [];
  if (!vsme || Object.keys(vsme).length === 0) {
    paragraphs.push(bodyPara('Nog niet gegenereerd.'));
  } else {
    const rows = [
      new TableRow({
        tableHeader: true,
        children: [
          tableCell('Onderdeel', { bold: true, shade: primaryHex, color: 'FFFFFF' }),
          tableCell('Status', { bold: true, shade: primaryHex, color: 'FFFFFF' }),
          tableCell('Samenvatting', { bold: true, shade: primaryHex, color: 'FFFFFF' }),
        ],
      }),
    ];
    Object.entries(vsme).forEach(([key, value]: [string, any], idx) => {
      const title = value?.titel || VSME_TITLES[key] || key;
      const status = value?.status || 'onbekend';
      rows.push(
        new TableRow({
          children: [
            tableCell(`${key} ${title}`, { shade: idx % 2 === 1 ? tableShade : 'FFFFFF' }),
            tableCell(statusLabel(status), {
              shade: idx % 2 === 1 ? tableShade : 'FFFFFF',
              color: statusHex(status, huisstijl),
              bold: true,
            }),
            tableCell(getValueOrString(value?.samenvatting) || 'Geen details', { shade: idx % 2 === 1 ? tableShade : 'FFFFFF' }),
          ],
        })
      );
    });
    paragraphs.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        rows,
      })
    );
  }

  paragraphs.push(heading2('Gatenanalyse'));
  if (!gaten.length) {
    paragraphs.push(bodyPara('Geen gaten geregistreerd.'));
  } else {
    const gapRows = [
      new TableRow({
        tableHeader: true,
        children: [
          tableCell('Onderdeel', { bold: true, shade: primaryHex, color: 'FFFFFF' }),
          tableCell('Prioriteit', { bold: true, shade: primaryHex, color: 'FFFFFF' }),
          tableCell('Bewijsactie', { bold: true, shade: primaryHex, color: 'FFFFFF' }),
        ],
      }),
      ...gaten.map(
        (g: any, idx: number) =>
          new TableRow({
            children: [
              tableCell(g.onderdeel || g.naam || '', { shade: idx % 2 === 1 ? tableShade : 'FFFFFF' }),
              tableCell(String(g.prioriteit || ''), {
                shade: idx % 2 === 1 ? tableShade : 'FFFFFF',
                color: statusHex(g.prioriteit, huisstijl),
                bold: true,
              }),
              tableCell(g.bewijsactie || g.waarom || '', { shade: idx % 2 === 1 ? tableShade : 'FFFFFF' }),
            ],
          })
      ),
    ];
    paragraphs.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        rows: gapRows,
      })
    );
  }
  return paragraphs;
}

function generateCertificaten(certificaten: any[], mvoRegister: any, huisstijl: HuisstijlSettings): Paragraph[] {
  const paragraphs: Paragraph[] = [heading2('MVO-Register (direct registercheck)')];
  if (mvoRegister) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({ text: 'Status: ', bold: true, font: 'Aptos', size: 22 }),
          new TextRun({
            text: statusLabel(mvoRegister.status),
            font: 'Aptos',
            size: 22,
            color: statusHex(mvoRegister.status, huisstijl),
            bold: true,
          }),
        ],
      })
    );
    if (mvoRegister.niveau_of_score) paragraphs.push(bodyPara(`Score: ${mvoRegister.niveau_of_score}`));
    if (mvoRegister.gezocht_op) paragraphs.push(bodyPara(`Gezocht op: ${mvoRegister.gezocht_op}`));
  } else {
    paragraphs.push(bodyPara('Geen MVO-registercheck uitgevoerd.'));
  }

  paragraphs.push(heading2('Gevonden certificaten'));
  if (certificaten.length === 0) {
    paragraphs.push(bodyPara('Geen certificaten gevonden.'));
  } else {
    certificaten.forEach((cert: any) => {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `${cert.platform || cert.naam || 'Certificaat'}: `, bold: true, font: 'Aptos', size: 22 }),
            new TextRun({ text: `${cert.naam || ''} ${cert.niveau_of_score ? `(${cert.niveau_of_score})` : ''} `, font: 'Aptos', size: 22 }),
            new TextRun({
              text: statusLabel(cert.status),
              font: 'Aptos',
              size: 20,
              color: statusHex(cert.status, huisstijl),
            }),
          ],
        })
      );
    });
  }
  return paragraphs;
}

function generateClaimcheck(claims: any[], huisstijl: HuisstijlSettings): Paragraph[] {
  if (claims.length === 0) return [bodyPara('Geen claims gevonden.')];
  const grouped: Record<string, any[]> = { rood: [], oranje: [], groen: [] };
  claims.forEach((claim: any) => {
    const color = String(claim.beoordeling || claim.color || 'groen').toLowerCase();
    if (color === 'rood' || color === 'red') grouped.rood.push(claim);
    else if (color === 'oranje' || color === 'orange' || color === 'amber') grouped.oranje.push(claim);
    else grouped.groen.push(claim);
  });
  const paragraphs: Paragraph[] = [];
  const titles: Record<string, string> = { rood: 'Rood — kick-out / gap', oranje: 'Amber — gedeeltelijk / voordeel', groen: 'Groen — in orde' };
  const colors: Record<string, string> = {
    rood: hexColor(huisstijl.status_red, 'D64545'),
    oranje: hexColor(huisstijl.status_amber, 'FFC14D'),
    groen: hexColor(huisstijl.status_green, '039088'),
  };
  (['rood', 'oranje', 'groen'] as const).forEach((color) => {
    if (!grouped[color].length) return;
    paragraphs.push(heading2(titles[color]));
    grouped[color].forEach((claim: any) => {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({ text: 'Citaat: ', bold: true, font: 'Aptos', size: 22 }),
            new TextRun({ text: `"${claim.citaat || claim.claim_text || ''}"`, italics: true, font: 'Aptos', size: 22, color: colors[color] }),
          ],
        })
      );
      paragraphs.push(bodyPara(`Herschrijfvoorstel: ${claim.herschrijfvoorstel || claim.advice || claim.rewrite_suggestion || 'Geen voorstel'}`));
    });
  });
  return paragraphs;
}

function generateGesprek(gesprek: any, klanteisen: any, onderzoek: any, wetgevingVragen: string[] = []): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const punten = aanknopingspuntenOf(gesprek, klanteisen, onderzoek);
  paragraphs.push(heading2('Aanknopingspunten'));
  if (punten.length === 0) paragraphs.push(bodyPara('Nog niet gegenereerd.'));
  else punten.forEach((punt) => paragraphs.push(bulletPara(punt)));

  if (gesprek?.agenda?.length) {
    paragraphs.push(heading2('Agenda'));
    gesprek.agenda.forEach((item: any) => {
      paragraphs.push(bulletPara(`${item.punt || item} (${item.minuten ?? ''} min)`));
    });
  }
  if (gesprek?.aannames?.length) {
    paragraphs.push(heading2('Aannames'));
    gesprek.aannames.forEach((item: any) => {
      paragraphs.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: 'Aanname: ', bold: true, font: 'Aptos', size: 22 }),
            new TextRun({ text: item.aanname || '', font: 'Aptos', size: 22 }),
          ],
        })
      );
      if (item.onderbouwing) paragraphs.push(bodyPara(`Onderbouwing: ${item.onderbouwing}`, 40));
      if (item.te_verifieren_vraag) paragraphs.push(bodyPara(`Vraag: ${item.te_verifieren_vraag}`, 120));
    });
  }
  const heeftGesprekVragen =
    gesprek?.vragen && Object.keys(gesprek.vragen).some((k: string) => Array.isArray(gesprek.vragen[k]) && gesprek.vragen[k].length);
  if (wetgevingVragen.length || heeftGesprekVragen) {
    paragraphs.push(heading2('Te stellen vragen'));
    wetgevingVragen.forEach((q) => paragraphs.push(bulletPara(q)));
    if (heeftGesprekVragen) {
      Object.entries(gesprek.vragen).forEach(([category, questions]: [string, any]) => {
        if (!Array.isArray(questions) || questions.length === 0) return;
        paragraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 160, after: 80 },
            children: [new TextRun({ text: category.replace(/_/g, ' ') })],
          })
        );
        questions.forEach((q: string) => paragraphs.push(bulletPara(q)));
      });
    }
  }
  return paragraphs;
}

function generateNextSteps(nextSteps: NextStep[], documentRequests: string[] = []): Paragraph[] {
  const paragraphs: Paragraph[] = nextSteps.flatMap((step, idx) => {
    const head = new Paragraph({
      spacing: { after: step.checklist?.length ? 60 : 140 },
      children: [
        new TextRun({ text: `${idx + 1}. `, bold: true, font: 'Aptos', size: 22 }),
        new TextRun({ text: step.stap, font: 'Aptos', size: 22 }),
        new TextRun({
          text: step.eigenaar || step.termijn ? ` (${[step.eigenaar, step.termijn].filter(Boolean).join(', ')})` : '',
          font: 'Aptos',
          size: 20,
          italics: true,
        }),
      ],
    });
    const checks = (step.checklist || []).map((item) => bulletPara(item));
    return [head, ...checks];
  });
  const leftover = leftoverDocumentRequests(nextSteps, documentRequests);
  if (leftover.length) {
    paragraphs.push(heading2('Delen van informatie'));
    leftover.forEach((req) => paragraphs.push(bulletPara(req)));
  }
  return paragraphs;
}

function generateBronnenlijst(bronnen: string[]): Paragraph[] {
  if (!bronnen.length) return [bodyPara('Geen bronnen beschikbaar.')];
  return bronnen.map((url) => bulletPara(url));
}

function generateDisclaimer(): Paragraph[] {
  return [
    bodyPara(
      'Dit rapport is opgesteld door MF Impact op basis van publiek beschikbare informatie en is bedoeld als indicatief overzicht. De informatie is zorgvuldig verzameld, maar MF Impact kan geen garantie bieden voor volledigheid of juistheid. Dit rapport vormt geen juridisch advies. Alle beoordelingen zijn indicatief.'
    ),
    bodyPara(`${ESG_DISCLAIMER} · peildatum ${ESG_REFERENCE_DATE}`),
    bodyPara(`Rapportagedatum: ${formatDateDutch()}`),
  ];
}

function pptxRows(rows: string[][]): PptxGenJS.TableCell[][] {
  return rows.map((row) => row.map((text) => ({ text })));
}

function addContentHeader(slide: PptxGenJS.Slide, title: string, huisstijl: HuisstijlSettings, logo?: Buffer | null) {
  const primary = huisstijl.primary_color.replace('#', '');
  const heading = (huisstijl.heading_color || huisstijl.secondary_color).replace('#', '');
  slide.background = { color: 'FFFFFF' };
  slide.addShape('rect' as any, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: primary } });
  if (logo) {
    slide.addImage({ data: logoDataUri(logo), x: 0.4, y: 0.18, w: 1.5, h: 0.5 });
  }
  slide.addText(title, {
    x: logo ? 2.1 : 0.5,
    y: 0.22,
    w: 10.5,
    h: 0.45,
    fontSize: 18,
    bold: true,
    fontFace: 'Aptos Display',
    color: heading,
  });
  slide.addShape('rect' as any, { x: 0.5, y: 0.78, w: 12.3, h: 0.025, fill: { color: primary } });
}

export async function generatePowerPointReport(data: ReportData): Promise<Buffer> {
  const ctx = extractContext(data);
  const logo = await loadReportLogo();
  const { client, dossier, huisstijl, onderzoek, profiel, vsme, certificaten, claims, gaten, klanteisen, gesprek, bronnen, mvoRegister } = ctx;
  const legislation = assessLegislation(client, dossier);
  const primary = huisstijl.primary_color.replace('#', '');
  const heading = (huisstijl.heading_color || huisstijl.secondary_color).replace('#', '');
  const tableShade = (huisstijl.table_shade || '#F4F7F7').replace('#', '');

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'LAYOUT_WIDE', width: 13.33, height: 7.5 });
  pptx.layout = 'LAYOUT_WIDE';
  pptx.theme = { headFontFace: 'Aptos Display', bodyFontFace: 'Aptos' };

  const title = pptx.addSlide();
  title.background = { color: 'FFFFFF' };
  title.addShape('rect' as any, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: primary } });
  if (logo) title.addImage({ data: logoDataUri(logo), x: 4.66, y: 1.4, w: 4.0, h: 1.33 });
  title.addText('MVO-bewijsdossier', {
    x: 0.8,
    y: 3.0,
    w: 11.7,
    h: 0.7,
    fontSize: 32,
    bold: true,
    color: heading,
    align: 'center',
    fontFace: 'Aptos Display',
  });
  title.addText(client.naam || 'Onbekende klant', {
    x: 0.8,
    y: 3.7,
    w: 11.7,
    h: 0.5,
    fontSize: 22,
    color: primary,
    align: 'center',
    fontFace: 'Aptos',
  });
  title.addText(`${formatDateDutch()}  ·  Vertrouwelijk`, {
    x: 0.8,
    y: 4.4,
    w: 11.7,
    h: 0.35,
    fontSize: 14,
    color: heading,
    align: 'center',
    fontFace: 'Aptos',
  });
  title.addShape('rect' as any, { x: 0, y: 7.38, w: 13.33, h: 0.12, fill: { color: primary } });

  const samenvattingSlide = pptx.addSlide();
  addContentHeader(samenvattingSlide, '1. Managementsamenvatting', huisstijl, logo);
  samenvattingSlide.addText(getValueOrString(onderzoek.samenvatting) || 'Geen samenvatting beschikbaar.', {
    x: 0.6,
    y: 1.1,
    w: 12.1,
    h: 5.6,
    fontSize: 16,
    color: '1A1A1A',
    fontFace: 'Aptos',
    valign: 'top',
  });

  const profielSlide = pptx.addSlide();
  addContentHeader(profielSlide, '2. Bedrijfsprofiel', huisstijl, logo);
  const activiteiten = listFromField(profiel.producten_diensten).join(', ') || 'onbekend';
  profielSlide.addText(
    [
      { text: `Naam: ${getValueOrString(profiel.handelsnaam) || client.naam || 'onbekend'}`, options: { breakLine: true } },
      { text: `KvK: ${getValueOrString(profiel.kvk_nummer) || client.kvk || 'onbekend'}`, options: { breakLine: true } },
      { text: `Plaats: ${getValueOrString(profiel.hoofdvestiging) || client.plaats || 'onbekend'}`, options: { breakLine: true } },
      { text: `Activiteiten: ${activiteiten}`, options: { breakLine: true } },
      { text: `Afnemers: ${getValueOrString(profiel.afnemers_markten) || 'onbekend'}`, options: { breakLine: true } },
      { text: `Directie / eigenaren: ${getValueOrString(profiel.directie_eigenaren) || 'onbekend'}`, options: { breakLine: true } },
      { text: `LinkedIn: ${linkedinDisplay(profiel.linkedin)}`, options: { breakLine: true } },
    ],
    { x: 0.6, y: 1.05, w: 12.1, h: 2.4, fontSize: 14, color: '1A1A1A', fontFace: 'Aptos', valign: 'top' }
  );
  const klanten = listFromField(profiel.belangrijkste_klanten_referenties);
  if (klanten.length) {
    profielSlide.addTable(
      pptxRows([['Nr.', 'Referentie'], ...klanten.slice(0, 10).map((naam, i) => [String(i + 1), naam])]),
      {
        x: 0.6,
        y: 3.5,
        w: 12.1,
        colW: [1.0, 11.1],
        border: { pt: 0.5, color: primary },
        fontFace: 'Aptos',
        fontSize: 11,
        color: heading,
        fill: { color: tableShade },
      }
    );
  }

  const wetSlide = pptx.addSlide();
  addContentHeader(wetSlide, '2b. Wetgeving & drempels', huisstijl, logo);
  wetSlide.addText(legislation.summary, {
    x: 0.5,
    y: 0.95,
    w: 12.3,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: heading,
    fontFace: 'Aptos',
  });
  wetSlide.addTable(
    [
      [
        { text: 'Wet', options: { bold: true, color: 'FFFFFF', fill: { color: '0C4643' } } },
        { text: 'Status', options: { bold: true, color: 'FFFFFF', fill: { color: '0C4643' } } },
        { text: 'Toelichting', options: { bold: true, color: 'FFFFFF', fill: { color: '0C4643' } } },
      ],
      ...legislation.items.map((row: LegislationItem) => [
        { text: row.category },
        {
          text: row.label,
          options: {
            bold: true,
            color: statusContrast(row.status),
            fill: { color: row.color.replace('#', '') },
          },
        },
        { text: [row.reasons.join(' · '), row.needed, row.source ? `Bron: ${row.source}` : ''].filter(Boolean).join(' — ') },
      ]),
    ],
    { x: 0.4, y: 1.35, w: 12.5, colW: [2.8, 2.6, 7.1], border: { pt: 0.4, color: primary }, fontFace: 'Aptos', fontSize: 10, color: '1A1A1A' }
  );
  wetSlide.addText(`${legislation.disclaimer} · peildatum ${legislation.referenceDate}`, {
    x: 0.5,
    y: 7.05,
    w: 12.3,
    h: 0.25,
    fontSize: 10,
    color: heading,
    fontFace: 'Aptos',
  });

  const klantSlide = pptx.addSlide();
  addContentHeader(klantSlide, '3. Wat uw klanten gaan vragen', huisstijl, logo);
  const eisen = klanteisen.eisen || [];
  if (eisen.length === 0) {
    klantSlide.addText('Nog niet gegenereerd.', { x: 0.6, y: 1.2, w: 12, h: 1, fontSize: 16, color: heading, fontFace: 'Aptos' });
  } else {
    klantSlide.addTable(
      pptxRows([
        ['Eis', 'Niveau', 'Status'],
        ...eisen.slice(0, 10).map((e: any) => [String(e.eis || ''), String(e.niveau || ''), statusLabel(e.status)]),
      ]),
      { x: 0.5, y: 1.1, w: 12.3, colW: [7.5, 2.4, 2.4], border: { pt: 0.5, color: primary }, fontFace: 'Aptos', fontSize: 12, color: '1A1A1A' }
    );
  }

  const vsmeSlide = pptx.addSlide();
  addContentHeader(vsmeSlide, '4. VSME B1–B11', huisstijl, logo);
  const vsmeRows = Object.entries(vsme).map(([key, value]: [string, any]) => [
    `${key} ${(value as any)?.titel || VSME_TITLES[key] || ''}`,
    statusLabel((value as any)?.status),
    getValueOrString((value as any)?.samenvatting),
  ]);
  if (vsmeRows.length) {
    vsmeSlide.addTable(pptxRows([['Onderdeel', 'Status', 'Samenvatting'], ...vsmeRows]), {
      x: 0.4,
      y: 1.0,
      w: 12.5,
      colW: [4.2, 1.8, 6.5],
      border: { pt: 0.4, color: primary },
      fontFace: 'Aptos',
      fontSize: 10,
      color: '1A1A1A',
    });
  }

  const gatenSlide = pptx.addSlide();
  addContentHeader(gatenSlide, '4b. Gatenanalyse', huisstijl, logo);
  if (gaten.length) {
    gatenSlide.addTable(
      pptxRows([['Onderdeel', 'Prioriteit', 'Bewijsactie'], ...gaten.map((g: any) => [g.onderdeel || '', String(g.prioriteit || ''), g.bewijsactie || ''])]),
      { x: 0.5, y: 1.1, w: 12.3, colW: [4, 2, 6.3], border: { pt: 0.5, color: primary }, fontFace: 'Aptos', fontSize: 12, color: '1A1A1A' }
    );
  } else {
    gatenSlide.addText('Geen gaten geregistreerd.', { x: 0.6, y: 1.2, w: 12, h: 1, fontSize: 16, fontFace: 'Aptos', color: heading });
  }

  const certSlide = pptx.addSlide();
  addContentHeader(certSlide, '5. Certificaten & MVO-register', huisstijl, logo);
  certSlide.addText(
    `MVO-register: ${mvoRegister ? statusLabel(mvoRegister.status) : 'geen check'}\n${
      certificaten.length
        ? certificaten.map((c: any) => `• ${c.naam || c.platform || 'certificaat'} ${statusLabel(c.status)}`).join('\n')
        : '• Geen certificaten gevonden.'
    }`,
    { x: 0.6, y: 1.2, w: 12.1, h: 5.4, fontSize: 16, fontFace: 'Aptos', color: '1A1A1A', valign: 'top' }
  );

  const claimSlide = pptx.addSlide();
  addContentHeader(claimSlide, '6. Claimcheck', huisstijl, logo);
  claimSlide.addText(
    claims.length
      ? claims.map((c: any) => `• ${c.citaat || c.claim_text || 'claim'} — ${c.beoordeling || c.color || ''}`).join('\n')
      : 'Geen claims gevonden.',
    { x: 0.6, y: 1.2, w: 12.1, h: 5.4, fontSize: 16, fontFace: 'Aptos', color: '1A1A1A', valign: 'top' }
  );

  const aankSlide = pptx.addSlide();
  addContentHeader(aankSlide, '7. Aanknopingspunten voor het gesprek', huisstijl, logo);
  const punten = aanknopingspuntenOf(gesprek, klanteisen, onderzoek);
  aankSlide.addText(punten.length ? punten.map((p) => `• ${p}`).join('\n') : 'Nog niet gegenereerd.', {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    h: 5.4,
    fontSize: 16,
    fontFace: 'Aptos',
    color: '1A1A1A',
    valign: 'top',
  });

  const agendaSlide = pptx.addSlide();
  addContentHeader(agendaSlide, '7b. Agenda, aannames en vragen', huisstijl, logo);
  const agendaLines: string[] = [];
  (gesprek.agenda || []).forEach((item: any) => agendaLines.push(`Agenda: ${item.punt || item} (${item.minuten ?? ''} min)`));
  (gesprek.aannames || []).forEach((item: any) => agendaLines.push(`Aanname: ${item.aanname || item}`));
  Object.entries(gesprek.vragen || {}).forEach(([, questions]) => {
    if (Array.isArray(questions)) questions.forEach((q: string) => agendaLines.push(`Vraag: ${q}`));
  });
  const vraagLines = [
    ...legislation.questions.map((q) => `Wetgeving: ${q}`),
    ...agendaLines,
  ];
  agendaSlide.addText(vraagLines.length ? vraagLines.map((l) => `• ${l}`).join('\n') : 'Nog geen agenda of vragen gegenereerd.', {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    h: 5.4,
    fontSize: 15,
    fontFace: 'Aptos',
    color: '1A1A1A',
    valign: 'top',
  });

  const nextSlide = pptx.addSlide();
  addContentHeader(nextSlide, '8. Next steps', huisstijl, logo);
  const pptxNext = nextStepsOf(gesprek, legislation.documentRequests);
  const pptxLeftover = leftoverDocumentRequests(pptxNext, legislation.documentRequests);
  nextSlide.addText(
    [
      ...pptxNext.map((s, i) => {
        const checks = (s.checklist || []).map((c) => `   • ${c}`).join('\n');
        return `${i + 1}. ${s.stap} (${[s.eigenaar, s.termijn].filter(Boolean).join(', ')})${checks ? `\n${checks}` : ''}`;
      }),
      ...(pptxLeftover.length ? ['', 'Delen van informatie:', ...pptxLeftover.map((r) => `• ${r}`)] : []),
    ].join('\n'),
    { x: 0.6, y: 1.2, w: 12.1, h: 5.4, fontSize: 14, fontFace: 'Aptos', color: '1A1A1A', valign: 'top' }
  );

  const bronSlide = pptx.addSlide();
  addContentHeader(bronSlide, '9. Bronnenlijst', huisstijl, logo);
  bronSlide.addText(bronnen.length ? bronnen.map((u: string) => `• ${u}`).join('\n') : 'Geen bronnen beschikbaar.', {
    x: 0.6,
    y: 1.2,
    w: 12.1,
    h: 5.4,
    fontSize: 14,
    fontFace: 'Aptos',
    color: '1A1A1A',
    valign: 'top',
  });

  const close = pptx.addSlide();
  close.background = { color: 'FFFFFF' };
  close.addShape('rect' as any, { x: 0, y: 0, w: 13.33, h: 0.12, fill: { color: primary } });
  if (logo) close.addImage({ data: logoDataUri(logo), x: 4.66, y: 1.8, w: 4.0, h: 1.33 });
  close.addText('Vertrouwelijk – opgesteld door MF Impact', {
    x: 0.8,
    y: 3.5,
    w: 11.7,
    h: 0.5,
    fontSize: 20,
    color: heading,
    align: 'center',
    fontFace: 'Aptos Display',
  });
  close.addText(CHAPTERS.join('   ·   '), {
    x: 0.8,
    y: 4.3,
    w: 11.7,
    h: 1.2,
    fontSize: 11,
    color: primary,
    align: 'center',
    fontFace: 'Aptos',
  });
  close.addText(`${legislation.disclaimer} · peildatum ${legislation.referenceDate}`, {
    x: 0.8,
    y: 5.7,
    w: 11.7,
    h: 0.4,
    fontSize: 12,
    color: heading,
    align: 'center',
    fontFace: 'Aptos',
  });
  close.addShape('rect' as any, { x: 0, y: 7.38, w: 13.33, h: 0.12, fill: { color: primary } });

  return (await pptx.write({ outputType: 'nodebuffer' })) as Buffer;
}

function pdfFontPaths() {
  return {
    regular: path.join(process.cwd(), 'lib/fonts/DejaVuSans.ttf'),
    bold: path.join(process.cwd(), 'lib/fonts/DejaVuSans-Bold.ttf'),
  };
}

export async function generatePDFReport(data: ReportData): Promise<Buffer> {
  const ctx = extractContext(data);
  const logo = await loadReportLogo();
  const { client, dossier, huisstijl, onderzoek, profiel, vsme, certificaten, claims, gaten, klanteisen, gesprek, bronnen, mvoRegister } = ctx;
  const legislation = assessLegislation(client, dossier);
  const headingColor = huisstijl.heading_color || huisstijl.secondary_color || '#0C4643';
  const primaryColor = huisstijl.primary_color || '#039088';
  const fonts = pdfFontPaths();
  const hasFonts =
    fs.existsSync(/*turbopackIgnore: true*/ fonts.regular) && fs.existsSync(/*turbopackIgnore: true*/ fonts.bold);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 72, bottom: 56, left: 50, right: 50 },
      info: {
        Title: `MVO-bewijsdossier ${client.naam || ''}`.trim(),
        Author: 'MF Impact',
        Subject: 'MVO-bewijsdossier',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (hasFonts) {
      doc.registerFont('Body', fonts.regular);
      doc.registerFont('Heading', fonts.bold);
    }
    const bodyFont = hasFonts ? 'Body' : 'Helvetica';
    const headingFont = hasFonts ? 'Heading' : 'Helvetica-Bold';

    const addHeading = (text: string, size = 16) => {
      doc.font(headingFont).fontSize(size).fillColor(headingColor).text(text);
      doc.moveDown(0.35);
    };
    const addText = (text: string) => {
      doc.font(bodyFont).fontSize(11).fillColor('#1A1A1A').text(text);
      doc.moveDown(0.25);
    };
    const addBullet = (text: string) => {
      doc.font(bodyFont).fontSize(11).fillColor('#1A1A1A').text(`• ${text}`, { indent: 10 });
      doc.moveDown(0.15);
    };

    if (logo) {
      try {
        doc.image(logo, (doc.page.width - 180) / 2, 80, { width: 180, height: 60 });
      } catch {
        /* ignore image errors */
      }
    }
    doc.moveDown(logo ? 6 : 4);
    doc.font(headingFont).fontSize(26).fillColor(headingColor).text('MVO-bewijsdossier', { align: 'center' });
    doc.moveDown(0.4);
    doc.font(headingFont).fontSize(18).fillColor(primaryColor).text(client.naam || 'Onbekende klant', { align: 'center' });
    doc.moveDown(0.4);
    doc.font(bodyFont).fontSize(12).fillColor(headingColor).text(formatDateDutch(), { align: 'center' });
    doc.moveDown(0.2);
    doc.font(bodyFont).fontSize(11).fillColor(headingColor).text('Vertrouwelijk – opgesteld door MF Impact', { align: 'center' });
    doc.save();
    doc.strokeColor(primaryColor).lineWidth(2).moveTo(50, 280).lineTo(doc.page.width - 50, 280).stroke();
    doc.restore();

    doc.addPage();
    addHeading('Inhoudsopgave', 18);
    CHAPTERS.forEach((title) => addBullet(title));

    doc.addPage();
    addHeading('1. Managementsamenvatting', 18);
    addBullet(getValueOrString(onderzoek.samenvatting) || 'Geen samenvatting beschikbaar.');
    const hoogGaten = gaten.filter((g: any) => String(g.prioriteit).toLowerCase() === 'hoog');
    if (hoogGaten.length) addBullet(`ACTIE: ${hoogGaten.length} gaten met hoge prioriteit.`);

    doc.addPage();
    addHeading('2. Bedrijfsprofiel', 18);
    addText(`Naam: ${getValueOrString(profiel.handelsnaam) || client.naam || 'onbekend'}`);
    addText(`KvK-nummer: ${getValueOrString(profiel.kvk_nummer) || client.kvk || 'onbekend'}`);
    addText(`Plaats: ${getValueOrString(profiel.hoofdvestiging) || client.plaats || 'onbekend'}`);
    addText(`Activiteiten: ${listFromField(profiel.producten_diensten).join(', ') || 'onbekend'}`);
    addText(`Afnemers: ${getValueOrString(profiel.afnemers_markten) || 'onbekend'}`);
    addText(`Directie / eigenaren: ${getValueOrString(profiel.directie_eigenaren) || 'onbekend'}`);
    addText(`LinkedIn: ${linkedinDisplay(profiel.linkedin)}`);
    addHeading('Belangrijkste klanten / referenties', 13);
    const klanten = listFromField(profiel.belangrijkste_klanten_referenties);
    if (klanten.length) klanten.forEach((k, i) => addBullet(`${i + 1}. ${k}`));
    else addText('Geen referenties gevonden.');

    doc.addPage();
    addHeading('2b. Wetgeving & drempels', 18);
    addText(legislation.summary);
    legislation.items.forEach((row: LegislationItem) => {
      const y = doc.y;
      const badge = row.label;
      doc.font(headingFont).fontSize(9);
      const badgeWidth = Math.max(110, doc.widthOfString(badge) + 12);
      doc.save();
      doc.rect(50, y, badgeWidth, 14).fill(row.color);
      doc.fillColor(`#${statusContrast(row.status)}`).text(badge, 56, y + 2, { width: badgeWidth - 8, lineBreak: false });
      doc.restore();
      doc.font(headingFont).fontSize(11).fillColor(headingColor).text(row.category, 50 + badgeWidth + 10, y, { lineBreak: false });
      doc.y = y + 18;
      addText(row.reasons.join(' · '));
      if (row.source) addText(`Bron: ${row.source}`);
      if (row.needed) addText(row.needed);
    });
    addText(`${legislation.disclaimer} · peildatum ${legislation.referenceDate}`);

    doc.addPage();
    addHeading('3. Wat uw klanten gaan vragen', 18);
    const eisen = klanteisen.eisen || [];
    if (!eisen.length) addText('Nog niet gegenereerd.');
    else {
      eisen.forEach((eis: any) => {
        addText(`${eis.eis} [${eis.niveau}] ${statusLabel(eis.status)}`);
      });
    }

    doc.addPage();
    addHeading('4. Scan & gatenanalyse VSME B1-B11', 18);
    Object.entries(vsme).forEach(([key, value]: [string, any]) => {
      addText(`${key} ${(value as any)?.titel || VSME_TITLES[key] || ''}: ${statusLabel((value as any)?.status)}`);
      addText(`  ${getValueOrString((value as any)?.samenvatting)}`);
    });
    addHeading('Gatenanalyse', 13);
    if (!gaten.length) addText('Geen gaten geregistreerd.');
    else {
      gaten.forEach((g: any) => {
        addBullet(`${g.onderdeel || ''} [${g.prioriteit || ''}] — ${g.bewijsactie || g.waarom || ''}`);
      });
    }

    doc.addPage();
    addHeading('5. Certificaten & registers', 18);
    addText(`MVO-register: ${mvoRegister ? statusLabel(mvoRegister.status) : 'geen check'}`);
    if (!certificaten.length) addText('Geen certificaten gevonden.');
    else certificaten.forEach((c: any) => addBullet(`${c.naam || c.platform} ${statusLabel(c.status)}`));

    doc.addPage();
    addHeading('6. Claimcheck', 18);
    if (!claims.length) addText('Geen claims gevonden.');
    else claims.forEach((c: any) => addBullet(`${c.citaat || c.claim_text || ''} (${c.beoordeling || c.color || ''})`));

    doc.addPage();
    addHeading('7. Aanknopingspunten voor het gesprek', 18);
    const punten = aanknopingspuntenOf(gesprek, klanteisen, onderzoek);
    if (!punten.length) addText('Nog niet gegenereerd.');
    else punten.forEach((p) => addBullet(p));
    if (gesprek.agenda?.length) {
      addHeading('Agenda', 13);
      gesprek.agenda.forEach((item: any) => addBullet(`${item.punt || item} (${item.minuten ?? ''} min)`));
    }
    if (legislation.questions.length) {
      addHeading('Te stellen vragen', 13);
      legislation.questions.forEach((q) => addBullet(q));
    }

    doc.addPage();
    addHeading('8. Next steps', 18);
    const pdfNext = nextStepsOf(gesprek, legislation.documentRequests);
    pdfNext.forEach((step, idx) => {
      addText(`${idx + 1}. ${step.stap} (${[step.eigenaar, step.termijn].filter(Boolean).join(', ')})`);
      (step.checklist || []).forEach((item) => addBullet(item));
    });
    const pdfLeftover = leftoverDocumentRequests(pdfNext, legislation.documentRequests);
    if (pdfLeftover.length) {
      addHeading('Delen van informatie', 13);
      pdfLeftover.forEach((req) => addBullet(req));
    }

    doc.addPage();
    addHeading('9. Bronnenlijst', 18);
    if (!bronnen.length) addText('Geen bronnen beschikbaar.');
    else bronnen.forEach((url: string) => addBullet(url));

    doc.addPage();
    addHeading('10. Disclaimer', 18);
    addText(
      'Dit rapport is opgesteld door MF Impact op basis van publiek beschikbare informatie en is bedoeld als indicatief overzicht. De informatie is zorgvuldig verzameld, maar MF Impact kan geen garantie bieden voor volledigheid of juistheid. Dit rapport vormt geen juridisch advies. Alle beoordelingen zijn indicatief.'
    );
    addText(`${legislation.disclaimer} · peildatum ${legislation.referenceDate}`);
    addText(`Rapportagedatum: ${formatDateDutch()}`);

    const range = doc.bufferedPageRange();
    const pageCount = range.count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      const originalMargins = { ...doc.page.margins };
      doc.page.margins = { top: 0, bottom: 0, left: 0, right: 0 };
      if (logo) {
        try {
          doc.image(logo, 50, 18, { width: 72, height: 24 });
        } catch {
          /* ignore */
        }
      }
      doc.save();
      doc.strokeColor(primaryColor).lineWidth(1.5).moveTo(50, 48).lineTo(doc.page.width - 50, 48).stroke();
      doc.font(bodyFont).fontSize(8).fillColor(headingColor).text('Vertrouwelijk', 50, 22, {
        align: 'right',
        width: doc.page.width - 100,
        lineBreak: false,
      });
      doc.strokeColor(primaryColor).lineWidth(1).moveTo(50, doc.page.height - 36).lineTo(doc.page.width - 50, doc.page.height - 36).stroke();
      doc.font(bodyFont).fontSize(8).fillColor(headingColor).text(`MF Impact  ·  pagina ${i + 1} van ${pageCount}`, 50, doc.page.height - 28, {
        align: 'center',
        width: doc.page.width - 100,
        lineBreak: false,
      });
      doc.restore();
      doc.page.margins = originalMargins;
    }

    doc.end();
  });
}
