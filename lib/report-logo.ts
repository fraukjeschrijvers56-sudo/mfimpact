import fs from 'fs';
import path from 'path';
import { getLogoUrl } from './logo-manager';

export const DEFAULT_LOGO_PATH = path.join(process.cwd(), 'public/brand/mf-impact-logo.png');
export const DEFAULT_LOGO_WIDTH = 900;
export const DEFAULT_LOGO_HEIGHT = 300;

function isPng(buffer: Buffer): boolean {
  return buffer.length > 200 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
}

async function tryFetchImage(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType && !contentType.includes('image') && !contentType.includes('octet-stream')) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return isPng(buffer) ? buffer : null;
  } catch {
    return null;
  }
}

/**
 * Source order: uploaded company logo (settings / storage) else bundled MF Impact lockup.
 */
export async function loadReportLogo(): Promise<Buffer | null> {
  try {
    const uploadedUrl = await getLogoUrl('company-logo.png');
    if (uploadedUrl) {
      const uploaded = await tryFetchImage(uploadedUrl);
      if (uploaded) return uploaded;
    }
  } catch {
    // no custom logo available
  }

  try {
    if (fs.existsSync(/*turbopackIgnore: true*/ DEFAULT_LOGO_PATH)) {
      const buffer = fs.readFileSync(DEFAULT_LOGO_PATH);
      if (isPng(buffer)) return buffer;
    }
  } catch {
    // missing bundled logo
  }

  return null;
}

export function logoDataUri(buffer: Buffer): string {
  return `image/png;base64,${buffer.toString('base64')}`;
}
