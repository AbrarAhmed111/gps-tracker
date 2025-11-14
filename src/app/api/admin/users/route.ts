import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, full_name, username, is_active } = body || {}
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      )
    }
    const admin = createAdminClient()
    // Create user with confirmed email to avoid invite flow
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name ?? '',
        username: username ?? (email as string).split('@')[0],
      },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    const userId = data.user?.id
    if (userId && typeof is_active === 'boolean') {
      // Ensure profile reflects is_active state
      const { error: upErr } = await admin
        .from('admin_profiles')
        .update({ is_active })
        .eq('id', userId)
      if (upErr) {
        // Not fatal; report but still return 201
        return NextResponse.json(
          {
            userId,
            warning: `User created but profile update failed: ${upErr.message}`,
          },
          { status: 201 },
        )
      }
    }
    return NextResponse.json({ userId }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    // admin_profiles row will cascade delete if FK has ON DELETE CASCADE
    return new NextResponse(null, { status: 204 })
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Unexpected error' },
      { status: 500 },
    )
  }
}
