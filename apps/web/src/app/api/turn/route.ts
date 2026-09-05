import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { publicEnv, serverSecrets } from '@/lib/env';

export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const secrets = serverSecrets();
  const iceServers: RTCIceServer[] = publicEnv().stunUrls.map((urls) => ({ urls }));
  if (secrets.turnUrls.length && secrets.turnUsername && secrets.turnCredential) {
    iceServers.push({
      urls: secrets.turnUrls,
      username: secrets.turnUsername,
      credential: secrets.turnCredential,
    });
  }
  return NextResponse.json({ iceServers });
}
