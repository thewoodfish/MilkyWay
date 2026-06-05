import { DeadlineError } from "./errors";

export function withTimeout<T>(
  promise:       Promise<T>,
  deadlineEpoch: number        // unix seconds
): Promise<T> {
  const msRemaining = (deadlineEpoch * 1000) - Date.now() - 1000;

  if (msRemaining <= 0) {
    return Promise.reject(new DeadlineError());
  }

  // Cap at 24 days — setTimeout overflows 32-bit int beyond that
  const safeMs = Math.min(msRemaining, 2_147_483_647);

  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new DeadlineError()), safeMs)
    ),
  ]);
}
