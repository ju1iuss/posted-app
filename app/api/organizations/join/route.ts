import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { inviteCode } = await request.json()

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
    }

    // Find organization by invite code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, max_seats, subscription_status')
      .eq('invite_code', inviteCode)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if organization has an active subscription
    const hasActiveSubscription = org.subscription_status === 'active' || org.subscription_status === 'trialing'
    if (!hasActiveSubscription) {
      return NextResponse.json({ 
        error: 'This organization does not have an active subscription' 
      }, { status: 400 })
    }

    // Check current member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    const maxSeats = org.max_seats || 2
    if (memberCount && memberCount >= maxSeats) {
      return NextResponse.json({ 
        error: `This organization has reached its seat limit of ${maxSeats} members` 
      }, { status: 400 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', org.id)
      .eq('profile_id', user.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ 
        error: 'You are already a member of this organization' 
      }, { status: 400 })
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        profile_id: user.id,
        role: 'member'
      })

    if (memberError) {
      // Check if it's a seat limit error from the trigger
      if (memberError.message.includes('seat limit')) {
        return NextResponse.json({ 
          error: `This organization has reached its seat limit` 
        }, { status: 400 })
      }
      throw memberError
    }

    return NextResponse.json({ 
      success: true, 
      organizationName: org.name 
    })
  } catch (error: any) {
    console.error('Join org error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to join organization' },
      { status: 500 }
    )
  }
}
