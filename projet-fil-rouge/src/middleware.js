import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const jwtSecret = new TextEncoder().encode(process.env.JWT_SECRET);

async function hasValidToken(token) {
  try {
    await jwtVerify(token, jwtSecret, { algorithms: ['HS256'] });
    return true;
  } catch {
    return false;
  }
}

/**
 * Optimistic gate only: it checks the token signature and expiry, not the admin
 * role, which is not in the token. Authorization is enforced by requireAdmin()
 * in the API routes.
 */
export async function middleware(request) {
  const token = request.cookies.get('token')?.value;
  if (token && (await hasValidToken(token))) {
    return NextResponse.next();
  }

  const response = NextResponse.redirect(new URL('/admin-login', request.url));
  if (token) response.cookies.delete('token');
  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
