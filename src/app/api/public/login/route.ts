import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const res = NextResponse.json({ granted: true })
    const maxAge = 60 * 60 * 8 // 8 hours
    res.cookies.set('public_access_granted', '1', {
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
