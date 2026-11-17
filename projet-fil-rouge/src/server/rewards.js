import Reward from '@/app/models/Reward.model';

const REWARD_MILESTONES = [100, 150, 200, 300, 500, 1000];

const GAME_NAMES = {
  'sebi-run': 'Sebi la gazelle',
  'james-hibou': 'James le hibou',
};

function badgeImageUrl(gameSlug, milestone) {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${gameSlug}-${milestone}`;
}

/**
 * Grants every milestone the highscore has reached that the user does not own
 * yet. Only the server calls this, from the score it stored itself, so a client
 * cannot claim an arbitrary milestone.
 *
 * @returns {Promise<object | null>} the highest newly granted reward
 */
export async function grantMilestoneRewards(userId, gameSlug, highscore) {
  const reachedMilestones = REWARD_MILESTONES.filter((milestone) => highscore >= milestone);
  if (reachedMilestones.length === 0) return null;

  const ownedRewards = await Reward.find({ userId, gameSlug, milestone: { $in: reachedMilestones } })
    .select('milestone')
    .lean();
  const ownedMilestones = new Set(ownedRewards.map((reward) => reward.milestone));
  const newMilestones = reachedMilestones.filter((milestone) => !ownedMilestones.has(milestone));
  if (newMilestones.length === 0) return null;

  const createdRewards = await Reward.insertMany(
    newMilestones.map((milestone) => ({
      userId,
      gameSlug,
      milestone,
      imageUrl: badgeImageUrl(gameSlug, milestone),
      title: `${milestone} points sur ${GAME_NAMES[gameSlug]} !`,
      description: `Félicitations ! Tu as atteint ${milestone} points.`,
    }))
  );
  return createdRewards.at(-1);
}
