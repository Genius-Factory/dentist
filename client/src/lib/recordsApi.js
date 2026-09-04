const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function request(getToken, path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${await getToken()}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Request failed')
  return body
}

async function requestBody(getToken, path, body, headers = {}) {
  console.log('[recordsApi] raw request', {
    path,
    method: 'PUT',
    contentType: headers['Content-Type'],
    size: body?.size || body?.byteLength || 0,
  })
  const response = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    body,
    headers: { Authorization: `Bearer ${await getToken()}`, ...headers },
  })
  const result = await response.json().catch(() => ({}))
  console.log('[recordsApi] raw response', {
    path,
    status: response.status,
    ok: response.ok,
    hasProfilePicture: Boolean(result.profilePicture),
    profilePictureType: result.profilePictureType || '',
  })
  if (!response.ok) throw new Error(result.error || 'Request failed')
  return result
}

export const getProfiles = (getToken) => request(getToken, '/api/records/profiles')
export const createProfile = (getToken, profile) => request(getToken, '/api/records/profiles', { method: 'POST', body: JSON.stringify(profile) })
export const updateProfile = (getToken, profile) => request(getToken, `/api/records/profiles/${profile.id}`, { method: 'PUT', body: JSON.stringify(profile) })
export const uploadProfilePicture = (getToken, id, file) => requestBody(getToken, `/api/records/profiles/${id}/profile-picture`, file, { 'Content-Type': file.type })
export const deleteProfilePicture = (getToken, id) => request(getToken, `/api/records/profiles/${id}/profile-picture`, { method: 'DELETE' })
export const getAppointments = (getToken) => request(getToken, '/api/records/appointments')
export const getUsers = (getToken) => request(getToken, '/api/users')
export const createAppointment = (getToken, appointment) => request(getToken, '/api/records/appointments', { method: 'POST', body: JSON.stringify(appointment) })
export const updateAppointment = (getToken, appointment) => request(getToken, `/api/records/appointments/${appointment.id}`, { method: 'PUT', body: JSON.stringify(appointment) })
export const deleteAppointment = (getToken, id) => request(getToken, `/api/records/appointments/${id}`, { method: 'DELETE' })
