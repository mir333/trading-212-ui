// ---------------------------------------------------------------------------
// ConnectionManager — serialises all requests to an external API so that
// exactly one HTTP call is in flight at a time, and enforces per-endpoint
// rate limits using a sliding-window approach.
// ---------------------------------------------------------------------------

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface RateLimitRule {
  pattern: string;
  maxRequests: number;
  /** Window length in milliseconds. May be mutated at runtime (e.g. dynamic backoff). */
  periodMs: number;
}

export interface ConnectionManagerOptions {
  /** Human-readable name used in console warnings. */
  name: string;
  /** Rate-limit rules matched by endpoint prefix (first match wins). */
  rules: RateLimitRule[];
  /** Maximum number of retries on HTTP 429. */
  maxRetries: number;
  /**
   * Called when a 429 is received. Returns the number of milliseconds to
   * wait before the next attempt, or `null` to stop retrying immediately.
   */
  getRetryWaitMs: (response: Response, attempt: number) => number | null;
  /** Optional callback fired every time a 429 is received. */
  onRateLimited?: (matchedRule: RateLimitRule | null) => void;
}

export class ConnectionManager {
  private chain: Promise<unknown> = Promise.resolve();
  private requestHistory = new Map<string, number[]>();
  private options: ConnectionManagerOptions;

  constructor(options: ConnectionManagerOptions) {
    this.options = options;
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Enqueue a request. The `fetchFn` will be called only when every
   * preceding request has completed and the rate limit allows it.
   *
   * @param endpoint  Logical endpoint path used for rate-limit matching
   *                  (query params are stripped automatically).
   * @param fetchFn   Function that performs the actual `fetch()` call.
   * @returns         The Response from the server.
   */
  request(endpoint: string, fetchFn: () => Promise<Response>): Promise<Response> {
    return new Promise<Response>((resolve, reject) => {
      this.chain = this.chain.then(async () => {
        try {
          resolve(await this.execute(endpoint, fetchFn));
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private findRule(endpoint: string): RateLimitRule | null {
    for (const rule of this.options.rules) {
      if (endpoint.startsWith(rule.pattern)) return rule;
    }
    return null;
  }

  private async waitForRateLimit(endpoint: string): Promise<void> {
    const rule = this.findRule(endpoint);
    if (!rule) return;

    const history = this.requestHistory.get(rule.pattern) ?? [];
    const now = Date.now();
    const windowStart = now - rule.periodMs;
    const recent = history.filter((t) => t > windowStart);

    if (recent.length >= rule.maxRequests) {
      const oldest = recent[0];
      const waitMs = oldest + rule.periodMs - now + 100; // +100ms safety margin
      if (waitMs > 0) {
        console.warn(`${this.options.name}: rate-limit wait ${waitMs}ms for ${rule.pattern}`);
        await wait(waitMs);
      }
    }
  }

  private recordRequest(endpoint: string): void {
    const rule = this.findRule(endpoint);
    if (!rule) return;

    const history = this.requestHistory.get(rule.pattern) ?? [];
    const windowStart = Date.now() - rule.periodMs;
    const recent = history.filter((t) => t > windowStart);
    recent.push(Date.now());
    this.requestHistory.set(rule.pattern, recent);
  }

  private async execute(
    endpoint: string,
    fetchFn: () => Promise<Response>,
  ): Promise<Response> {
    const endpointPath = endpoint.split('?')[0];

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      await this.waitForRateLimit(endpointPath);
      this.recordRequest(endpointPath);

      const response = await fetchFn();

      if (response.status !== 429) return response;

      // Notify listener
      this.options.onRateLimited?.(this.findRule(endpointPath));

      if (attempt < this.options.maxRetries) {
        const waitMs = this.options.getRetryWaitMs(response, attempt);
        if (waitMs === null) break;

        console.warn(
          `${this.options.name} 429 on ${endpoint} — waiting ${waitMs}ms ` +
            `(attempt ${attempt + 1}/${this.options.maxRetries + 1})`,
        );
        await wait(waitMs);
      }
    }

    throw new Error(
      `${this.options.name}: rate-limited after ${this.options.maxRetries + 1} attempts on ${endpoint}`,
    );
  }
}
