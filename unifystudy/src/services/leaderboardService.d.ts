export function subscribeToLeaderboard(callback: (data: any) => void): () => void;

export function recordStudySession(
  uid: string, 
  durationMinutes: number, 
  type?: string
): Promise<{ earnedCoins: number, unlocked: string[] }>;

export function syncUserToLeaderboard(uid: string): Promise<void>;
