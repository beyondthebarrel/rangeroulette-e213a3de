export interface BadgeSessionLike {
  finalSeconds: number;
  dryFire?: boolean;
}

export interface BadgeDef {
  id: string;
  label: string;
  icon: string;
  check: (sessions: BadgeSessionLike[]) => boolean;
}

// Combined dry + live fire — every rep counts toward the volume milestones.
const REP_MILESTONES = [1, 10, 50, 100, 500, 1000];

// Live fire only — a fast dry rep doesn't prove anything against a target.
const SPEED_MILESTONES = [3, 2, 1.5];

function repIcon(n: number): string {
  if (n >= 1000) return "💎";
  if (n >= 500) return "🏆";
  if (n >= 100) return "🥇";
  if (n >= 50) return "🥈";
  if (n >= 10) return "🥉";
  return "🎯";
}

export const BADGES: BadgeDef[] = [
  ...REP_MILESTONES.map(
    (n): BadgeDef => ({
      id: `reps-${n}`,
      label: `${n.toLocaleString()} Rep${n === 1 ? "" : "s"} Logged`,
      icon: repIcon(n),
      check: (sessions) => sessions.length >= n,
    }),
  ),
  ...SPEED_MILESTONES.map(
    (s): BadgeDef => ({
      id: `speed-${s}`,
      label: `Sub-${s}s Live Fire Time`,
      icon: "⚡",
      check: (sessions) => sessions.some((sess) => !sess.dryFire && sess.finalSeconds < s),
    }),
  ),
];

export function earnedBadgeIds(sessions: BadgeSessionLike[]): Set<string> {
  return new Set(BADGES.filter((b) => b.check(sessions)).map((b) => b.id));
}

/** Badges present after `after` but not yet earned as of `before` — i.e. just unlocked by whatever moved from one list to the other. */
export function newlyEarnedBadges(
  before: BadgeSessionLike[],
  after: BadgeSessionLike[],
): BadgeDef[] {
  const beforeIds = earnedBadgeIds(before);
  return BADGES.filter((b) => !beforeIds.has(b.id) && b.check(after));
}
