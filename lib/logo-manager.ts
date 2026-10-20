import { getSupabaseServiceRole } from './supabase';

const BUCKET_NAME = 'logos';

export async function ensureLogosBucket() {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return false;

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET_NAME);
    
    if (!exists) {
      const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
      });
      if (error) {
        console.error('Failed to create logos bucket:', error);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error ensuring logos bucket:', error);
    return false;
  }
}

export async function uploadLogo(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string | null> {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return null;

  await ensureLogosBucket();

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Failed to upload logo:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading logo:', error);
    return null;
  }
}

export async function deleteLogo(filename: string): Promise<boolean> {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return false;

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filename]);

    if (error) {
      console.error('Failed to delete logo:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting logo:', error);
    return false;
  }
}

export async function getLogoUrl(filename: string): Promise<string | null> {
  const supabase = getSupabaseServiceRole();
  if (!supabase) return null;

  try {
    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return data.publicUrl;
  } catch (error) {
    console.error('Error getting logo URL:', error);
    return null;
  }
}

export async function fetchLogoFromWebsite(websiteUrl: string): Promise<Buffer | null> {
  try {
    // Try to fetch og:image or header logo from the website
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ESG-Werkbank/1.0)',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    
    // Try og:image
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i);
    if (ogImageMatch) {
      const imageUrl = new URL(ogImageMatch[1], websiteUrl).href;
      const imgResponse = await fetch(imageUrl);
      if (imgResponse.ok) {
        return Buffer.from(await imgResponse.arrayBuffer());
      }
    }

    // Try header logo (img/svg with 'logo' in class/id/alt)
    const logoMatch = html.match(/<img[^>]*(class|id|alt)="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i);
    if (logoMatch) {
      const imageUrl = new URL(logoMatch[2], websiteUrl).href;
      const imgResponse = await fetch(imageUrl);
      if (imgResponse.ok) {
        return Buffer.from(await imgResponse.arrayBuffer());
      }
    }

    // Try apple-touch-icon
    const appleTouchMatch = html.match(/<link[^>]*rel="apple-touch-icon"[^>]*href="([^"]+)"/i);
    if (appleTouchMatch) {
      const imageUrl = new URL(appleTouchMatch[1], websiteUrl).href;
      const imgResponse = await fetch(imageUrl);
      if (imgResponse.ok) {
        return Buffer.from(await imgResponse.arrayBuffer());
      }
    }

    // Try favicon
    const faviconMatch = html.match(/<link[^>]*rel="icon"[^>]*href="([^"]+)"/i);
    if (faviconMatch) {
      const imageUrl = new URL(faviconMatch[1], websiteUrl).href;
      const imgResponse = await fetch(imageUrl);
      if (imgResponse.ok) {
        return Buffer.from(await imgResponse.arrayBuffer());
      }
    }

    // Fallback: try /favicon.ico
    const faviconUrl = new URL('/favicon.ico', websiteUrl).href;
    const faviconResponse = await fetch(faviconUrl);
    if (faviconResponse.ok) {
      return Buffer.from(await faviconResponse.arrayBuffer());
    }

    return null;
  } catch (error) {
    console.error('Error fetching logo from website:', error);
    return null;
  }
}
