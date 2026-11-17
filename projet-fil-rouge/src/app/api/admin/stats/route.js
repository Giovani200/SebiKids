import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/app/models/User.model';
import Score from '@/app/models/Score.model';
import { requireAdmin } from '@/server/auth';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export async function GET() {
    const { errorResponse } = await requireAdmin();
    if (errorResponse) return errorResponse;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const oneWeekAgo = new Date(Date.now() - 7 * DAY_IN_MS);
    const thirtyDaysAgo = new Date(Date.now() - 30 * DAY_IN_MS);

    try {
        await connectDB();

        const [
            totalUsers,
            newUsersToday,
            totalGamesPlayed,
            activePlayerIds,
            mostPlayedGames,
            topPlayers,
            registrationTrend,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ createdAt: { $gte: startOfToday } }),
            Score.countDocuments(),
            Score.distinct('userId', { createdAt: { $gte: oneWeekAgo } }),
            Score.aggregate([
                { $group: { _id: '$gameSlug', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
                { $project: { _id: 0, name: '$_id', count: 1 } },
            ]),
            Score.aggregate([
                { $sort: { score: -1 } },
                { $limit: 10 },
                { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userInfo' } },
                { $unwind: '$userInfo' },
                { $project: { _id: 1, userName: '$userInfo.firstName', gameSlug: 1, score: 1 } },
            ]),
            User.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        return NextResponse.json({
            totalUsers,
            newUsersToday,
            totalGamesPlayed,
            activeUsers: activePlayerIds.length,
            mostPlayedGames,
            topPlayers,
            registrationTrend,
        });
    } catch (error) {
        console.error('Admin stats failed:', error);
        return NextResponse.json({ message: 'Impossible de charger les statistiques' }, { status: 500 });
    }
}
