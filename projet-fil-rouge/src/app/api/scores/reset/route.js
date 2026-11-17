import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Score from '@/app/models/Score.model';
import { requireUser } from '@/server/auth';
import { gameSlugSchema, parseJsonBody } from '@/server/validation';

export async function POST(req) {
  const { user, errorResponse: authError } = await requireUser();
  if (authError) return authError;

  const { data, errorResponse } = await parseJsonBody(req, gameSlugSchema);
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    await Score.deleteMany({ userId: user._id, gameSlug: data.gameSlug });
    return NextResponse.json({ success: true, message: 'Scores réinitialisés avec succès' });
  } catch (error) {
    console.error('Score reset failed:', error);
    return NextResponse.json({ success: false, message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
