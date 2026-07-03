export const BOOKINGS_STORAGE_KEY = 'dentistBookings'
export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

export function getStoredBookings() {
  try {
    return JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY)) || []
  } catch {
    return []
  }
}

export function saveStoredBookings(bookings) {
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings))
}

export function normalizeRole(role) {
  return (role || 'member').toLowerCase()
}

export function isSecretaryRole(role) {
  return normalizeRole(role) === 'secretary'
}

export function getBookingStatus(booking) {
  return booking.status || 'approved'
}

export function isBookingEditable(booking, now = Date.now()) {
  return getBookingStatus(booking) === 'pending' && new Date(booking.editableUntil).getTime() > now
}

export function getAppointmentTimestamp(booking) {
  return new Date(`${booking.date}T${booking.time || '00:00'}`).getTime()
}

export function isArchivedBooking(booking, now = Date.now()) {
  const status = getBookingStatus(booking)

  if (status === 'declined') return true
  if (status !== 'approved') return false

  const appointmentTime = getAppointmentTimestamp(booking)
  return Number.isFinite(appointmentTime) && appointmentTime < now
}

export function getStatusLabel(status) {
  if (status === 'pending') return 'Pending approval'
  if (status === 'declined') return 'Declined'
  return 'Approved'
}

export function getStatusClasses(status) {
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'declined') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}
