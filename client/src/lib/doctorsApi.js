const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'
async function request(getToken, path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { Authorization: `Bearer ${await getToken()}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) } })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || 'Could not complete the request.')
  return body
}
export const listDoctors = (getToken, params = {}) => request(getToken, `/api/doctors?${new URLSearchParams(params)}`)
export const getDoctor = (getToken, id) => request(getToken, `/api/doctors/${id}`)
export const createDoctor = (getToken, body) => request(getToken, '/api/doctors', { method: 'POST', body: JSON.stringify(body) })
export const updateDoctor = (getToken, id, body) => request(getToken, `/api/doctors/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const setDoctorStatus = (getToken, id, status) => request(getToken, `/api/doctors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const listSpecialties = (getToken) => request(getToken, '/api/doctors/specialties')
