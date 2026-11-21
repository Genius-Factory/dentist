// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoctorsPage from './DoctorsPage'
import { listDoctors } from '../lib/doctorsApi'

const account = vi.hoisted(() => ({ publicMetadata: { role: 'client' } }))
const getToken = vi.hoisted(() => vi.fn())
vi.mock('@clerk/clerk-react', () => ({
  useUser: () => ({ user: account, isLoaded: true }),
  useAuth: () => ({ getToken }),
}))
vi.mock('../lib/recordsApi', () => ({
  getTeam: async () => [{ id: 'one', name: 'Dr. Lee', services: ['Cleaning'], profileImageUrl: '/missing-photo.png' }],
  getServices: async () => [],
}))
vi.mock('../lib/doctorsApi', () => ({
  listDoctors: vi.fn(async () => ({
    items: [{ id: 'one', firstName: 'Amy', lastName: 'Lee', clinics: [], status: 'active' }],
    stats: {}, pagination: {},
  })),
  listSpecialties: async () => [],
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })
test.each(['client', 'secretary', 'admin', 'superadmin'])('%s sees the appropriate doctor controls', async role => {
  account.publicMetadata.role = role
  render(<MemoryRouter><DoctorsPage /></MemoryRouter>)
  await screen.findByRole('heading', { name: /Lee/ })
  for (const name of ['Add Doctor', 'Edit', 'Delete']) {
    expect(Boolean(screen.queryByRole('button', { name }))).toBe(role !== 'client')
  }
  if (role === 'client') expect(listDoctors).not.toHaveBeenCalled()
})

test('patients can filter doctors, clear an empty search, and see initials for broken photos', async () => {
  account.publicMetadata.role = 'client'
  render(<MemoryRouter><DoctorsPage /></MemoryRouter>)
  await screen.findByRole('heading', { name: 'Dr. Lee' })
  fireEvent.error(screen.getByRole('img', { name: 'Dr. Lee' }))
  expect(screen.getByLabelText('Dr. Lee profile photo').textContent).toBe('DL')
  fireEvent.change(screen.getByRole('textbox', { name: 'Search doctors' }), { target: { value: 'missing' } })
  expect(screen.getByRole('heading', { name: 'No dentists found' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByRole('heading', { name: 'Dr. Lee' })).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox', { name: 'Service' }), { target: { value: 'Cleaning' } })
  expect(screen.getByRole('heading', { name: 'Dr. Lee' })).toBeTruthy()
})
