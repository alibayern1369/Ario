import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseConfig, publicEnv } from '@/lib/env';

const PUBLIC_PATHS = ['/login', '/invite', '/offline', '/manifest.webmanifest'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasSupabaseConfig()) return response;

  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const isAsset =
    path.startsWith('/_next') ||
    path.startsWith('/branding') ||
    path.startsWith('/icons') ||
    path.startsWith('/api/health') ||
    /\.(?:svg|png|jpg|webp|webmanifest|js)$/.test(path);
  // Cron routes authenticate with CRON_SECRET inside the handler (no user session).
  const isCronApi = path.startsWith('/api/cron/');
  // Public auth endpoints (self-register / invite accept) — handlers enforce their own gates.
  const isPublicAuthApi =
    path === '/api/auth/register' || path === '/api/invite/accept';
  const isApi = path.startsWith('/api/');

  if (!user && !isPublic && !isAsset && !isCronApi && !isPublicAuthApi) {
    if (isApi) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && !isAsset) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role,status')
      .eq('id', user.id)
      .maybeSingle();

    const status = profile?.status ?? 'active';
    if (status !== 'active') {
      if (isApi) {
        response = NextResponse.json({ error: 'account_disabled', status }, { status: 403 });
        await supabase.auth.signOut();
        return response;
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('reason', status);
      response = NextResponse.redirect(url);
      await supabase.auth.signOut();
      return response;
    }

    const { data: maint } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle();
    const maintOn =
      maint &&
      typeof maint.value === 'object' &&
      maint.value &&
      'enabled' in maint.value &&
      Boolean((maint.value as { enabled?: boolean }).enabled);
    const staff = profile?.role === 'admin' || profile?.role === 'owner';
    if (maintOn && !staff && !path.startsWith('/login') && !isApi) {
      const url = request.nextUrl.clone();
      url.pathname = '/offline';
      url.searchParams.set('maintenance', '1');
      return NextResponse.redirect(url);
    }

    if (path === '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    if (path.startsWith('/admin')) {
      if (!staff) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}
