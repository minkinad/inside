import { type NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json(
      { message: 'Недопустимый источник запроса' },
      { status: 403 },
    );
  const response = NextResponse.json({ ok: true });
  response.cookies.delete('inside_session');
  return response;
}
