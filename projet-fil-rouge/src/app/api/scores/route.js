import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Score from '@/app/models/Score.model';
import { getCurrentUser, requireUser } from '@/server/auth';
import { grantMilestoneRewards } from '@/server/rewards';
import { GAME_SLUGS, parseJsonBody, scoreSchema } from '@/server/validation';

async function findHighscore(userId, gameSlug) {
  const bestScore = await Score.findOne({ userId, gameSlug }).sort({ score: -1 });
  return bestScore?.score ?? 0;
}

export async function GET(req) {
  const gameSlug = req.nextUrl.searchParams.get('gameSlug');
  if (!GAME_SLUGS.includes(gameSlug)) {
    return NextResponse.json({ message: 'Jeu inconnu' }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user?.isActivated) {
    return NextResponse.json({ highscore: 0 });
  }

  return NextResponse.json({ highscore: await findHighscore(user._id, gameSlug) });
}

export async function POST(req) {
  const { user, errorResponse: authError } = await requireUser();
  if (authError) return authError;

  const { data, errorResponse } = await parseJsonBody(req, scoreSchema);
  if (errorResponse) return errorResponse;
  const { score, gameSlug } = data;

  try {
    await connectDB();
    await Score.create({ userId: user._id, score, gameSlug });
    const highscore = await findHighscore(user._id, gameSlug);

    const reward = await grantMilestoneRewards(user._id, gameSlug, highscore);

    return NextResponse.json({ message: 'Score enregistré', highscore, reward }, { status: 201 });
  } catch (error) {
    console.error('Score save failed:', error);
    return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
