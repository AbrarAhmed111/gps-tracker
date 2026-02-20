import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

async function requireAdminUser(): Promise<
  | { ok: true; userId: string }
  | { ok: false; res: NextResponse }
> {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Ensure they are an admin (exists in admin_profiles)
  const admin = createAdminClient()
  const { data: profile, error: profErr } = await admin
    .from('admin_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profErr || !profile?.id) {
    return {
      ok: false,
      res: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, userId: user.id }
}

export async function POST(request: Request) {
  const auth = await requireAdminUser()
  if (!auth.ok) return auth.res

  try {
    const body = await request.json().catch(() => ({}))
    const password = body?.password
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      )
    }

    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    const nowIso = new Date().toISOString()

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('public_access')
      .select('id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await admin
        .from('public_access')
        .update({
          password_hash: hash,
          updated_at: nowIso,
          updated_by: auth.userId,
        })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    } else {
      const { error } = await admin.from('public_access').insert([
        {
          password_hash: hash,
          updated_at: nowIso,
          updated_by: auth.userId,
        },
      ])
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Invalidate all public sessions so the new password takes effect immediately.
    const newNonce = randomUUID()
    await admin.from('system_settings').upsert(
      [
        {
          setting_key: 'public_access_nonce',
          setting_value: newNonce,
          updated_at: nowIso,
          updated_by: auth.userId,
        },
      ],
      { onConflict: 'setting_key' },
    )

    return NextResponse.json({
      ok: true,
      updatedAt: nowIso,
    })
  } catch (e: any) {
    // Keep an opaque message; avoid leaking env/crypto details.
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 },
    )
  }
}

