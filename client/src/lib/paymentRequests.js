const reads = new Map()

// Share only in-flight reads. Opening the dialog later always fetches fresh data.
export function billingRead(key, read, fresh = false) {
  if (!fresh && reads.has(key)) return reads.get(key)
  const promise = Promise.resolve().then(read).finally(() => {
    if (reads.get(key) === promise) reads.delete(key)
  })
  reads.set(key, promise)
  return promise
}

export const pendingPaymentKey = (userId, appointmentId) =>
  `pending-payment:${JSON.stringify([userId, appointmentId])}`

export function readPendingPayment(key) {
  const raw = sessionStorage.getItem(key)
  if (!raw) return null
  const payment = JSON.parse(raw)
  if (!payment.id || typeof payment.amount !== 'string' || !payment.receivedDate || !Number.isInteger(payment.timezoneOffset)) {
    throw new Error('Saved payment details could not be read. Resolve the pending payment before recording another.')
  }
  return payment
}

export function persistPayment(key, payment) {
  // Fail closed if storage is unavailable: never send an unprotected payment.
  sessionStorage.setItem(key, JSON.stringify(payment))
}

export function clearPendingPayment(key) {
  sessionStorage.removeItem(key)
}
