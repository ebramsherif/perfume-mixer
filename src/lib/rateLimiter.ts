/**
 * Client-side rate limiter for search requests
 * Prevents excessive API calls from the browser
 */

interface RateLimitState {
  tokens: number;
  lastRefill: number;
}

// Token bucket rate limiter
const rateLimiters = new Map<string, RateLimitState>();

const DEFAULT_CONFIG = {
  maxTokens: 10, // Maximum burst capacity
  refillRate: 2, // Tokens added per second
  tokensPerRequest: 1, // Tokens consumed per request
};

function getState(key: string): RateLimitState {
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, {
      tokens: DEFAULT_CONFIG.maxTokens,
      lastRefill: Date.now(),
    });
  }
  return rateLimiters.get(key)!;
}

function refillTokens(state: RateLimitState): void {
  const now = Date.now();
  const elapsed = (now - state.lastRefill) / 1000; // seconds
  const tokensToAdd = elapsed * DEFAULT_CONFIG.refillRate;

  state.tokens = Math.min(DEFAULT_CONFIG.maxTokens, state.tokens + tokensToAdd);
  state.lastRefill = now;
}

/**
 * Check if a request can be made without waiting
 */
export function canMakeRequest(key: string = "default"): boolean {
  const state = getState(key);
  refillTokens(state);
  return state.tokens >= DEFAULT_CONFIG.tokensPerRequest;
}

/**
 * Consume a token for a request
 * Returns true if the request was allowed, false if rate limited
 */
export function consumeToken(key: string = "default"): boolean {
  const state = getState(key);
  refillTokens(state);

  if (state.tokens >= DEFAULT_CONFIG.tokensPerRequest) {
    state.tokens -= DEFAULT_CONFIG.tokensPerRequest;
    return true;
  }
  return false;
}

/**
 * Get the wait time in milliseconds until a request can be made
 */
export function getWaitTime(key: string = "default"): number {
  const state = getState(key);
  refillTokens(state);

  if (state.tokens >= DEFAULT_CONFIG.tokensPerRequest) {
    return 0;
  }

  const tokensNeeded = DEFAULT_CONFIG.tokensPerRequest - state.tokens;
  return Math.ceil((tokensNeeded / DEFAULT_CONFIG.refillRate) * 1000);
}

/**
 * Wait until rate limit allows a request, then consume a token
 * Use this for automatic throttling
 */
export async function waitForRateLimit(key: string = "default"): Promise<void> {
  const waitTime = getWaitTime(key);
  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }
  consumeToken(key);
}

/**
 * Create a rate-limited version of a fetch function
 */
export function createRateLimitedFetch(key: string = "default") {
  return async function rateLimitedFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    await waitForRateLimit(key);
    return fetch(input, init);
  };
}

/**
 * Get current rate limiter status (for debugging/UI)
 */
export function getRateLimitStatus(key: string = "default"): {
  availableTokens: number;
  maxTokens: number;
  canRequest: boolean;
  waitTimeMs: number;
} {
  const state = getState(key);
  refillTokens(state);

  return {
    availableTokens: Math.floor(state.tokens),
    maxTokens: DEFAULT_CONFIG.maxTokens,
    canRequest: state.tokens >= DEFAULT_CONFIG.tokensPerRequest,
    waitTimeMs: getWaitTime(key),
  };
}

/**
 * Reset rate limiter (for testing)
 */
export function resetRateLimiter(key: string = "default"): void {
  rateLimiters.delete(key);
}
