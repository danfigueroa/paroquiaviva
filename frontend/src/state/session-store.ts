import { create } from 'zustand'

type SessionState = {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
}

export const useSessionStore = create<SessionState>((set) => ({
  accessToken: localStorage.getItem('accessToken'),
  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem('accessToken', token)
    } else {
      localStorage.removeItem('accessToken')
    }
    set({ accessToken: token })
  }
}))
