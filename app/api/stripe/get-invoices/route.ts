import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organizations(stripe_customer_id)')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    const org = membership.organizations as any

    if (!org.stripe_customer_id) {
      return NextResponse.json({ invoices: [] })
    }

    // Fetch last 10 invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 10,
    })

    return NextResponse.json({
      invoices: invoices.data.map(inv => ({
        id: inv.id,
        number: inv.number,
        date: new Date(inv.created * 1000).toISOString(),
        amount: (inv.amount_paid / 100).toFixed(2) + (inv.currency === 'eur' ? '€' : inv.currency.toUpperCase()),
        status: inv.status,
        url: inv.invoice_pdf
      }))
    })
  } catch (error: any) {
    console.error('Invoices error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}
