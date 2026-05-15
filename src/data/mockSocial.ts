export interface FeedPost {
  id: string;
  user: { name: string; username: string; rank: 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite' | 'legend' };
  workoutName: string;
  durationMin: number;
  sets: number;
  exercises: number;
  caption?: string;
  reactions: { fire: number; muscle: number; clap: number };
  comments: number;
  createdAtMinAgo: number;
}

export const MOCK_FEED: FeedPost[] = [
  {
    id: '1',
    user: { name: 'Lucía Ramírez', username: 'lucia_lifts', rank: 'gold' },
    workoutName: 'Push A · Pecho destruido',
    durationMin: 68,
    sets: 24,
    exercises: 6,
    caption: 'PR en banca: 70kg x5 🔥',
    reactions: { fire: 24, muscle: 18, clap: 5 },
    comments: 7,
    createdAtMinAgo: 12,
  },
  {
    id: '2',
    user: { name: 'Carlos Méndez', username: 'cmendez_strength', rank: 'platinum' },
    workoutName: 'Heavy Squat Day',
    durationMin: 95,
    sets: 18,
    exercises: 4,
    caption: 'Triple sentadilla a 140kg. Sigo subiendo 💪',
    reactions: { fire: 56, muscle: 41, clap: 12 },
    comments: 14,
    createdAtMinAgo: 78,
  },
  {
    id: '3',
    user: { name: 'Ana Torres', username: 'ana_fit', rank: 'silver' },
    workoutName: 'Pull · Espalda y bíceps',
    durationMin: 52,
    sets: 20,
    exercises: 5,
    reactions: { fire: 12, muscle: 9, clap: 3 },
    comments: 2,
    createdAtMinAgo: 180,
  },
];

export interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  rankBadge: 'bronze' | 'silver' | 'gold' | 'platinum' | 'elite' | 'legend';
  workouts: number;
  sets: number;
  durationMin: number;
  streakWeeks: number;
}

export const MOCK_LEADERBOARD_WEEK: LeaderboardEntry[] = [
  { rank: 1, username: 'cmendez_strength', displayName: 'Carlos Méndez', rankBadge: 'platinum', workouts: 6, sets: 138, durationMin: 420, streakWeeks: 14 },
  { rank: 2, username: 'lucia_lifts', displayName: 'Lucía Ramírez', rankBadge: 'gold', workouts: 5, sets: 112, durationMin: 320, streakWeeks: 9 },
  { rank: 3, username: 'gmo_athlete', displayName: 'Tú', rankBadge: 'silver', workouts: 4, sets: 88, durationMin: 240, streakWeeks: 3 },
  { rank: 4, username: 'ana_fit', displayName: 'Ana Torres', rankBadge: 'silver', workouts: 4, sets: 80, durationMin: 220, streakWeeks: 5 },
  { rank: 5, username: 'mike_lift', displayName: 'Mike L.', rankBadge: 'bronze', workouts: 3, sets: 54, durationMin: 160, streakWeeks: 2 },
  { rank: 6, username: 'sara_squats', displayName: 'Sara P.', rankBadge: 'bronze', workouts: 3, sets: 48, durationMin: 145, streakWeeks: 1 },
];
