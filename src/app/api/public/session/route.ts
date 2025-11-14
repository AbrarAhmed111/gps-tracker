import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const cookieStore = await cookies()
  const val = cookieStore.get('public_access_granted')?.value || ''
  let granted = false
  try {
    const [flag, nonceFromCookie] = val.split(':')
    if (flag === '1' && nonceFromCookie) {
      const admin = createAdminClient()
      const { data } = await admin
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'public_access_nonce')
        .maybeSingle()
      const currentNonce = (data?.setting_value as string) || ''
      granted = Boolean(currentNonce && nonceFromCookie === currentNonce)
    }
  } catch {
    granted = false
  }
  return NextResponse.json({ granted })
}
