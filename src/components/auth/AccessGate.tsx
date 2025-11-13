'use client'

import { ReactNode } from 'react'

type AccessGateProps = {
  children: ReactNode
}

// UI-only phase: always allow access regardless of password
export default function AccessGate({ children }: AccessGateProps) {
  return <>{children}</>
}
