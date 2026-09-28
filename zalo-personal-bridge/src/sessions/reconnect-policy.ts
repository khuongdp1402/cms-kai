export class ReconnectPolicy {
  // Backoff intervals: 1s, 2s, 4s, 8s, 16s, 30s, 60s
  private static backoffSteps = [1000, 2000, 4000, 8000, 16000, 30000, 60000];
  private static maxAttemptsInWindow = 10;
  private static windowMs = 15 * 60 * 1000; // 15 minutes

  private attempts: number[] = [];

  recordAttempt(): boolean {
    const now = Date.now();
    this.attempts = this.attempts.filter((ts) => now - ts < ReconnectPolicy.windowMs);

    if (this.attempts.length >= ReconnectPolicy.maxAttemptsInWindow) {
      return false; // Exceeded limit
    }

    this.attempts.push(now);
    return true;
  }

  getNextBackoffMs(): number {
    const attemptIndex = Math.min(this.attempts.length, ReconnectPolicy.backoffSteps.length - 1);
    const baseMs = ReconnectPolicy.backoffSteps[attemptIndex];
    // Full jitter between baseMs/2 and baseMs
    const jitter = Math.floor(Math.random() * (baseMs / 2));
    return Math.floor(baseMs / 2) + jitter;
  }

  reset(): void {
    this.attempts = [];
  }
}
