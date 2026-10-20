#!/usr/bin/env node
/**
 * Test report generation with pco-dossier.json fixture
 * Usage: node test-reports.js [path-to-fixture.json]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Default fixture path
const fixturePath = process.argv[2] || './pco-dossier.json';

if (!fs.existsSync(fixturePath)) {
  console.error(`ERROR: Fixture file not found: ${fixturePath}`);
  console.log('\nUsage: node test-reports.js [path-to-pco-dossier.json]');
  process.exit(1);
}

console.log(`Loading fixture from: ${fixturePath}`);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

// Mock client and dossier structure
const testData = {
  client: {
    id: 1,
    naam: fixture.naam || 'Test Client',
    website_url: fixture.website_url || 'https://example.com',
    plaats: fixture.plaats || 'Amsterdam',
    kvk: fixture.kvk || '12345678',
    sector: fixture.sector || 'Test Sector',
  },
  dossier: fixture,
  huisstijl: {
    primary_color: '#10b981',
    secondary_color: '#3b82f6',
    font: 'Aptos',
  },
};

console.log('\n=== Generating Reports ===\n');

// Import report generator functions
const { generateWordReport, generatePowerPointReport, generatePDFReport } = require('./lib/report-generator.ts');

async function testReports() {
  try {
    // Generate DOCX
    console.log('1. Generating Word document (docx)...');
    const docxBuffer = await generateWordReport(testData);
    const docxPath = './test-report.docx';
    fs.writeFileSync(docxPath, docxBuffer);
    console.log(`✓ DOCX saved to: ${docxPath} (${docxBuffer.length} bytes)`);

    // Verify DOCX structure
    console.log('   Verifying DOCX structure...');
    try {
      execSync(`unzip -p ${docxPath} word/document.xml > /tmp/doc.xml 2>/dev/null`);
      const docXml = fs.readFileSync('/tmp/doc.xml', 'utf-8');
      
      // Check for required elements
      const checks = [
        { pattern: 'MVO-bewijsdossier', desc: 'Voorblad title' },
        { pattern: 'Vertrouwelijk.*opgesteld door MF Impact', desc: 'Vertrouwelijk notice' },
        { pattern: 'Managementsamenvatting', desc: 'Chapter 1' },
        { pattern: 'Bedrijfsprofiel', desc: 'Chapter 2' },
        { pattern: 'Wat uw klanten gaan vragen', desc: 'Chapter 3' },
        { pattern: 'VSME', desc: 'Chapter 4' },
        { pattern: 'Certificaten', desc: 'Chapter 5' },
        { pattern: 'Claimcheck', desc: 'Chapter 6' },
        { pattern: 'Aanknopingspunten', desc: 'Chapter 7' },
        { pattern: 'Next steps', desc: 'Chapter 8' },
        { pattern: 'Bronnenlijst', desc: 'Chapter 9' },
        { pattern: 'Disclaimer', desc: 'Chapter 10' },
      ];

      console.log('   Checking for required elements:');
      checks.forEach(({ pattern, desc }) => {
        const found = new RegExp(pattern, 'i').test(docXml);
        console.log(`     ${found ? '✓' : '✗'} ${desc}: ${found ? 'FOUND' : 'MISSING'}`);
      });

      // Extract headings
      const headingMatches = docXml.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
      const headings = headingMatches
        .map(m => m.replace(/<[^>]+>/g, ''))
        .filter(h => h.match(/^\d+\.|Inhoudsopgave|MVO-bewijsdossier/))
        .slice(0, 15);
      
      console.log('\n   Heading list (first 15):');
      headings.forEach(h => console.log(`     - ${h}`));
    } catch (e) {
      console.log('   (Could not extract DOCX contents - unzip not available)');
    }

    // Generate PPTX
    console.log('\n2. Generating PowerPoint (pptx)...');
    const pptxBuffer = await generatePowerPointReport(testData);
    const pptxPath = './test-report.pptx';
    fs.writeFileSync(pptxPath, pptxBuffer);
    console.log(`✓ PPTX saved to: ${pptxPath} (${pptxBuffer.length} bytes)`);

    // Estimate slide count
    try {
      execSync(`unzip -l ${pptxPath} 2>/dev/null | grep "ppt/slides/slide" | wc -l > /tmp/slides.txt`);
      const slideCount = parseInt(fs.readFileSync('/tmp/slides.txt', 'utf-8').trim());
      console.log(`   Slide count: ${slideCount} ${slideCount >= 12 ? '✓' : '✗ (expected >= 12)'}`);
    } catch (e) {
      console.log('   (Could not count slides - unzip not available)');
    }

    // Generate PDF
    console.log('\n3. Generating PDF...');
    const pdfBuffer = await generatePDFReport(testData);
    const pdfPath = './test-report.pdf';
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`✓ PDF saved to: ${pdfPath} (${pdfBuffer.length} bytes)`);

    // Check PDF info
    try {
      const pdfInfo = execSync(`pdfinfo ${pdfPath} 2>/dev/null || echo "pdfinfo not available"`).toString();
      console.log('   PDF info:');
      const pages = pdfInfo.match(/Pages:\s+(\d+)/);
      if (pages) {
        const pageCount = parseInt(pages[1]);
        console.log(`     Pages: ${pageCount} ${pageCount > 5 ? '✓' : '✗ (expected > 5)'}`);
      }
      console.log(pdfInfo.split('\n').filter(l => l.match(/Title|Author|Pages/)).map(l => `     ${l}`).join('\n'));
    } catch (e) {
      console.log('   (Could not extract PDF info - pdfinfo not available)');
    }

    console.log('\n=== Report Generation Complete ===\n');
    console.log('Summary:');
    console.log(`  ✓ DOCX: ${docxPath}`);
    console.log(`  ✓ PPTX: ${pptxPath}`);
    console.log(`  ✓ PDF:  ${pdfPath}`);

  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testReports();
