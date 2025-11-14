import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

export async function POST() {
  try {
    const admin = createAdminClient()
    const newNonce = randomUUID()
    const { error } = await admin
      .from('system_settings')
      .upsert(
        [{ setting_key: 'public_access_nonce', setting_value: newNonce }],
        { onConflict: 'setting_key' },
      )
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


