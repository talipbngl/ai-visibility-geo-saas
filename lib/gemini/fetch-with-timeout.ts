const DEFAULT_TIMEOUT_MS = 45_000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        `Gemini ${Math.round(
          timeoutMs / 1000
        )} saniye içinde cevap vermedi. Tekrar deneyebilirsin.`
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}