import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const granted = cookieStore.get('public_access_granted')?.value === '1'
  return NextResponse.json({ granted })
}
