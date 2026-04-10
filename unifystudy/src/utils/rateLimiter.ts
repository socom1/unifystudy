/**
 * Client-side rate limiter backed by localStorage.
 *
 * Stores an array of attempt timestamps under the key `rl_<action>`.
 * Timestamps older than the sliding window are discarded on every check.
 *
 * ⚠️  This is a UX-level protection. A determined user can bypass it by
 * clearing localStorage or using a different browser/device. Firebase's
 * own server-side `auth/too-many-requests` guard acts as the backend backup.
 */

const STORAGE_PREFIX = 'rl_';

export interface RateLimitResult {
  /** Whether the action is permitted right now. */
  allowed: boolean;
  /** Milliseconds until the oldest attempt expires (0 if allowed). */
  remainingMs: number;
  /** How many more attempts are left in the current window. */
  attemptsLeft: number;
}

/** Read timestamps for a given key, pruned to the active window. */
function getActiveTimestamps(key: string, windowMs: number): number[] {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return [];
    const timestamps: number[] = JSON.parse(raw);
    return timestamps.filter((t) => now - t < windowMs);
  } catch {
    return [];
  }
}

/** Persist an updated list of timestamps. */
function saveTimestamps(key: string, timestamps: number[]): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(timestamps));
  } catch {
    // Silently fail if storage is unavailable (e.g. private mode quota exceeded).
  }
}

/**
 * Check whether an action is allowed under the rate limit.
 *
 * @param key        Unique action identifier (e.g. "login", "signup")
 * @param maxAttempts Maximum number of attempts allowed within the window
 * @param windowMs   Sliding time window in milliseconds (e.g. 15 * 60 * 1000)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const timestamps = getActiveTimestamps(key, windowMs);
  const attemptsUsed = timestamps.length;

  if (attemptsUsed >= maxAttempts) {
    // Time until the oldest attempt drops out of the window.
    const oldestTs = Math.min(...timestamps);
    const remainingMs = windowMs - (Date.now() - oldestTs);
    return {
      allowed: false,
      remainingMs: Math.max(0, remainingMs),
      attemptsLeft: 0,
    };
  }

  return {
    allowed: true,
    remainingMs: 0,
    attemptsLeft: maxAttempts - attemptsUsed,
  };
}

/**
 * Record an attempt for the given key.
 * Call this immediately *before* the action is executed.
 */
export function recordAttempt(key: string, windowMs: number): void {
  const timestamps = getActiveTimestamps(key, windowMs);
  timestamps.push(Date.now());
  saveTimestamps(key, timestamps);
}

/**
 * Clear all recorded attempts for a key.
 * Call this after a *successful* action so genuine users aren't penalised.
 */
export function clearAttempts(key: string): void {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch {
    // Ignore
  }
}

/**
 * Format a millisecond duration as a human-readable string like "14 minutes"
 * or "45 seconds". Useful for error messages.
 */
export function formatRemainingTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds >= 60) {
    const minutes = Math.ceil(totalSeconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${totalSeconds} second${totalSeconds !== 1 ? 's' : ''}`;
}
