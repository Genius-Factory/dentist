// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ServiceTransferDialog from './ServiceTransferDialog'
import { getServiceUsage } from '../lib/recordsApi'

vi.mock('../lib/recordsApi', () => ({ getServiceUsage: vi.fn() }))
const services = [
  { id: 'from', name: 'Original', status: 'active', duration: 30, dentists: [{ id: 'd' }] },
  { id: 'to', name: 'Replacement', status: 'active', duration: 30, dentists: [{ id: 'd' }] },
  { id: 'wrong', name: 'Wrong duration', status: 'active', duration: 60, dentists: [{ id: 'd' }] },
  { id: 'inactive', name: 'Inactive', status: 'inactive', duration: 30, dentists: [{ id: 'd' }] },
]
const getToken = vi.fn()
beforeEach(() => getServiceUsage.mockResolvedValue({ total: 5, upcoming: 2, dentists: ['d'], durations: [30] }))
afterEach(cleanup)
test('admin selects From and To and transfers only compatible upcoming bookings', async () => {
  const onTransfer = vi.fn().mockResolvedValue(undefined); const onClose = vi.fn()
  render(<ServiceTransferDialog services={services} getToken={getToken} onTransfer={onTransfer} onClose={onClose} />)
  fireEvent.change(screen.getByLabelText('From service'), { target: { value: 'from' } })
  await screen.findByText(/2 upcoming pending/)
  const target = screen.getByLabelText('To service')
  expect([...target.options].map((item) => item.value)).toEqual(['', 'to'])
  fireEvent.change(target, { target: { value: 'to' } })
  fireEvent.click(screen.getByRole('button', { name: 'Transfer' }))
  await waitFor(() => expect(onTransfer).toHaveBeenCalledWith('from', 'to'))
  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
})
test('deactivation fixes the source and keeps the dialog open on server rejection', async () => {
  const onClose = vi.fn()
  render(<ServiceTransferDialog services={services} source={services[0]} deactivate getToken={getToken} onTransfer={vi.fn().mockRejectedValue(new Error('Destination changed. Try again.'))} onClose={onClose} />)
  await screen.findByText(/2 upcoming pending/)
  expect(screen.getByLabelText('From service').disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('To service'), { target: { value: 'to' } })
  fireEvent.click(screen.getByRole('button', { name: 'Transfer & deactivate' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Destination changed')
  expect(onClose).not.toHaveBeenCalled()
})
test('no compatible service blocks transfer with a clear explanation', async () => {
  getServiceUsage.mockResolvedValue({ total: 2, upcoming: 2, dentists: ['other'], durations: [30] })
  render(<ServiceTransferDialog services={services} source={services[0]} getToken={getToken} onTransfer={vi.fn()} onClose={vi.fn()} />)
  await screen.findByText(/No compatible replacement/)
  expect(screen.getByRole('button', { name: 'Transfer' }).disabled).toBe(true)
})
