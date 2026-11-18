import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Score from '@/app/models/Score.model';

const PODIUM_SIZE = 3;
const RANKING_SIZE = 50;

/**
 * Joins each ranked row with its player and keeps only what the public page
 * shows: the first name, the last-name initial and the avatar. The leaderboard
 * is public and the players are children, so the full last name and the user
 * id never leave the database.
 *
 * The projection runs inside the $lookup: a $set on the joined `user` object
 * would merge into it and leak every other field (email, password hash).
 */
const publicPlayerStages = [
  {
    $lookup: {
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'user',
      pipeline: [
        {
          $project: {
            _id: 0,
            displayName: { $concat: ['$firstName', ' ', { $substrCP: ['$lastName', 0, 1] }, '.'] },
            avatar: 1,
          },
        },
      ],
    },
  },
  { $unwind: '$user' },
  { $unset: '_id' },
];

function topPlayersOfGame(gameSlug) {
  return Score.aggregate([
    { $match: { gameSlug } },
    {
      $group: {
        _id: '$userId',
        bestScore: { $max: '$score' },
        gamesPlayed: { $sum: 1 },
      },
    },
    { $sort: { bestScore: -1 } },
    { $limit: PODIUM_SIZE },
    ...publicPlayerStages,
  ]);
}

/** Sums each player's best score on every game. */
function topPlayersOverall() {
  return Score.aggregate([
    { $group: { _id: { userId: '$userId', gameSlug: '$gameSlug' }, bestScore: { $max: '$score' } } },
    { $group: { _id: '$_id.userId', totalScore: { $sum: '$bestScore' }, gamesPlayed: { $sum: 1 } } },
    { $sort: { totalScore: -1 } },
    { $limit: PODIUM_SIZE },
    ...publicPlayerStages,
  ]);
}

function sebiRanking() {
  return Score.aggregate([
    { $match: { gameSlug: 'sebi-run' } },
    { $group: { _id: '$userId', totalScore: { $sum: '$score' }, gamesPlayed: { $sum: 1 } } },
    { $sort: { totalScore: -1 } },
    { $limit: RANKING_SIZE },
    ...publicPlayerStages,
  ]);
}

export async function GET() {
  try {
    await connectDB();

    const [topSebi, topJames, topGlobal, sebiPlayers] = await Promise.all([
      topPlayersOfGame('sebi-run'),
      topPlayersOfGame('james-hibou'),
      topPlayersOverall(),
      sebiRanking(),
    ]);

    return NextResponse.json({ topSebi, topJames, topGlobal, sebiPlayers });
  } catch (error) {
    console.error('Leaderboard failed:', error);
    return NextResponse.json({ message: 'Erreur lors de la récupération du classement' }, { status: 500 });
  }
}
