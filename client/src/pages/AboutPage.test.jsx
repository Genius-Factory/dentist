// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AboutPage from './AboutPage'
import { getTeam } from '../lib/recordsApi'

const auth = vi.hoisted(() => ({ getToken: vi.fn(), isLoaded: true, isSignedIn: true }))
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => auth }))
vi.mock('../lib/recordsApi', () => ({ getTeam: vi.fn() }))
afterEach(() => { cleanup(); vi.clearAllMocks(); auth.isSignedIn = true })
const open = () => render(<MemoryRouter><AboutPage /></MemoryRouter>)

test('shows existing dentists once with their active services', async () => {
  getTeam.mockResolvedValue([
    { id: 'one', name: 'Dr. Smith', services: ['Cleaning', 'Whitening'], bio: 'Focused on preventive care.' },
    { id: 'two', name: 'Dr. Ray', services: [] },
  ])
  open()
  expect(await screen.findByText('Cleaning, Whitening')).toBeTruthy()
  expect(screen.getAllByRole('heading', { name: 'Dr. Smith' })).toHaveLength(1)
  expect(screen.getByText('Dr. Ray')).toBeTruthy()
  expect(screen.getByText('Read biography')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Book appointment' }).getAttribute('href')).toBe('/reservation?dentistId=one')
  expect(screen.queryByText('Dr. Ava Morgan')).toBeNull()
})

test('shows an empty state when no dentists are assigned', async () => {
  getTeam.mockResolvedValue([])
  open()
  expect(await screen.findByText('No dentists are available for booking right now.')).toBeTruthy()
})

test('shows a load error instead of demo dentists', async () => {
  getTeam.mockRejectedValue(new Error('Failed'))
  open()
  expect((await screen.findByRole('alert')).textContent).toContain('Unable to load our team')
})

test('respects the existing authenticated API for signed-out visitors', () => {
  auth.isSignedIn = false
  open()
  expect(screen.getByRole('link', { name: 'Sign in to meet our dentists' }).getAttribute('href')).toContain('redirect_url=%2Fabout')
  expect(getTeam).not.toHaveBeenCalled()
})
