import { NextRequest, NextResponse } from 'next/server';
import { uploadLogo, deleteLogo, getLogoUrl } from '@/lib/logo-manager';

export const dynamic = 'force-dynamic';

const COMPANY_LOGO_FILENAME = 'company-logo.png';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadLogo(buffer, COMPANY_LOGO_FILENAME, file.type);

    if (!url) {
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error uploading company logo:', error);
    return NextResponse.json(
      { error: 'Failed to upload logo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const url = await getLogoUrl(COMPANY_LOGO_FILENAME);
    
    if (!url) {
      // Return default MF Impact logo
      return NextResponse.json({ url: '/logo-full.png', isDefault: true });
    }

    return NextResponse.json({ url, isDefault: false });
  } catch (error) {
    console.error('Error getting company logo:', error);
    return NextResponse.json({ url: '/logo-full.png', isDefault: true });
  }
}

export async function DELETE() {
  try {
    const success = await deleteLogo(COMPANY_LOGO_FILENAME);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete logo' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company logo:', error);
    return NextResponse.json(
      { error: 'Failed to delete logo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
