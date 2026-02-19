const WINDOW_MS = 1000 * 60 * 10;
const MAX_ATTEMPTS = 12;

type AttemptState = {
  count: number;
  startedAt: number;
};

const store = new Map<string, AttemptState>();

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const state = store.get(key);

  if (!state || now - state.startedAt > WINDOW_MS) {
    store.set(key, { count: 1, startedAt: now });
    return { allowed: true };
  }

  if (state.count >= MAX_ATTEMPTS) {
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - state.startedAt)) / 1000);
    return { allowed: false, retryAfterSec };
  }

  state.count += 1;
  store.set(key, state);
  return { allowed: true };
}
