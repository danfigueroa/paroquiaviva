import axios from 'axios'
import { getSupabaseClient } from '@/lib/supabase'
import { useSessionStore } from '@/state/session-store'

function resolveBaseURL() {
  const envURL = import.meta.env.VITE_API_BASE_URL
  if (envURL) {
    return envURL
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  return `http://${host}:8080/api/v1`
}

export const api = axios.create({
  baseURL: resolveBaseURL()
})

api.interceptors.request.use(async (config) => {
  const supabase = getSupabaseClient()
  let token = useSessionStore.getState().accessToken ?? localStorage.getItem('accessToken')

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const sessionToken = data.session?.access_token ?? null
    if (sessionToken && sessionToken !== token) {
      token = sessionToken
      useSessionStore.getState().setAccessToken(sessionToken)
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  } else if (config.headers?.Authorization) {
    delete config.headers.Authorization
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as any
    if (!error?.response && originalRequest && !originalRequest?._hostRetry) {
      originalRequest._hostRetry = true
      const currentURL = String(originalRequest.baseURL || api.defaults.baseURL || '')
      if (currentURL.includes('localhost')) {
        originalRequest.baseURL = currentURL.replace('localhost', '127.0.0.1')
      } else if (currentURL.includes('127.0.0.1')) {
        originalRequest.baseURL = currentURL.replace('127.0.0.1', 'localhost')
      }
      return api(originalRequest)
    }

    const status = error?.response?.status
    if (status !== 401 || originalRequest?._retry) {
      return Promise.reject(error)
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    const { data, error: refreshError } = await supabase.auth.refreshSession()
    if (refreshError || !data.session?.access_token) {
      useSessionStore.getState().setAccessToken(null)
      return Promise.reject(error)
    }

    const token = data.session.access_token
    useSessionStore.getState().setAccessToken(token)
    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers.Authorization = `Bearer ${token}`
    return api(originalRequest)
  }
)
