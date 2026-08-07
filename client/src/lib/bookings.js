export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

export function normalizeRole(role) {
  const value = String(role || '').toLowerCase()
  return ['superadmin', 'admin', 'secretary', 'member'].includes(value) ? value : 'member'
}

export function isSecretaryRole(role) {
  return ['secretary', 'admin', 'superadmin'].includes(normalizeRole(role))
}

export function isStaffRole(role) {
  const normalizedRole = normalizeRole(role)
  return ['secretary', 'admin', 'superadmin'].includes(normalizedRole)
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

  if (status === 'declined' || status === 'archived') return true
  if (status !== 'approved') return false

  const appointmentTime = getAppointmentTimestamp(booking)
  return Number.isFinite(appointmentTime) && appointmentTime < now
}

export function getStatusLabel(status) {
  if (status === 'archived') return 'Archived'
  if (status === 'pending') return 'Pending approval'
  if (status === 'declined') return 'Declined'
  return 'Approved'
}

export function getStatusClasses(status) {
  if (status === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  if (status === 'declined') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}
