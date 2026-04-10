import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  recordAttempt,
  clearAttempts,
  formatRemainingTime,
} from './rateLimiter';

const KEY = 'test_action';
const MAX = 5;
const WINDOW = 15 * 60 * 1000; // 15 minutes in ms

// Simple localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  localStorageMock.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkRateLimit', () => {
  it('allows first attempt', () => {
    const result = checkRateLimit(KEY, MAX, WINDOW);
    expect(result.allowed).toBe(true);
    expect(result.attemptsLeft).toBe(MAX);
  });

  it('allows up to maxAttempts attempts', () => {
    for (let i = 0; i < MAX; i++) {
      recordAttempt(KEY, WINDOW);
    }
    // All MAX slots used — next check should block
    const result = checkRateLimit(KEY, MAX, WINDOW);
    expect(result.allowed).toBe(false);
    expect(result.attemptsLeft).toBe(0);
  });

  it('counts remaining attempts correctly', () => {
    recordAttempt(KEY, WINDOW);
    recordAttempt(KEY, WINDOW);
    const result = checkRateLimit(KEY, MAX, WINDOW);
    expect(result.allowed).toBe(true);
    expect(result.attemptsLeft).toBe(MAX - 2);
  });

  it('unblocks after the window has elapsed', () => {
    // Record MAX attempts "15+ minutes ago"
    const OLD_TIME = Date.now() - WINDOW - 1000;
    vi.spyOn(Date, 'now').mockReturnValue(OLD_TIME);
    for (let i = 0; i < MAX; i++) {
      recordAttempt(KEY, WINDOW);
    }

    // Now return to the real current time
    vi.spyOn(Date, 'now').mockReturnValue(OLD_TIME + WINDOW + 2000);
    const result = checkRateLimit(KEY, MAX, WINDOW);
    expect(result.allowed).toBe(true);
  });

  it('returns a positive remainingMs when blocked', () => {
    for (let i = 0; i < MAX; i++) {
      recordAttempt(KEY, WINDOW);
    }
    const result = checkRateLimit(KEY, MAX, WINDOW);
    expect(result.remainingMs).toBeGreaterThan(0);
    expect(result.remainingMs).toBeLessThanOrEqual(WINDOW);
  });
});

describe('clearAttempts', () => {
  it('resets the counter so actions are allowed again', () => {
    for (let i = 0; i < MAX; i++) {
      recordAttempt(KEY, WINDOW);
    }
    expect(checkRateLimit(KEY, MAX, WINDOW).allowed).toBe(false);

    clearAttempts(KEY);
    expect(checkRateLimit(KEY, MAX, WINDOW).allowed).toBe(true);
    expect(checkRateLimit(KEY, MAX, WINDOW).attemptsLeft).toBe(MAX);
  });
});

describe('formatRemainingTime', () => {
  it('formats seconds correctly', () => {
    expect(formatRemainingTime(45000)).toBe('45 seconds');
    expect(formatRemainingTime(1000)).toBe('1 second');
  });

  it('formats minutes correctly', () => {
    expect(formatRemainingTime(WINDOW)).toBe('15 minutes');
    expect(formatRemainingTime(60000)).toBe('1 minute');
  });

  it('rounds up partial minutes', () => {
    expect(formatRemainingTime(61000)).toBe('2 minutes');
  });
});
