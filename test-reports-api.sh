#!/bin/bash
# Test report generation via API endpoints
# Requires a running server

FIXTURE_FILE="${1:-pco-dossier-mock.json}"
CLIENT_ID="${2:-999}"

if [ ! -f "$FIXTURE_FILE" ]; then
  echo "ERROR: Fixture file not found: $FIXTURE_FILE"
  echo "Usage: ./test-reports-api.sh [fixture-file] [client-id]"
  exit 1
fi

echo "=== Testing Report Generation ==="
echo "Fixture: $FIXTURE_FILE"
echo "Client ID: $CLIENT_ID"
echo ""

# Create test client with fixture data
echo "1. Creating test client..."
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d @"$FIXTURE_FILE" \
  --silent --show-error

echo ""
echo "2. Generating DOCX..."
curl -X GET "http://localhost:3000/api/clients/$CLIENT_ID/rapport?format=docx" \
  --output test-report.docx \
  --silent --show-error
  
if [ -f test-report.docx ]; then
  SIZE=$(stat -f%z test-report.docx 2>/dev/null || stat -c%s test-report.docx)
  echo "✓ DOCX generated: test-report.docx ($SIZE bytes)"
  
  # Extract structure
  unzip -p test-report.docx word/document.xml 2>/dev/null | grep -o '<w:t>[^<]*</w:t>' | head -20 | sed 's/<[^>]*>//g'
else
  echo "✗ DOCX generation failed"
fi

echo ""
echo "3. Generating PPTX..."
curl -X GET "http://localhost:3000/api/clients/$CLIENT_ID/rapport?format=pptx" \
  --output test-report.pptx \
  --silent --show-error
  
if [ -f test-report.pptx ]; then
  SIZE=$(stat -f%z test-report.pptx 2>/dev/null || stat -c%s test-report.pptx)
  SLIDES=$(unzip -l test-report.pptx 2>/dev/null | grep "ppt/slides/slide" | wc -l)
  echo "✓ PPTX generated: test-report.pptx ($SIZE bytes, $SLIDES slides)"
else
  echo "✗ PPTX generation failed"
fi

echo ""
echo "4. Generating PDF..."
curl -X GET "http://localhost:3000/api/clients/$CLIENT_ID/rapport?format=pdf" \
  --output test-report.pdf \
  --silent --show-error
  
if [ -f test-report.pdf ]; then
  SIZE=$(stat -f%z test-report.pdf 2>/dev/null || stat -c%s test-report.pdf)
  PAGES=$(pdfinfo test-report.pdf 2>/dev/null | grep Pages | awk '{print $2}')
  echo "✓ PDF generated: test-report.pdf ($SIZE bytes, ${PAGES:-unknown} pages)"
else
  echo "✗ PDF generation failed"
fi

echo ""
echo "=== Test Complete ==="
