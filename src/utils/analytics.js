const ANALYTICS_VERSION = 1

const SESSION_KEY = 'ds_analytics_session'

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

function buildPayload(event, properties) {
  return {
    event,
    v: ANALYTICS_VERSION,
    session: getSessionId(),
    ts: Date.now(),
    url: window.location.pathname,
    ...properties,
  }
}

/**
 * Core analytics tracker. Logs structured events with optional properties.
 *
 * Replace the body of this function with your preferred analytics provider
 * (e.g. Meta Pixel, Amplitude, Mixpanel, PostHog, or a custom endpoint).
 * The current implementation logs to console in development and is a no-op
 * in production, making it safe to ship before a backend is wired up.
 */
export function track(event, properties = {}) {
  const payload = buildPayload(event, properties)

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('%c[analytics]', 'color:#21C063;font-weight:bold', event, payload)
  }

  // TODO: send to your analytics backend, e.g.:
  // navigator.sendBeacon('/api/analytics', JSON.stringify(payload))
}

/**
 * Track errors / exceptions with structured context.
 */
export function trackError(event, error, context = {}) {
  const payload = buildPayload(event, {
    error_message: error?.message || String(error),
    error_stack: import.meta.env.DEV ? error?.stack : undefined,
    ...context,
  })

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('%c[analytics:error]', 'color:#ff4444;font-weight:bold', event, payload)
  }
}

/**
 * Track timed operations (e.g. recording, export conversion).
 * Returns a function that, when called, logs the duration.
 */
export function trackTimed(event, properties = {}) {
  const start = performance.now()
  return (endProperties = {}) => {
    const durationMs = Math.round(performance.now() - start)
    track(event, { ...properties, ...endProperties, duration_ms: durationMs })
  }
}
