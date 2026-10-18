import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function checkAuth(request: NextRequest): Promise<NextResponse | null> {
  const authCookie = (await cookies()).get('auth');
  
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Niet geautoriseerd' }, { status: 401 });
  }
  
  return null; // Auth OK
}
