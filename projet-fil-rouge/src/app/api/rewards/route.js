import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Reward from '@/app/models/Reward.model';
import { requireUser } from '@/server/auth';

export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    await connectDB();
    const rewards = await Reward.find({ userId: user._id }).sort({ generatedAt: -1 });
    return NextResponse.json({ rewards });
  } catch (error) {
    console.error('Rewards fetch failed:', error);
    return NextResponse.json({ message: 'Erreur interne du serveur' }, { status: 500 });
  }
}
