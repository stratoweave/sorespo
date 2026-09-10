import { browser } from '$app/environment';

/**
 * Run `task` every `intervalMs` while the tab is visible. A tick is skipped
 * while the previous run is still in flight, and a run is triggered as soon
 * as the tab becomes visible again. Returns a stop function. Does nothing
 * on the server.
 */
export function startPolling(
  task: () => Promise<unknown> | unknown,
  intervalMs: number,
  { immediate = true }: { immediate?: boolean } = {}
): () => void {
  if (!browser) return () => {};

  let inFlight = false;
  let stopped = false;

  const run = async (): Promise<void> => {
    if (inFlight || stopped) return;
    inFlight = true;
    try {
      await task();
    } finally {
      inFlight = false;
    }
  };

  const tick = (): void => {
    if (document.visibilityState === 'hidden') return;
    void run();
  };

  const onVisibility = (): void => {
    if (document.visibilityState === 'visible') void run();
  };

  if (immediate) tick();
  const timer = setInterval(tick, intervalMs);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
