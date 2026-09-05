import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { hasSupabaseConfig, publicEnv } from '@/lib/env';

const PUBLIC_PATHS = ['/login', '/invite', '/offline', '/manifest.webmanifest'];

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });
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

  if (!user && !isPublic && !isAsset) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (user && path === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (user && path.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role,status')
      .eq('id', user.id)
      .maybeSingle();
    const staff = profile?.role === 'admin' || profile?.role === 'owner';
    if (!staff || profile?.status !== 'active') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
