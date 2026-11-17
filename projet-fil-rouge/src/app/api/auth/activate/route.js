import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import connectDB from '@/lib/db';
import User from '@/app/models/User.model';

/**
 * Single-use link: the token is cleared on approval, and only its SHA-256 hash
 * is stored, so a database leak does not expose valid approval links.
 */
export const GET = async (req) => {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ message: 'Lien invalide.' }, { status: 400 });
  }

  try {
    await connectDB();
    const user = await User.findOneAndUpdate(
      {
        activationTokenHash: createHash('sha256').update(token).digest('hex'),
        activationExpiresAt: { $gt: new Date() },
      },
      {
        $set: { isActivated: true },
        $unset: { activationTokenHash: '', activationExpiresAt: '' },
      }
    );

    if (!user) {
      return NextResponse.json({ message: 'Lien invalide ou expiré.' }, { status: 400 });
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/confirmation-reussie`);
  } catch (error) {
    console.error('Account activation failed:', error);
    return NextResponse.json({ message: 'Erreur interne du serveur.' }, { status: 500 });
  }
};
