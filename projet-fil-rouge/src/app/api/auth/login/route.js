import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/app/models/User.model';
import { loginSchema, parseJsonBody } from '@/server/validation';

const INVALID_CREDENTIALS = { message: 'Email ou mot de passe incorrect' };

/**
 * Compared against when the email is unknown, so the response time does not
 * reveal whether an account exists.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('timing-equalizer', 10);

export const POST = async (req) => {
  const { data, errorResponse } = await parseJsonBody(req, loginSchema);
  if (errorResponse) return errorResponse;
  const { email, password } = data;

  await connectDB();

  const user = await User.findOne({ email });
  const isMatch = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);
  if (!user || !isMatch) {
    return NextResponse.json(INVALID_CREDENTIALS, { status: 401 });
  }

  if (!user.isActivated) {
    return NextResponse.json({ message: "Compte pas encore activé. Utilisez le lien reçu par email (ou envoyé à votre parent)." }, { status: 403 });
  }

  // Génération du token JWT
  const jwtToken = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Écriture du cookie - CORRIGÉ
  const cookieStore = await cookies();
  cookieStore.set('token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 semaine
    path: '/',
  });

  return NextResponse.json({
    message: "Connexion réussie",
    user: {
      id: user._id,
      firstName: user.firstName,
      age: user.age,
    }
  });
};