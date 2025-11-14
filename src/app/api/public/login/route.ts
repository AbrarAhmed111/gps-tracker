import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'
import { randomUUID } from 'crypto'

function getClientIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf
  return ''
}

export async function POST(request: Request) {
  let success = false
  try {
    const { password } = await request.json()
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 },
      )
    }
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('public_access')
      .select('password_hash')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    const hash = data?.password_hash as string | undefined
    if (!hash) {
      return NextResponse.json(
        { error: 'Access not configured' },
        { status: 400 },
      )
    }
    success = await bcrypt.compare(password, hash)
    // Log attempt with server IP and UA
    const ip = getClientIp(request)
    const ua = request.headers.get('user-agent') || ''
    await admin.from('public_login_logs').insert([
      {
        ip_address: ip || null,
        user_agent: ua || null,
        success,
      },
    ])
    if (!success) {
      return NextResponse.json(
        { granted: false, error: 'Incorrect password' },
        { status: 401 },
      )
    }
    // Read or create a session nonce so admins can force-logout public users
    const { data: nonceRow } = await admin
      .from('system_settings')
      .select('id, setting_value')
      .eq('setting_key', 'public_access_nonce')
      .maybeSingle()
    const nonce = nonceRow?.setting_value || randomUUID()
    if (!nonceRow) {
      await admin
        .from('system_settings')
        .upsert(
          [{ setting_key: 'public_access_nonce', setting_value: nonce }],
          { onConflict: 'setting_key' },
        )
    }
    const res = NextResponse.json({ granted: true })
    const maxAge = 60 * 60 * 8 // 8 hours
    res.cookies.set('public_access_granted', `1:${nonce}`, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: true,
      maxAge,
    })
    return res
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 },
    )
  }
}
