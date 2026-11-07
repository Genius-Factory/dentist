// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReservationPage from './ReservationPage'
import { getAppointments, getProfiles, getServices } from '../lib/recordsApi'

const auth = vi.hoisted(() => ({ user: { id: 'patient', publicMetadata: {} }, getToken: vi.fn() }))
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ getToken: auth.getToken }), useUser: () => ({ user: auth.user, isLoaded: true }) }))
vi.mock('../lib/recordsApi', () => ({ getServices: vi.fn(), getProfiles: vi.fn(), getAppointments: vi.fn(), getAvailability: vi.fn(), createAppointment: vi.fn(), updateAppointment: vi.fn() }))
vi.mock('../components/ServicesManager', () => ({ formatPrice: (price) => `$${price}` }))

beforeEach(() => {
  auth.user = { id: 'patient', publicMetadata: {} }
  getProfiles.mockResolvedValue([])
  getAppointments.mockResolvedValue([])
  getServices.mockResolvedValue([
    { id: 'whitening', name: 'Whitening', status: 'active', duration: 30, price: 100, dentists: [{ id: 'dentist', name: 'Dr. Smith' }] },
    { id: 'inactive', name: 'Inactive service', status: 'inactive', duration: 20, dentists: [] },
  ])
})
afterEach(cleanup)
const open = (url) => render(<MemoryRouter initialEntries={[url]}><ReservationPage /></MemoryRouter>)

test('service booking starts at dentist selection and Back allows changing the service', async () => {
  open('/reservation?serviceId=whitening')
  expect(await screen.findByRole('heading', { name: 'Choose a dentist' })).toBeTruthy()
  expect(screen.getByText('Whitening · 30 minutes')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByRole('heading', { name: 'Select a service' })).toBeTruthy()
})

test.each(['/reservation', '/reservation?serviceId=missing', '/reservation?serviceId=inactive', '/reservation?edit=existing&serviceId=whitening'])('%s keeps service selection as the first step', async (url) => {
  open(url)
  expect(await screen.findByRole('heading', { name: 'Select a service' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Choose a dentist' })).toBeNull()
})

test('sign-in preserves the selected service in the return URL', () => {
  auth.user = null
  open('/reservation?serviceId=whitening')
  const link = screen.getByRole('link', { name: 'Sign In' })
  expect(new URL(link.href).searchParams.get('redirect_url')).toBe('/reservation?serviceId=whitening')
})
