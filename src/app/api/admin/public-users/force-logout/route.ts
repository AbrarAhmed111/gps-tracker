import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'
import { createServerClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: profile, error: profErr } = await admin
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
    if (profErr || !profile?.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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


