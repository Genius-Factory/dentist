// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { recordPayment } from './recordsApi'

afterEach(() => vi.unstubAllGlobals())
test('HTTP errors expose status without changing the submitted retry payload', async () => {
  const fetch = vi.fn(async () => ({ ok: false, status: 409, json: async () => ({ error: 'Payment exceeds the remaining balance' }) }))
  vi.stubGlobal('fetch', fetch)
  const body = { id: 'same-id', amount: '30.00', receivedDate: '2024-01-01', timezoneOffset: 120 }
  await expect(recordPayment(async () => 'token', 'a', body)).rejects.toMatchObject({ status: 409 })
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(body)
})
test('network failures and unreadable success responses have uncertain status', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ ok: true, status: 201, json: async () => { throw new Error('Incomplete response') } }))
  await expect(recordPayment(async () => 'token', 'a', {})).rejects.toMatchObject({ status: 0 })
  await expect(recordPayment(async () => 'token', 'a', {})).rejects.toMatchObject({ status: 0 })
})
