/**
 * Authentication Hook - Zustand store
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authAPI } from '../services/api'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      login: async (username, password) => {
        try {
          const response = await authAPI.login(username, password)
          const { access_token, user } = response.data
          
          localStorage.setItem('token', access_token)
          localStorage.setItem('user', JSON.stringify(user))
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
          })
          
          return { success: true, user }
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.detail || 'Login failed',
          }
        }
      },
      
      register: async (username, email, password, fullName, role = 'operator') => {
        try {
          const response = await authAPI.register(username, email, password, fullName, role)
          const { access_token, user } = response.data
          
          localStorage.setItem('token', access_token)
          localStorage.setItem('user', JSON.stringify(user))
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
          })
          
          return { success: true, user }
        } catch (error) {
          return {
            success: false,
            error: error.response?.data?.detail || 'Registration failed',
          }
        }
      },
      
      loginWithGoogle: async (googleToken) => {
        try {
          const response = await authAPI.loginWithGoogle(googleToken)
          const { access_token, user } = response.data
          
          localStorage.setItem('token', access_token)
          localStorage.setItem('user', JSON.stringify(user))
          
          set({
            user,
            token: access_token,
            isAuthenticated: true,
          })
          
          return { success: true, user }
        } catch (error) {
          console.error('Google login error:', error)
          return {
            success: false,
            error: error.response?.data?.detail || 'Google authentication failed',
          }
        }
      },
      
      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
      },
      
      checkAuth: async () => {
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        
        if (token && user) {
          set({
            token,
            user: JSON.parse(user),
            isAuthenticated: true,
          })
          return true
        }
        return false
      },
    }),
    {
      name: 'windops-auth',
    }
  )
)
