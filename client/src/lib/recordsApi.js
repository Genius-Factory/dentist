const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(getToken, path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${await getToken()}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Request failed')
  return body
}

export const getProfiles = (getToken) => request(getToken, '/api/records/profiles')
export const createProfile = (getToken, profile) => request(getToken, '/api/records/profiles', { method: 'POST', body: JSON.stringify(profile) })
export const updateProfile = (getToken, profile) => request(getToken, `/api/records/profiles/${profile.id}`, { method: 'PUT', body: JSON.stringify(profile) })
export const getAppointments = (getToken) => request(getToken, '/api/records/appointments')
export const createAppointment = (getToken, appointment) => request(getToken, '/api/records/appointments', { method: 'POST', body: JSON.stringify(appointment) })
export const updateAppointment = (getToken, appointment) => request(getToken, `/api/records/appointments/${appointment.id}`, { method: 'PUT', body: JSON.stringify(appointment) })
export const deleteAppointment = (getToken, id) => request(getToken, `/api/records/appointments/${id}`, { method: 'DELETE' })
