import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { checkClaim } from '@/lib/claimcheck-rules';

export async function POST(request: Request) {
  try {
    const { client_id, claim_text } = await request.json();
    
    const checkResult = checkClaim(claim_text);
    
    // Generate improved version if risks found
    let suggestions = '';
    if (checkResult.risks.length > 0) {
      suggestions = 'Verbeter de claim door:\n';
      checkResult.risks.forEach((risk, index) => {
        suggestions += `${index + 1}. ${risk.rule.suggestion}\n`;
      });
    }

    // Save to database if client is selected
    if (client_id) {
      const db = getDb();
      db.prepare(`
        INSERT INTO claim_checks (client_id, claim_text, result, risks, suggestions)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        client_id,
        claim_text,
        checkResult.overallResult,
        JSON.stringify(checkResult.risks),
        suggestions
      );
    }

    return NextResponse.json({
      result: checkResult.overallResult,
      risks: checkResult.risks.map(r => ({
        match: r.match,
        risk: r.rule.risk,
        severity: r.rule.severity,
        suggestion: r.rule.suggestion,
      })),
      suggestions: suggestions || null,
    });
  } catch (error) {
    console.error('Error checking claim:', error);
    return NextResponse.json({ error: 'Failed to check claim' }, { status: 500 });
  }
}
