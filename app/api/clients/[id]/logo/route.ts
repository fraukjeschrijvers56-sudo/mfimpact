import { NextRequest, NextResponse } from 'next/server';
import { getDb, isUsingSupabase } from '@/lib/db';
import { uploadLogo, deleteLogo, fetchLogoFromWebsite } from '@/lib/logo-manager';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type');

    let buffer: Buffer;
    let filename: string;
    let fileType: string;

    if (contentType?.includes('multipart/form-data')) {
      // Manual upload
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
      }

      buffer = Buffer.from(await file.arrayBuffer());
      filename = `client-${id}-logo.${file.type.split('/')[1]}`;
      fileType = file.type;
    } else {
      // Auto-fetch from website
      const body = await request.json();
      const websiteUrl = body.websiteUrl;

      if (!websiteUrl) {
        return NextResponse.json({ error: 'No website URL provided' }, { status: 400 });
      }

      const logoBuffer = await fetchLogoFromWebsite(websiteUrl);

      if (!logoBuffer) {
        return NextResponse.json({ error: 'Could not fetch logo from website' }, { status: 404 });
      }

      buffer = logoBuffer;
      filename = `client-${id}-logo.png`;
      fileType = 'image/png';
    }

    const url = await uploadLogo(buffer, filename, fileType);

    if (!url) {
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }

    // Update client dossier with logo URL
    const db = getDb();
    if (isUsingSupabase()) {
      const { data: client } = await db.from('clients').select('dossier').eq('id', id).single();
      let dossier: any = client?.dossier || {};
      if (typeof dossier === 'string') {
        try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
      }
      dossier.client_logo = url;
      await db.from('clients').update({ dossier }).eq('id', id);
    } else {
      const client = db.prepare('SELECT dossier FROM clients WHERE id = ?').get(id) as any;
      let dossier: any = client?.dossier || {};
      if (typeof dossier === 'string') {
        try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
      }
      dossier.client_logo = url;
      db.prepare('UPDATE clients SET dossier = ? WHERE id = ?').run(JSON.stringify(dossier), id);
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error managing client logo:', error);
    return NextResponse.json(
      { error: 'Failed to manage logo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filename = `client-${id}-logo.png`;
    
    const success = await deleteLogo(filename);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
    }

    // Update client dossier
    const db = getDb();
    if (isUsingSupabase()) {
      const { data: client } = await db.from('clients').select('dossier').eq('id', id).single();
      let dossier: any = client?.dossier || {};
      if (typeof dossier === 'string') {
        try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
      }
      delete dossier.client_logo;
      await db.from('clients').update({ dossier }).eq('id', id);
    } else {
      const client = db.prepare('SELECT dossier FROM clients WHERE id = ?').get(id) as any;
      let dossier: any = client?.dossier || {};
      if (typeof dossier === 'string') {
        try { dossier = JSON.parse(dossier); } catch { dossier = {}; }
      }
      delete dossier.client_logo;
      db.prepare('UPDATE clients SET dossier = ? WHERE id = ?').run(JSON.stringify(dossier), id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client logo:', error);
    return NextResponse.json(
      { error: 'Failed to delete logo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
