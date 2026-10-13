import { type NextRequest, NextResponse } from 'next/server';

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin');
    if (!origin || origin !== req.nextUrl.origin)
      return NextResponse.json(
        { message: 'Недопустимый источник запроса' },
        { status: 403 },
      );
  }
  const { path } = await context.params;
  const target = new URL(
    `${process.env.API_INTERNAL_URL || 'http://localhost:4000'}/api/${path.join('/')}`,
  );
  target.search = req.nextUrl.search;
  const headers = new Headers();
  const token = req.cookies.get('inside_session')?.value;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method)
        ? undefined
        : await req.arrayBuffer(),
      cache: 'no-store',
    });
    if (path.join('/') === 'auth/login' && response.ok) {
      const data = await response.json();
      const out = NextResponse.json({ user: data.user });
      out.cookies.set('inside_session', data.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
      return out;
    }
    const out = new NextResponse(response.body, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('Content-Type') || 'application/json',
      },
    });
    return out;
  } catch {
    return NextResponse.json(
      { message: 'Сервис временно недоступен' },
      { status: 503 },
    );
  }
}
export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
