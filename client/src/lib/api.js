import axios from 'axios'
import logger from './logger'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000',
})

export function setupApiInterceptor(getToken) {
  api.interceptors.request.clear()
  api.interceptors.response.clear()

  api.interceptors.request.use(async (config) => {
    const token = await getToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  })

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      logger.error('API request failed', {
        method: error.config?.method,
        url: error.config?.url,
        status: error.response?.status,
        requestId: error.response?.headers?.['x-request-id'],
        message: error.message,
      })
      return Promise.reject(error)
    }
  )
}

export default api
