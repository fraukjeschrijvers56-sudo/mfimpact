import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } from 'docx';
import PptxGenJs from 'pptxgenjs';
import PDFDocument from 'pdfkit';
import { mergeKlanteisen, PEILDATUM } from './klanteisen';

export async function generateWordReport(client: any, dossier: any): Promise<Buffer> {
  const onderzoek = dossier.onderzoek || dossier;
  
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        // Title page
        new Paragraph({
          text: 'ESG/MVO Bewijsdossier',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: client.naam || 'Prospect',
          heading: HeadingLevel.HEADING_2,
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: `Datum: ${new Date().toLocaleDateString('nl-NL')}`,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        
        // Samenvatting
        new Paragraph({
          text: 'Samenvatting',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          text: onderzoek?.samenvatting?.waarde || onderzoek?.samenvatting || 'Geen samenvatting beschikbaar.',
          spacing: { after: 200 },
        }),
        
        // Bedrijfsprofiel
        new Paragraph({
          text: 'Bedrijfsprofiel',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'KvK-nummer: ', bold: true }),
            new TextRun(client.kvk || 'Onbekend'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Plaats: ', bold: true }),
            new TextRun(client.plaats || 'Onbekend'),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Sector: ', bold: true }),
            new TextRun(client.sector || 'Onbekend'),
          ],
        }),
        
        // Certificaten
        new Paragraph({
          text: 'Certificaten & Registers',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        ...(Array.isArray(onderzoek.certificaten) && onderzoek.certificaten.length > 0 
          ? onderzoek.certificaten.map((cert: any) => 
              new Paragraph({
                text: `• ${cert.naam || cert.platform || 'Certificaat'}: ${cert.niveau_of_score || cert.niveau || 'N/A'}`,
                spacing: { after: 100 },
              })
            )
          : [new Paragraph({ 
              children: [new TextRun({ text: 'Geen certificaten gevonden.', italics: true })],
            })]),
        
        // Disclaimer
        new Paragraph({
          text: 'Disclaimer',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Dit rapport is indicatief en gebaseerd op openbaar beschikbare informatie per de peildatum. Controleer alle bevindingen en eisen bij aanbestedingsstukken en contracten. Geen rechten kunnen worden ontleend aan dit rapport.',
              italics: true,
            }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}

export async function generatePowerPointReport(client: any, dossier: any): Promise<Buffer> {
  const pptx = new PptxGenJs();
  const onderzoek = dossier.onderzoek || dossier;

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText('ESG/MVO Bewijsdossier', { 
    x: 1, y: 2, w: 8, h: 1, 
    fontSize: 32, bold: true, align: 'center', color: '064E3B' 
  });
  titleSlide.addText(client.naam || 'Prospect', { 
    x: 1, y: 3, w: 8, h: 0.5, 
    fontSize: 24, align: 'center', color: '047857' 
  });
  titleSlide.addText(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, { 
    x: 1, y: 4, w: 8, h: 0.5, 
    fontSize: 14, align: 'center', color: '6B7280' 
  });

  // Samenvatting slide
  const samenvattingSlide = pptx.addSlide();
  samenvattingSlide.addText('Samenvatting', { 
    x: 0.5, y: 0.5, w: 9, h: 0.5, 
    fontSize: 28, bold: true, color: '064E3B' 
  });
  samenvattingSlide.addText(onderzoek?.samenvatting?.waarde || onderzoek?.samenvatting || 'Geen samenvatting beschikbaar.', { 
    x: 0.5, y: 1.5, w: 9, h: 4, 
    fontSize: 14, color: '1F2937', valign: 'top' 
  });

  // Bedrijfsprofiel slide
  const profielSlide = pptx.addSlide();
  profielSlide.addText('Bedrijfsprofiel', { 
    x: 0.5, y: 0.5, w: 9, h: 0.5, 
    fontSize: 28, bold: true, color: '064E3B' 
  });
  profielSlide.addText([
    { text: 'KvK-nummer: ', options: { bold: true } },
    { text: client.kvk || 'Onbekend' },
  ], { x: 0.5, y: 1.5, w: 4, h: 0.5, fontSize: 14 });
  profielSlide.addText([
    { text: 'Plaats: ', options: { bold: true } },
    { text: client.plaats || 'Onbekend' },
  ], { x: 0.5, y: 2, w: 4, h: 0.5, fontSize: 14 });
  profielSlide.addText([
    { text: 'Sector: ', options: { bold: true } },
    { text: client.sector || 'Onbekend' },
  ], { x: 0.5, y: 2.5, w: 4, h: 0.5, fontSize: 14 });

  // Certificaten slide
  const certSlide = pptx.addSlide();
  certSlide.addText('Certificaten & Registers', { 
    x: 0.5, y: 0.5, w: 9, h: 0.5, 
    fontSize: 28, bold: true, color: '064E3B' 
  });
  
  if (Array.isArray(onderzoek.certificaten) && onderzoek.certificaten.length > 0) {
    const certList = onderzoek.certificaten.map((cert: any) => 
      `• ${cert.naam || cert.platform || 'Certificaat'}: ${cert.niveau_of_score || cert.niveau || 'N/A'}`
    ).join('\n');
    certSlide.addText(certList, { 
      x: 0.5, y: 1.5, w: 9, h: 4, 
      fontSize: 14, color: '1F2937', valign: 'top' 
    });
  } else {
    certSlide.addText('Geen certificaten gevonden.', { 
      x: 0.5, y: 1.5, w: 9, h: 1, 
      fontSize: 14, color: '6B7280', italic: true 
    });
  }

  return await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
}

export async function generatePDFReport(client: any, dossier: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    const onderzoek = dossier.onderzoek || dossier;

    // Title page
    doc.fontSize(32).fillColor('#064E3B').text('ESG/MVO Bewijsdossier', { align: 'center' });
    doc.moveDown();
    doc.fontSize(24).fillColor('#047857').text(client.naam || 'Prospect', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#6B7280').text(`Datum: ${new Date().toLocaleDateString('nl-NL')}`, { align: 'center' });
    doc.moveDown(3);

    // Samenvatting
    doc.fontSize(20).fillColor('#064E3B').text('Samenvatting');
    doc.moveDown();
    doc.fontSize(12).fillColor('#1F2937').text(onderzoek?.samenvatting?.waarde || onderzoek?.samenvatting || 'Geen samenvatting beschikbaar.');
    doc.moveDown(2);

    // Bedrijfsprofiel
    doc.fontSize(20).fillColor('#064E3B').text('Bedrijfsprofiel');
    doc.moveDown();
    doc.fontSize(12).fillColor('#1F2937');
    doc.text(`KvK-nummer: ${client.kvk || 'Onbekend'}`);
    doc.text(`Plaats: ${client.plaats || 'Onbekend'}`);
    doc.text(`Sector: ${client.sector || 'Onbekend'}`);
    doc.moveDown(2);

    // Certificaten
    doc.fontSize(20).fillColor('#064E3B').text('Certificaten & Registers');
    doc.moveDown();
    doc.fontSize(12).fillColor('#1F2937');
    
    if (Array.isArray(onderzoek.certificaten) && onderzoek.certificaten.length > 0) {
      onderzoek.certificaten.forEach((cert: any) => {
        doc.text(`• ${cert.naam || cert.platform || 'Certificaat'}: ${cert.niveau_of_score || cert.niveau || 'N/A'}`);
      });
    } else {
      doc.fillColor('#6B7280').text('Geen certificaten gevonden.', { oblique: true });
    }
    
    doc.moveDown(2);

    // Disclaimer
    doc.fontSize(20).fillColor('#064E3B').text('Disclaimer');
    doc.moveDown();
    doc.fontSize(10).fillColor('#6B7280').text(
      'Dit rapport is indicatief en gebaseerd op openbaar beschikbare informatie per de peildatum. Controleer alle bevindingen en eisen bij aanbestedingsstukken en contracten. Geen rechten kunnen worden ontleend aan dit rapport.',
      { oblique: true }
    );

    doc.end();
  });
}
