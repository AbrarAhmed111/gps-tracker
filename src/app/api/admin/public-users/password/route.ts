import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

function getPasswordKey(): Buffer | null {
  const secret = process.env.PUBLIC_ACCESS_PASSWORD_KEY
  if (!secret) return null
  // Derive a 32-byte key from a passphrase-like secret.
  return crypto.createHash('sha256').update(secret).digest()
}

function encryptPassword(plain: string): string | null {
  const key = getPasswordKey()
  if (!key) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

function decryptPassword(payload: string): string | null {
  const key = getPasswordKey()
  if (!key) return null
  const parts = payload.split(':')
  if (parts.length !== 4) return null
  const [ver, ivB64, tagB64, dataB64] = parts
  if (ver !== 'v1') return null
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const data = Buffer.from(dataB64, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(data), decipher.final()])
  return plain.toString('utf8')
}

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

export async function GET() {
  const auth = await requireAdminUser()
  if (!auth.ok) return auth.res

  try {
    const admin = createAdminClient()

    const { data: pa } = await admin
      .from('public_access')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: encRow } = await admin
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'public_access_password_enc')
      .maybeSingle()

    const enc = (encRow?.setting_value as string) || ''
    const decrypted = enc ? decryptPassword(enc) : null

    return NextResponse.json({
      updatedAt: pa?.updated_at ?? null,
      password: decrypted,
      passwordKeyConfigured: Boolean(process.env.PUBLIC_ACCESS_PASSWORD_KEY),
    })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 },
    )
  }
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

    const enc = encryptPassword(password)
    if (enc) {
      await admin.from('system_settings').upsert(
        [
          {
            setting_key: 'public_access_password_enc',
            setting_value: enc,
            description:
              'Encrypted copy of the public access password (admin display only)',
            updated_at: nowIso,
            updated_by: auth.userId,
          },
        ],
        { onConflict: 'setting_key' },
      )
    }

    return NextResponse.json({
      ok: true,
      updatedAt: nowIso,
      passwordStoredForDisplay: Boolean(enc),
      passwordKeyConfigured: Boolean(process.env.PUBLIC_ACCESS_PASSWORD_KEY),
    })
  } catch (e: any) {
    // Keep an opaque message; avoid leaking env/crypto details.
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 },
    )
  }
}

