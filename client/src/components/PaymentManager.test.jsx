// @vitest-environment jsdom
import { StrictMode, useState } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PaymentManager from './PaymentManager'
import { confirmCharge, getBilling, recordPayment, voidPayment } from '../lib/recordsApi'
import { billingRead, pendingPaymentKey } from '../lib/paymentRequests'

vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ userId: 'staff', sessionId: 'session', getToken: () => Promise.resolve('token') }) }))
vi.mock('../lib/recordsApi', () => ({ getBilling: vi.fn(), recordPayment: vi.fn(), confirmCharge: vi.fn(), voidPayment: vi.fn() }))
const appointment = { id: 'a', name: 'Patient Example', date: '2026-10-22' }
const initial = () => ({ appointment: { price: '100' }, charge: { amount: '100', service_name: 'Whitening', issued_date: '2024-01-01' }, collectedCents: 0, remainingCents: 10000, payments: [] })
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r }); return { promise, resolve } }
let ledger
beforeEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  ledger = initial()
  getBilling.mockImplementation(async () => structuredClone(ledger))
  recordPayment.mockImplementation(async (_token, _id, request) => {
    if (!ledger.payments.some((p) => p.id === request.id)) {
      ledger.payments.push({ ...request, received_date: request.receivedDate })
      ledger.collectedCents += Number(request.amount) * 100
      ledger.remainingCents -= Number(request.amount) * 100
    }
    return { success: true }
  })
})
afterEach(cleanup)
async function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Manage Payment' }))
  return screen.findByLabelText('Payment amount (USD)')
}
async function review(amount = '30') {
  fireEvent.change(await screen.findByLabelText('Payment amount (USD)'), { target: { value: amount } })
  fireEvent.click(screen.getByRole('button', { name: 'Submit payment' }))
}

test('StrictMode and unstable token callbacks share reads; typing and rerenders preserve input', async () => {
  const view = render(<StrictMode><PaymentManager appointment={appointment} /></StrictMode>)
  const input = await open()
  fireEvent.change(input, { target: { value: '25' } })
  view.rerender(<StrictMode><PaymentManager appointment={{ ...appointment }} /></StrictMode>)
  expect(input.value).toBe('25')
  expect(getBilling).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByLabelText('Close payment dialog'))
  await open()
  expect(getBilling).toHaveBeenCalledTimes(2)
})

test('Enter opens review, Back preserves details, rapid confirmation records once', async () => {
  const updated = vi.fn()
  window.addEventListener('billing-updated', updated)
  const user = userEvent.setup()
  render(<PaymentManager appointment={appointment} />)
  const input = await open()
  await user.clear(input)
  await user.type(input, '30{Enter}')
  expect(recordPayment).not.toHaveBeenCalled()
  expect(screen.getByRole('region', { name: 'Review payment' }).textContent).toContain('$70.00')
  await user.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByLabelText('Payment amount (USD)').value).toBe('30')
  await review()
  const button = screen.getByRole('button', { name: 'Confirm payment' })
  act(() => { button.click(); button.click() })
  await screen.findByText('Payment recorded.')
  await screen.findByLabelText('Payment amount (USD)')
  expect(recordPayment).toHaveBeenCalledTimes(1)
  expect(ledger.payments).toHaveLength(1)
  expect(updated).toHaveBeenCalledTimes(1)
  window.removeEventListener('billing-updated', updated)
})

test('confirming a charge prefills the payment so its amount is entered only once', async () => {
  ledger.charge = null; ledger.remainingCents = null; ledger.appointment.price = null
  confirmCharge.mockImplementation(async (_token, _id, request) => {
    ledger.charge = { amount: request.amount, issued_date: request.issuedDate, service_name: 'Consultation' }
    ledger.remainingCents = Number(request.amount) * 100
  })
  render(<PaymentManager appointment={appointment} />)
  fireEvent.click(screen.getByRole('button', { name: 'Manage Payment' }))
  fireEvent.change(await screen.findByLabelText('Confirm charge (USD)'), { target: { value: '100' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirm charge' }))
  expect((await screen.findByLabelText('Payment amount (USD)')).value).toBe('100.00')
  expect(recordPayment).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Submit payment' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByText('No outstanding balance.')
  expect(recordPayment.mock.calls[0][2].amount).toBe('100.00')
})

test('remaining balance is prefilled and overpayments get an inline error', async () => {
  ledger.remainingCents = 7000; ledger.collectedCents = 3000
  render(<PaymentManager appointment={appointment} />)
  const input = await open()
  expect(input.value).toBe('70.00')
  fireEvent.change(input, { target: { value: '1000' } })
  expect(screen.getByRole('alert').textContent).toContain('$70.00')
  expect(screen.getByRole('button', { name: 'Submit payment' }).disabled).toBe(true)
  expect(recordPayment).not.toHaveBeenCalled()
})

test('definitive rejection refreshes the balance and allows a corrected submission', async () => {
  render(<PaymentManager appointment={appointment} />)
  await open(); await review()
  recordPayment.mockRejectedValueOnce(Object.assign(new Error('Payment exceeds the remaining balance'), { status: 409 }))
  ledger.remainingCents = 2000; ledger.collectedCents = 8000
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByText('Payment exceeds the remaining balance')
  expect(screen.getByLabelText('Payment amount (USD)').max).toBe('20.00')
  expect(sessionStorage.getItem(pendingPaymentKey('staff', 'a'))).toBeNull()
  await review('20')
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByText('No outstanding balance.')
  expect(recordPayment.mock.calls[1][2].id).not.toBe(recordPayment.mock.calls[0][2].id)
})

test('lost response survives closing and remounting; retry uses immutable ID and payload', async () => {
  let view = render(<PaymentManager appointment={appointment} />)
  await open(); await review()
  recordPayment.mockRejectedValueOnce(Object.assign(new Error('Connection lost'), { status: 0 }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByText('Connection lost')
  const first = recordPayment.mock.calls[0][2]
  expect(JSON.parse(sessionStorage.getItem(pendingPaymentKey('staff', 'a')))).toEqual(first)
  expect(screen.queryByLabelText('Payment amount (USD)')).toBeNull()
  fireEvent.click(screen.getByLabelText('Close payment dialog'))
  view.unmount()
  view = render(<PaymentManager appointment={appointment} />)
  fireEvent.click(screen.getByRole('button', { name: 'Manage Payment' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Retry same payment' }).disabled).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: 'Retry same payment' }))
  await screen.findByText('Payment recorded.')
  expect(recordPayment.mock.calls[1][2]).toEqual(first)
  expect(ledger.payments).toHaveLength(1)
  view.unmount()
})

test('committed payment with lost response is recovered on reopen without resubmitting', async () => {
  const view = render(<PaymentManager appointment={appointment} />)
  await open(); await review()
  recordPayment.mockImplementationOnce(async (_token, _id, request) => {
    ledger.payments.push({ ...request, received_date: request.receivedDate })
    ledger.remainingCents = 7000; ledger.collectedCents = 3000
    getBilling.mockRejectedValueOnce(new Error('Read failed'))
    throw new Error('Response lost')
  })
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByText('Response lost')
  fireEvent.click(screen.getByLabelText('Close payment dialog'))
  view.unmount()
  render(<PaymentManager appointment={appointment} />)
  await open()
  expect(screen.getByText('Payment recorded.')).toBeTruthy()
  expect(recordPayment).toHaveBeenCalledTimes(1)
  expect(ledger.payments).toHaveLength(1)
  expect(sessionStorage.getItem(pendingPaymentKey('staff', 'a'))).toBeNull()
})

test.each([
  ['not_billed', 'Not billed'], ['unpaid', 'Unpaid'], ['partial', 'Partially paid'], ['paid', 'Paid'],
])('appointment status %s is displayed without billing requests', (status, label) => {
  render(<PaymentManager appointment={{ ...appointment, billing: { status } }} />)
  expect(screen.getByLabelText(`Payment status: ${label}`)).toBeTruthy()
  expect(getBilling).not.toHaveBeenCalled()
  if (status === 'paid') expect(screen.getByRole('button', { name: 'Payment Details' })).toBeTruthy()
})

test('full payment updates the card to Paid and details remain accessible', async () => {
  function Card() {
    const [item, setItem] = useState({ ...appointment, billing: { status: 'unpaid' } })
    return <PaymentManager appointment={item} onBillingChange={(_id, billing) => setItem((previous) => ({ ...previous, billing }))} />
  }
  render(<Card />)
  await open(); await review('100')
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByLabelText('Payment status: Paid')
  await screen.findByText('No outstanding balance.')
  fireEvent.click(screen.getByLabelText('Close payment dialog'))
  fireEvent.click(screen.getByRole('button', { name: 'Payment Details' }))
  await screen.findByText('No outstanding balance.')
  expect(screen.getByText('Payment history')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Void payment' })).toBeTruthy()
  expect(recordPayment).toHaveBeenCalledTimes(1)
})

test('successful write followed by failed read offers read retry only', async () => {
  render(<PaymentManager appointment={appointment} />)
  await open(); await review('100')
  getBilling.mockRejectedValueOnce(new Error('Refresh failed'))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByText('Refresh failed')
  expect(screen.getByText('Payment recorded.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Retry same payment' })).toBeNull()
  expect(screen.queryByLabelText('Payment amount (USD)')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Check payment status' }))
  await screen.findByText('No outstanding balance.')
  expect(recordPayment).toHaveBeenCalledTimes(1)
})

test('an old appointment response cannot replace the newly opened appointment', async () => {
  const slow = deferred()
  getBilling.mockReturnValueOnce(slow.promise)
  const view = render(<PaymentManager appointment={appointment} />)
  fireEvent.click(screen.getByRole('button', { name: 'Manage Payment' }))
  await waitFor(() => expect(getBilling).toHaveBeenCalledTimes(1))
  view.rerender(<PaymentManager appointment={{ ...appointment, id: 'b', name: 'New Patient' }} />)
  await screen.findByLabelText('Payment amount (USD)')
  await act(async () => slow.resolve({ ...initial(), charge: { ...initial().charge, service_name: 'Old service' } }))
  expect(screen.queryByText('Old service')).toBeNull()
  expect(screen.getByText(/New Patient/)).toBeTruthy()
})

test('storage failure prevents sending payment', async () => {
  render(<PaymentManager appointment={appointment} />)
  await open(); await review()
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  fireEvent.click(screen.getByRole('button', { name: 'Confirm payment' }))
  await screen.findByText('Storage unavailable')
  expect(recordPayment).not.toHaveBeenCalled()
  storage.mockRestore()
})

test('overlapping reads share a promise, while post-write reads bypass older data', async () => {
  const slow = deferred()
  const read = vi.fn(() => slow.promise)
  const first = billingRead('test-scope', read)
  expect(billingRead('test-scope', read)).toBe(first)
  const fresh = billingRead('test-scope', () => Promise.resolve('fresh'), true)
  expect(await fresh).toBe('fresh')
  slow.resolve('old')
  expect(await first).toBe('old')
  expect(read).toHaveBeenCalledTimes(1)
})

test('voiding retains the existing flow and refreshes the balance', async () => {
  ledger.payments = [{ id: 'paid', amount: '100', received_date: '2024-01-02' }]
  ledger.remainingCents = 0; ledger.collectedCents = 10000
  voidPayment.mockImplementation(async () => {
    ledger.payments[0].voided_at = '2024-01-03'; ledger.payments[0].void_reason = 'Wrong entry'
    ledger.remainingCents = 10000; ledger.collectedCents = 0
  })
  render(<PaymentManager appointment={appointment} />)
  fireEvent.click(screen.getByRole('button', { name: 'Manage Payment' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Void payment' }))
  fireEvent.change(screen.getByLabelText('Reason for voiding'), { target: { value: 'Wrong entry' } })
  fireEvent.click(screen.getByRole('button', { name: 'Confirm void' }))
  await screen.findByText('Voided')
  expect(voidPayment).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('Payment amount (USD)')).toBeTruthy()
})
