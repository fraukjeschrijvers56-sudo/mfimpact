import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { generateWordReport, generatePowerPointReport, generatePDFReport } from '../lib/report-generator';
import { DEFAULT_SETTINGS } from '../lib/huisstijl';

const fixturePath = path.join(process.cwd(), 'tests/fixtures/pco-dossier.json');
const raw = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const client = {
  naam: raw.naam,
  website_url: raw.website_url,
  plaats: raw.plaats,
  kvk: raw.dossier?.basis?.kvk,
};
const dossier = raw.dossier;
const outDir = '/tmp/report-verify';
fs.mkdirSync(outDir, { recursive: true });

async function main() {
const data = { client, dossier, huisstijl: DEFAULT_SETTINGS };

const docxPath = path.join(outDir, 'pco.docx');
const pptxPath = path.join(outDir, 'pco.pptx');
const pdfPath = path.join(outDir, 'pco.pdf');

const docx = await generateWordReport(data);
fs.writeFileSync(docxPath, docx);
const pptx = await generatePowerPointReport(data);
fs.writeFileSync(pptxPath, pptx);
const pdf = await generatePDFReport(data);
fs.writeFileSync(pdfPath, pdf);

const docxUnzip = path.join(outDir, 'docx');
fs.rmSync(docxUnzip, { recursive: true, force: true });
execSync(`unzip -q -o "${docxPath}" -d "${docxUnzip}"`);

const documentXml = fs.readFileSync(path.join(docxUnzip, 'word/document.xml'), 'utf8');
const heading1: string[] = [];
const paraRegex = /<w:p[\s\S]*?<\/w:p>/g;
let match: RegExpExecArray | null;
while ((match = paraRegex.exec(documentXml))) {
  const para = match[0];
  if (!/w:val="Heading1"/.test(para)) continue;
  const texts = [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('');
  if (texts.trim()) heading1.push(texts.trim());
}

const headingColorHits = (documentXml.match(/w:val="0C4643"/gi) || []).length;
const media = fs.existsSync(path.join(docxUnzip, 'word/media'))
  ? fs.readdirSync(path.join(docxUnzip, 'word/media'))
  : [];

const pptxUnzip = path.join(outDir, 'pptx');
fs.rmSync(pptxUnzip, { recursive: true, force: true });
execSync(`unzip -q -o "${pptxPath}" -d "${pptxUnzip}"`);
const slideDir = path.join(pptxUnzip, 'ppt/slides');
const slides = fs.readdirSync(slideDir).filter((f) => f.startsWith('slide') && f.endsWith('.xml'));
slides.sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')));
const slideTitles = slides.map((file) => {
  const xml = fs.readFileSync(path.join(slideDir, file), 'utf8');
  const texts = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]);
  return { file, title: texts[0] || texts.join(' | ').slice(0, 80) };
});
const pptxMedia = fs.existsSync(path.join(pptxUnzip, 'ppt/media'))
  ? fs.readdirSync(path.join(pptxUnzip, 'ppt/media'))
  : [];

let pdfInfo = '';
try {
  pdfInfo = execSync(`pdfinfo "${pdfPath}"`, { encoding: 'utf8' });
} catch {
  pdfInfo = `PDF bytes=${pdf.length} (pdfinfo not installed)`;
}

console.log('=== DOCX Heading1 (TOC) ===');
heading1.forEach((t, i) => console.log(`${i + 1}. ${t}`));
console.log('heading_color 0C4643 hits:', headingColorHits);
console.log('word/media:', media.join(', ') || '(empty)');
console.log('=== PPTX slides ===');
console.log('count:', slides.length);
slideTitles.forEach((s, i) => console.log(`${i + 1}. ${s.title}`));
console.log('ppt/media:', pptxMedia.join(', ') || '(empty)');
console.log('=== PDF ===');
console.log(pdfInfo);
console.log('files:', { docx: docx.length, pptx: pptx.length, pdf: pdf.length });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
