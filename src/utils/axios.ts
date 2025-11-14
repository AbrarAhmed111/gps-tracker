import axios from 'axios'

// Prefer client-exposed var; fall back to server var if available at build time.
const backendBase =
  process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
  process.env.BACKEND_BASE_URL

export const axiosInstance = axios.create({
  baseURL: backendBase,
})
