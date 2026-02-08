import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verify user is a member of this organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, organizations(*)')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 })
    }

    const org = membership.organizations as any

    // Check if org already has an active subscription
    if (org.subscription_status === 'active' || org.subscription_status === 'trialing') {
      return NextResponse.json({ error: 'Organization already has an active subscription' }, { status: 400 })
    }

    // Get or create Stripe customer
    let customerId = org.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          organization_id: organizationId,
          user_id: user.id,
        },
      })
      customerId = customer.id

      // Save customer ID to organization
      await supabase
        .from('organizations')
        .update({ stripe_customer_id: customerId })
        .eq('id', organizationId)
    }

    const origin = request.headers.get('origin') || 'http://localhost:3000'

    // Add 1 EUR trial fee as pending invoice item (will be charged on first invoice)
    await stripe.invoiceItems.create({
      customer: customerId,
      amount: 100, // 1 EUR in cents
      currency: 'eur',
      description: 'Trial activation fee',
    })

    // Create checkout session with 3-day trial
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 3,
        metadata: {
          organization_id: organizationId,
        },
      },
      success_url: `${origin}/success`,
      cancel_url: `${origin}/subscribe?canceled=true`,
      metadata: {
        organization_id: organizationId,
      },
      // Collect payment method upfront for trial
      payment_method_collection: 'always',
      // Enable coupon/promotion codes
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
