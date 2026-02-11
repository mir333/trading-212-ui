import { useEffect, useRef } from 'react';
import { getPreferences } from '@/services/storage';

type IntervalKey = 'pollingIntervalPositions' | 'pollingIntervalPrices';

export function usePolling(
  callback: () => Promise<void>,
  intervalKey: IntervalKey,
): void {
  const callbackRef = useRef(callback);

  // Keep the callback ref up-to-date without causing re-subscriptions
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const prefs = getPreferences();
    const intervalSeconds = prefs[intervalKey];
    const intervalMs = intervalSeconds * 1000;

    let timerId: ReturnType<typeof setInterval> | null = null;

    function start() {
      if (timerId !== null) return;
      timerId = setInterval(() => {
        void callbackRef.current();
      }, intervalMs);
    }

    function stop() {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }

    // Start polling immediately
    start();

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalKey]);
}
