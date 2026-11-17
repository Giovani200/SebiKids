import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/app/models/User.model';

/**
 * Reloads the user from the database instead of trusting the token payload,
 * so a deleted account or a revoked admin role takes effect immediately.
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }

  await connectDB();
  return User.findById(payload.userId).select('-password').lean();
}

/**
 * Rejects accounts not activated yet (email verification, or parental approval
 * for under-13s), even with a valid token.
 *
 * @returns {Promise<{ user: object } | { errorResponse: NextResponse }>}
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    return { errorResponse: NextResponse.json({ message: 'Non authentifié' }, { status: 401 }) };
  }
  if (!user.isActivated) {
    return { errorResponse: NextResponse.json({ message: 'Compte non activé' }, { status: 403 }) };
  }
  return { user };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.errorResponse) return result;
  if (!result.user.isAdmin) {
    return { errorResponse: NextResponse.json({ message: 'Accès refusé' }, { status: 403 }) };
  }
  return result;
}
