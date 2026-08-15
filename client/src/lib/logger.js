const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const enabled = import.meta.env.VITE_REMOTE_LOGGING !== 'false'
const levels = ['debug', 'info', 'warn', 'error']
const maxQueueSize = 100
const batchSize = 10
const flushDelayMs = 1000

let queue = []
let flushTimer = null
let installed = false
let userContext = {}

function serialize(value, depth = 0) {
  if (depth > 3) return '[Truncated]'
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => serialize(item, depth + 1))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).slice(0, 50).map(([key, item]) => [
      key,
      /(authorization|token|password|secret|cookie|session|api[_-]?key)/i.test(key)
        ? '[Redacted]'
        : serialize(item, depth + 1),
    ])
  )
}

function normalizeContext(context) {
  if (context instanceof Error) return { error: serialize(context) }
  if (!context || typeof context !== 'object') return {}
  return serialize(context)
}

function buildEntry(level, message, context) {
  return {
    level: levels.includes(level) ? level : 'info',
    message: String(message || 'Client log').slice(0, 1000),
    source: 'browser',
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    context: { ...userContext, ...normalizeContext(context) },
  }
}

function scheduleFlush() {
  if (!enabled || flushTimer) return
  flushTimer = window.setTimeout(() => {
    flushTimer = null
    flush()
  }, flushDelayMs)
}

export function log(level, message, context) {
  const entry = buildEntry(level, message, context)
  queue.push(entry)
  if (queue.length > maxQueueSize) queue = queue.slice(-maxQueueSize)

  if (level === 'error') {
    flush()
  } else {
    scheduleFlush()
  }
}

export function flush() {
  if (!enabled || queue.length === 0) return Promise.resolve()

  const logs = queue.splice(0, batchSize)
  return fetch(`${API_URL}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ logs }),
    keepalive: true,
  }).catch(() => {
    queue = [...logs, ...queue].slice(0, maxQueueSize)
  })
}

export function setLoggerUser(context = {}) {
  userContext = serialize(context)
}

export function installGlobalLogger() {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', (event) => {
    log('error', event.message || 'Unhandled browser error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: serialize(event.error),
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    log('error', 'Unhandled promise rejection', { reason: serialize(event.reason) })
  })

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && queue.length > 0) {
      const logs = queue.splice(0, batchSize)
      navigator.sendBeacon?.(`${API_URL}/api/logs`, new Blob([JSON.stringify({ logs })], { type: 'application/json' }))
    }
  })
}

const logger = {
  debug: (message, context) => log('debug', message, context),
  info: (message, context) => log('info', message, context),
  warn: (message, context) => log('warn', message, context),
  error: (message, context) => log('error', message, context),
  flush,
}

export default logger
