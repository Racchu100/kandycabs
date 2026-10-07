/**
 * Global Navigation Lock / Debounce Helper
 * Prevents rapid double-tapping on buttons from opening duplicate screens.
 */

let isNavigating = false;

export function safeNavigate(action: () => void, timeoutMs: number = 700) {
  if (isNavigating) return;
  isNavigating = true;
  try {
    action();
  } catch (error) {
    console.error('[safeNavigate error]', error);
  } finally {
    setTimeout(() => {
      isNavigating = false;
    }, timeoutMs);
  }
}
