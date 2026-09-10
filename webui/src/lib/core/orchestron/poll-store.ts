import { writable, type Readable } from 'svelte/store';

import { fetchAllDeviceQueues, type QueueItemSummary } from '$lib/core/orchestron/client';
import { startPolling } from '$lib/core/util/poll';

export interface QueuesPollValue {
  queues: QueueItemSummary[];
  error: string | null;
  loaded: boolean;
  /** Wall-clock time (ms) of the last successful fetch, or null before the first one. */
  updatedAt: number | null;
}

const INITIAL: QueuesPollValue = { queues: [], error: null, loaded: false, updatedAt: null };
const POLL_INTERVAL_MS = 1000;

const internal = writable<QueuesPollValue>(INITIAL);
let current = INITIAL;
let subscriberCount = 0;
let stopPolling: (() => void) | null = null;
let inFlight: Promise<void> | null = null;

function fetchOnce(): Promise<void> {
  if (!inFlight) {
    inFlight = (async () => {
      try {
        const queues = await fetchAllDeviceQueues();
        current = { queues, error: null, loaded: true, updatedAt: Date.now() };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load queue data.';
        current = { ...current, error: message };
      } finally {
        inFlight = null;
      }
      internal.set(current);
    })();
  }
  return inFlight;
}

/**
 * Shared 1 s poll of every device queue. Polling starts with the first
 * subscriber and stops with the last; on the server nothing is fetched.
 */
export const queuesPoll: Readable<QueuesPollValue> = {
  subscribe(run, invalidate) {
    if (subscriberCount === 0) {
      stopPolling = startPolling(fetchOnce, POLL_INTERVAL_MS);
    }
    subscriberCount++;

    const unsub = internal.subscribe(run, invalidate);

    return () => {
      subscriberCount--;
      if (subscriberCount === 0) {
        stopPolling?.();
        stopPolling = null;
      }
      unsub();
    };
  }
};

/**
 * Fetch the queues again, guaranteeing the result reflects server state at or
 * after this call — an in-flight poll response (requested earlier) is awaited
 * and then a fresh fetch is issued.
 */
export async function refreshQueues(): Promise<void> {
  if (inFlight) {
    await inFlight;
  }
  await fetchOnce();
}
